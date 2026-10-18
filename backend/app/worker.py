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
    PROMPT_VERSION,
    REVIEW_INPUT_TOKEN_LIMIT,
    REVIEW_VERSION,
    GeminiProvider,
    ProposedAnswer,
    ProposedCitation,
    ProposedClaim,
    ProposedReview,
    embedding_reservation,
    generation_cost,
    maximum_generation_cost,
    prepare_review_prompt,
    pricing_version_for,
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
    embedding_started = False
    embedding_completed = False
    primary_receipt = None
    review_receipt = None
    active_call = None
    settled = False
    input_tokens = None
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
            embedding_started = True
            vector = provider.embed(request.question, query=True)
            embedding_completed = True
            embedding_cost = embedding_reservation(request.question, query=True)
            ranked = repository.retrieve(request, run.configuration.chapter_ids, vector)
            source_ids = list({span.source_id for entry in ranked for span in entry["chunk"].spans})
            units = repository.units(request, run.configuration.chapter_ids, source_ids)
            blocks, spans, branch.retrieval = rag_context(ranked, units, settings.embedding_model)
        else:
            units = repository.units(request, run.configuration.chapter_ids)
            blocks, spans = full_context(units)
        prompt = prompt_for(request.question, blocks)
        is_full = branch.method == Method.FULL_CONTEXT
        branch_model = (
            settings.full_context_model
            if is_full and getattr(settings, "full_context_model", None)
            else settings.model
        )
        try:
            input_tokens = provider.count(prompt, model=branch_model)
        except TypeError:
            input_tokens = provider.count(prompt)
        with repository.db.connection() as connection:
            reserved = (
                connection.execute(
                    "SELECT reserved_microusd FROM usage_ledger WHERE id=%s",
                    (task["id"],),
                ).fetchone()["reserved_microusd"]
                / 1_000_000
            )
        primary_max = maximum_generation_cost(input_tokens, settings.output_limit, branch_model)
        review_max = maximum_generation_cost(
            REVIEW_INPUT_TOKEN_LIMIT, settings.output_limit, settings.model
        )
        if primary_max + review_max + embedding_cost > reserved:
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
        active_call = "primary"
        generation_started = time.monotonic()
        try:
            primary_receipt = provider.generate(prompt, model=branch_model)
        except TypeError:
            primary_receipt = provider.generate(prompt)
        stages["generation"] = int((time.monotonic() - generation_started) * 1000)
        receipt_metadata = {
            "prompt_version": PROMPT_VERSION,
            "review_version": REVIEW_VERSION,
        }
        repository.save_receipt(
            task["id"], primary_receipt, stage="primary", metadata=receipt_metadata
        )
        branch.status = BranchStatus.VALIDATING
        if not repository.update_branch(task["id"], branch, elapsed=elapsed()):
            primary_cost = generation_cost(primary_receipt.usage, branch_model)
            repository.settle(
                task["id"],
                primary_cost + embedding_cost if primary_cost is not None else None,
                {
                    "status": "cancelled_after_primary",
                    "primary": primary_receipt.usage,
                    "query_embedding_estimate_usd": embedding_cost,
                },
            )
            settled = True
            return
        validation_started = time.monotonic()
        if primary_receipt.finish_reason != "STOP":
            raise ValueError("The provider did not complete a structured answer.")
        answer = ProposedAnswer.model_validate_json(primary_receipt.text)
        if any(
            citation.quote_id is None for claim in answer.claims for citation in claim.citations
        ):
            raise ValueError("Live answers must select an offered quotation identifier.")
        primary_claims = validate_answer(answer, units, spans, branch.id)
        if primary_claims:
            review_started = time.monotonic()
            review_prompt, allowed_by_claim = prepare_review_prompt(prompt, answer)
            review_tokens = provider.count_review(review_prompt)
            if review_tokens > REVIEW_INPUT_TOKEN_LIMIT:
                raise ValueError("The source review exceeds its reserved token limit.")
            primary_cost = generation_cost(primary_receipt.usage, branch_model)
            primary_guard = primary_cost if primary_cost is not None else primary_max
            if (
                primary_guard
                + maximum_generation_cost(review_tokens, settings.output_limit, settings.model)
                + embedding_cost
                > reserved
            ):
                raise ValueError("The source review exceeds its reserved context/cost limit.")
            if not repository.start_call(task["id"]):
                primary_cost = generation_cost(primary_receipt.usage, branch_model)
                repository.settle(
                    task["id"],
                    primary_cost + embedding_cost if primary_cost is not None else None,
                    {
                        "status": "cancelled_before_source_review",
                        "primary": primary_receipt.usage,
                        "query_embedding_estimate_usd": embedding_cost,
                    },
                )
                settled = True
                return
            active_call = "source_review"
            review_receipt = provider.review(review_prompt)
            stages["source_review"] = int((time.monotonic() - review_started) * 1000)
            repository.save_receipt(
                task["id"],
                review_receipt,
                stage="source_review",
                metadata=receipt_metadata,
            )
            if review_receipt.finish_reason != "STOP":
                raise ValueError("The source review did not complete a structured answer.")
            review_result = ProposedReview.model_validate_json(review_receipt.text)
            indexes = [item.claim_index for item in review_result.claim_reviews]
            if len(indexes) != len(set(indexes)) or set(indexes) != set(allowed_by_claim):
                raise ValueError("The source review omitted or duplicated a claim index.")
            proposals = []
            for item in sorted(review_result.claim_reviews, key=lambda result: result.claim_index):
                original_claim = answer.claims[item.claim_index]
                if item.action == "retain" and item.text != original_claim.text:
                    raise ValueError("A retained claim must preserve its proposed wording.")
                if item.action == "drop":
                    if item.text or item.citations:
                        raise ValueError("A dropped claim must not contain text or citations.")
                    continue
                if not item.text or not item.citations:
                    raise ValueError("A retained or revised claim requires text and citations.")
                if any(citation.quote_id not in allowed_by_claim[item.claim_index]
                       for citation in item.citations):
                    raise ValueError("The source review moved a quote outside its claim dossier.")
                proposals.append(ProposedClaim(
                    text=item.text,
                    citations=[ProposedCitation(quote_id=citation.quote_id)
                               for citation in item.citations],
                ))
            reviewed = ProposedAnswer(
                answer_title=review_result.answer_title,
                insufficient_evidence=not proposals,
                claims=proposals,
            )
            branch.claims = validate_answer(reviewed, units, spans, branch.id)
            # "supported" records the source-review model's assessment, not a human fact-check.
            for claim in branch.claims:
                for citation in claim.citations:
                    citation.support_status = "supported"
            answer = reviewed
        else:
            # A structurally valid abstention has no factual claim for the editor to assess.
            branch.claims = []

        costs = [
            generation_cost(
                receipt.usage, branch_model if receipt is primary_receipt else settings.model
            )
            for receipt in (primary_receipt, review_receipt)
            if receipt is not None
        ]
        total_cost = (
            sum(costs) + embedding_cost if all(cost is not None for cost in costs) else None
        )
        usage = {
            "primary": primary_receipt.usage,
            "source_review": review_receipt.usage if review_receipt is not None else {},
            "query_embedding_estimate_usd": embedding_cost,
        }
        repository.settle(task["id"], total_cost, usage)
        settled = True
        usage_items = [primary_receipt.usage] + (
            [review_receipt.usage] if review_receipt is not None else []
        )

        def sum_usage(key):
            values = [item.get(key) for item in usage_items]
            return (
                sum(int(value) for value in values)
                if all(value is not None for value in values)
                else None
            )

        branch.metrics = RunMetrics(
            basis="provider_reported" if total_cost is not None else "unavailable",
            latency_ms=latency(),
            input_tokens=sum_usage("prompt_token_count"),
            output_tokens=sum_usage("candidates_token_count"),
            cached_input_tokens=sum_usage("cached_content_token_count"),
            thinking_tokens=sum_usage("thoughts_token_count"),
            estimated_cost_usd=total_cost,
            pricing_label=pricing_version_for(branch_model),
            model_version=(review_receipt or primary_receipt).model_version,
            provider_request_id=(review_receipt or primary_receipt).request_id,
            stage_ms=stages,
            usage_status="reported" if total_cost is not None else "unknown",
        )
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
        completed = repository.update_branch(
            task["id"],
            branch,
            sources=[unit.source for unit in units if unit.source.id in cited],
            elapsed=elapsed(),
        )
        if not completed:
            return
        logger.info("branch_complete run=%s task=%s method=%s", run.id, task["id"], branch.method)
    except Exception as error:
        provider_code = getattr(error, "code", None) or getattr(
            getattr(error, "response", None), "status_code", None
        )
        logger.error(
            "branch_failed run=%s task=%s method=%s error_type=%s",
            run.id,
            task["id"],
            branch.method,
            type(error).__name__,
        )
        primary_cost = (
            generation_cost(primary_receipt.usage, branch_model)
            if primary_receipt
            else None
        )
        review_cost = (
            generation_cost(review_receipt.usage, settings.model)
            if review_receipt
            else None
        )
        if not settled and active_call == "source_review" and provider_code == 429:
            known_total = primary_cost + embedding_cost if primary_cost is not None else None
            repository.settle(
                task["id"],
                known_total,
                {
                    "status": "provider_rejected_http_429",
                    "http_code": 429,
                    "primary": primary_receipt.usage if primary_receipt else {},
                    "query_embedding_estimate_usd": embedding_cost,
                    "rejected_stage": "source_review",
                },
            )
            settled = True
        elif not settled and active_call == "source_review" and review_receipt is None:
            repository.settle(
                task["id"],
                None,
                {
                    "status": "provider_consumption_unknown",
                    "http_code": provider_code,
                    "error_type": type(error).__name__,
                    "uncertain_stage": "source_review",
                    "primary": primary_receipt.usage if primary_receipt else {},
                },
            )
            settled = True
        elif (
            not settled
            and active_call == "primary"
            and provider_code == 429
            and primary_receipt is None
        ):
            repository.settle(
                task["id"],
                embedding_cost,
                {
                    "status": "provider_rejected_http_429",
                    "http_code": 429,
                    "query_embedding_estimate_usd": embedding_cost,
                },
            )
            settled = True
        elif not settled and embedding_started and not embedding_completed:
            if provider_code == 429:
                repository.settle(
                    task["id"],
                    0,
                    {
                        "status": "provider_rejected_http_429",
                        "http_code": 429,
                        "rejected_stage": "query_embedding",
                    },
                )
            else:
                repository.settle(
                    task["id"],
                    None,
                    {
                        "status": "provider_consumption_unknown",
                        "http_code": provider_code,
                        "error_type": type(error).__name__,
                        "uncertain_stage": "query_embedding",
                    },
                )
            settled = True
        elif not settled and active_call is None and primary_receipt is None:
            repository.settle(
                task["id"],
                embedding_cost,
                {
                    "status": "no_generation_call",
                    "query_embedding_estimate_usd": embedding_cost,
                },
            )
            settled = True
        elif not settled and not paid_started:
            repository.settle(task["id"], 0, {"status": "no_provider_call"})
            settled = True
        elif not settled and active_call == "primary" and primary_receipt is None:
            # A timeout may still have incurred provider charges. Keep its reservation.
            repository.settle(
                task["id"],
                None,
                {
                    "status": "provider_consumption_unknown",
                    "http_code": provider_code,
                    "error_type": type(error).__name__,
                },
            )
            settled = True
        elif not settled:
            known_costs = [cost for cost in (primary_cost, review_cost) if cost is not None]
            complete_costs_known = primary_cost is not None and (
                review_receipt is None or review_cost is not None
            )
            repository.settle(
                task["id"],
                sum(known_costs) + embedding_cost if complete_costs_known else None,
                {
                    "status": "validation_failed_after_provider_call",
                    "primary": primary_receipt.usage if primary_receipt else {},
                    "source_review": review_receipt.usage if review_receipt else {},
                    "query_embedding_estimate_usd": embedding_cost,
                },
            )
            settled = True
        branch.status = BranchStatus.FAILED
        branch.claims = []
        branch.error_code = (
            "provider_quota_exceeded"
            if provider_code == 429
            else "provider_unavailable"
            if provider_code in (500, 502, 503, 504)
            else "generation_failed"
            if primary_receipt is None
            or (active_call == "source_review" and review_receipt is None)
            else "answer_validation_failed"
        )
        branch.error = (
            "Gemini's request or token quota was reached. Wait for the quota to reset "
            "or select a smaller scope."
            if provider_code == 429
            else "Gemini is temporarily unavailable. Please try again later."
            if provider_code in (500, 502, 503, 504)
            else "This method could not produce a validated answer. You can start a new inquiry."
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
