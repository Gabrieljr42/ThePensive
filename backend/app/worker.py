"""Two globally leased branches, durable context, and independent completion."""

import logging
import signal
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from app.contracts import BranchStatus, ExperimentRun, Method, RunMetrics, RunRequest
from app.corpus import digest
from app.db import Database
from app.live_repository import LiveRepository
from app.pipelines.context import full_context, rag_context, validate_answer
from app.pipelines.generation import (
    PRICING_VERSION,
    GeminiProvider,
    ProposedAnswer,
    embedding_reservation,
    generation_cost,
    maximum_generation_cost,
    prompt_for,
)
from app.settings import Settings

logger = logging.getLogger("pensieve.worker")


def process_task(repository: LiveRepository, settings: Settings, provider, task: dict):
    started = time.monotonic()
    run = ExperimentRun.model_validate(task["payload"])
    request = RunRequest.model_validate(task["request"])
    branch = next(item for item in run.branches if item.id == task["branch_id"])
    units = []
    paid_started = False
    embedding_cost = 0.0
    receipt = None
    stages = {
        "shared_preflight": int(task.get("preflight_ms", 0)),
        "queue_wait_estimate": int(task.get("queue_wait_ms", 0)),
    }

    def elapsed():
        return int((time.monotonic() - started) * 1000)

    def latency():
        return stages["shared_preflight"] + stages["queue_wait_estimate"] + elapsed()

    try:
        branch.status = BranchStatus.PREPARING
        if not repository.update_branch(task["id"], branch, elapsed=elapsed()):
            return
        if branch.method == Method.RAG:
            if not repository.start_call(task["id"]):
                return
            paid_started = True
            vector = provider.embed(request.question, query=True)
            embedding_cost = embedding_reservation(request.question, query=True)
            ranked = repository.retrieve(request, run.configuration.chapter_ids, vector)
            source_ids = list({span.source_id for entry in ranked for span in entry["chunk"].spans})
            units = repository.units(request, run.configuration.chapter_ids, source_ids)
            blocks, spans, branch.retrieval = rag_context(ranked, units, settings.embedding_model)
        else:
            units = repository.units(request, run.configuration.chapter_ids)
            blocks, spans = full_context(units)
        prompt = prompt_for(request.question, blocks)
        input_tokens = provider.count(prompt)
        with repository.db.connection() as connection:
            reserved = (
                connection.execute(
                    "SELECT reserved_microusd FROM usage_ledger WHERE id=%s",
                    (task["id"],),
                ).fetchone()["reserved_microusd"]
                / 1_000_000
            )
        if maximum_generation_cost(input_tokens, settings.output_limit) + embedding_cost > reserved:
            raise ValueError("The assembled request exceeds its reserved context/cost limit.")
        supplied = list(dict.fromkeys(block["source_id"] for block in blocks))
        branch.context.source_ids = supplied
        branch.context.supplied_source_count = len(supplied)
        branch.context.input_tokens = input_tokens
        branch.context.token_count_basis = "gemini_count_tokens"
        branch.context.manifest_hash = digest(blocks)
        stages["context_preparation"] = elapsed()
        branch.status = BranchStatus.GENERATING
        context = {
            "blocks": blocks,
            "spans": [span.model_dump() for span in spans],
            "prompt_version": run.configuration.prompt_version,
            "configuration_hash": run.configuration.configuration_hash,
        }
        if not repository.update_branch(task["id"], branch, elapsed=elapsed(), context=context):
            if paid_started:
                repository.settle(task["id"], embedding_cost, {"query_embedding": "estimated"})
            return
        if not repository.start_call(task["id"]):
            return
        paid_started = True
        generation_started = time.monotonic()
        receipt = provider.generate(prompt)
        stages["generation"] = int((time.monotonic() - generation_started) * 1000)
        cost = generation_cost(receipt.usage)
        repository.settle(
            task["id"],
            cost + embedding_cost if cost is not None else None,
            {**receipt.usage, "query_embedding_estimate_usd": embedding_cost},
        )
        repository.save_receipt(task["id"], receipt)
        branch.metrics = RunMetrics(
            basis="provider_reported" if receipt.usage else "unavailable",
            latency_ms=latency(),
            input_tokens=receipt.usage.get("prompt_token_count"),
            output_tokens=receipt.usage.get("candidates_token_count"),
            cached_input_tokens=receipt.usage.get("cached_content_token_count"),
            thinking_tokens=receipt.usage.get("thoughts_token_count"),
            estimated_cost_usd=cost + embedding_cost if cost is not None else None,
            pricing_label=PRICING_VERSION,
            model_version=receipt.model_version,
            provider_request_id=receipt.request_id,
            stage_ms=stages,
            usage_status="reported" if cost is not None else "unknown",
        )
        branch.status = BranchStatus.VALIDATING
        if not repository.update_branch(task["id"], branch, elapsed=elapsed()):
            return
        validation_started = time.monotonic()
        if receipt.finish_reason != "STOP":
            raise ValueError("The provider did not complete a structured answer.")
        answer = ProposedAnswer.model_validate_json(receipt.text)
        branch.claims = validate_answer(answer, units, spans, branch.id)
        branch.answer_title = answer.answer_title
        branch.insufficient_evidence = answer.insufficient_evidence
        branch.introduction = (
            "The selected sources do not provide enough evidence to answer this question."
            if answer.insufficient_evidence
            else ""
        )
        stages["citation_validation"] = int((time.monotonic() - validation_started) * 1000)
        branch.metrics.stage_ms = stages
        branch.metrics.latency_ms = latency()
        branch.status = BranchStatus.COMPLETE
        cited = {citation.source_id for claim in branch.claims for citation in claim.citations}
        repository.update_branch(
            task["id"],
            branch,
            sources=[unit.source for unit in units if unit.source.id in cited],
            elapsed=elapsed(),
        )
        logger.info("branch_complete run=%s task=%s method=%s", run.id, task["id"], branch.method)
    except Exception as error:
        logger.error(
            "branch_failed run=%s task=%s method=%s error_type=%s",
            run.id,
            task["id"],
            branch.method,
            type(error).__name__,
        )
        if not paid_started:
            repository.settle(task["id"], 0, {"status": "no_provider_call"})
        elif receipt is None:
            # A timeout may still have incurred provider charges. Keep its reservation.
            repository.settle(task["id"], None, {"status": "provider_consumption_unknown"})
        branch.status = BranchStatus.FAILED
        branch.claims = []
        branch.error_code = "generation_failed" if receipt is None else "answer_validation_failed"
        branch.error = (
            "This method could not produce a validated answer. You can start a new inquiry."
        )
        repository.update_branch(task["id"], branch, elapsed=elapsed())


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = Settings.from_env()
    settings.validate()
    if not settings.database_url:
        raise RuntimeError("The worker requires DATABASE_URL.")
    database = Database(settings.database_url)
    repository = LiveRepository(database, settings)
    provider = GeminiProvider(settings) if settings.live_enabled else None
    worker_id = str(uuid4())
    stop = threading.Event()
    signal.signal(signal.SIGTERM, lambda *_: stop.set())
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    futures = {}
    with ThreadPoolExecutor(max_workers=2) as executor:
        while not stop.is_set():
            for future in list(futures):
                if future.done():
                    if future.exception():
                        logger.error("task_persistence_failed task=%s", futures[future])
                    del futures[future]
            repository.heartbeat(worker_id, list(futures.values()))
            repository.recover_expired()
            if provider and len(futures) < 2:
                task = repository.claim_task(worker_id)
                if task:
                    future = executor.submit(process_task, repository, settings, provider, task)
                    futures[future] = task["id"]
            stop.wait(1)
    if provider:
        provider.close()
    database.close()


if __name__ == "__main__":
    main()
