"""Freeze scope and reserve budget before placing durable branch tasks in the queue."""

import time
from datetime import UTC, datetime
from uuid import uuid4

from app.contracts import (
    Branch,
    BranchEstimate,
    BranchStatus,
    ContextManifest,
    ExperimentRun,
    Method,
    Mode,
    RunConfiguration,
    RunEstimate,
    RunMetrics,
    RunRequest,
)
from app.corpus import digest
from app.errors import ArchiveProblem
from app.live_repository import LiveRepository
from app.pipelines.context import full_context, resolve_scope
from app.pipelines.generation import (
    PRICING_VERSION,
    PROMPT_VERSION,
    SYSTEM,
    ProposedAnswer,
    embedding_reservation,
    maximum_generation_cost,
    prompt_for,
)
from app.settings import Settings


class LiveService:
    def __init__(self, repository: LiveRepository, settings: Settings, provider=None):
        self.repository, self.settings, self.provider = repository, settings, provider

    def estimate(self, request: RunRequest) -> RunEstimate:
        corpus = self.repository.corpus(request.corpus_id, request.corpus_version)
        books, chapters, label = resolve_scope(corpus, request)
        full_tokens = 0
        basis = "rag_budget_upper_bound"
        if request.mode != Mode.RAG:
            units = self.repository.units(request, chapters)
            blocks, _ = full_context(units)
            prompt = prompt_for(request.question, blocks)
            basis = "gemini_count_tokens" if self.provider else "utf8_byte_upper_bound"
            try:
                full_tokens = (
                    self.provider.count(prompt)
                    if self.provider
                    else len(
                        (prompt + SYSTEM + str(ProposedAnswer.model_json_schema())).encode("utf-8")
                    )
                )
            except Exception as error:
                raise ArchiveProblem(
                    "provider_unavailable", "Token preflight is unavailable.", 503
                ) from error
        methods = (
            [Method.RAG, Method.FULL_CONTEXT]
            if request.mode == Mode.COMPARE
            else [Method(request.mode.value)]
        )
        estimates = []
        for method in methods:
            tokens = full_tokens if method == Method.FULL_CONTEXT else 12000
            reason = None
            if method == Method.RAG and any(
                not chapter.indexed
                for book in corpus.books
                for chapter in book.chapters
                if chapter.id in chapters
            ):
                reason = "Selected chapters are not yet indexed for RAG."
            if method == Method.FULL_CONTEXT:
                if tokens + self.settings.output_limit + 4096 > 1_048_576:
                    reason = "The complete scope exceeds the model's context capacity."
                if self.settings.public_mode and (
                    len(chapters) > self.settings.public_chapter_limit
                    or tokens > self.settings.public_context_tokens
                ):
                    reason = (
                        "Public comparisons accept up to three chapters and 30,000 input tokens."
                    )
            cost = maximum_generation_cost(tokens, self.settings.output_limit)
            if method == Method.RAG:
                cost += embedding_reservation(request.question, query=True)
            estimates.append(
                BranchEstimate(
                    method=method,
                    eligible=reason is None,
                    input_tokens=tokens,
                    maximum_cost_usd=cost,
                    reason=reason,
                )
            )
        total = sum(branch.maximum_cost_usd for branch in estimates)
        limit = (
            self.settings.public_run_budget_usd
            if self.settings.public_mode
            else self.settings.local_run_budget_usd
        )
        if total > limit:
            for branch in estimates:
                branch.eligible = False
                branch.reason = (
                    "This inquiry exceeds the per-query cost limit. Select a smaller scope."
                )
        return RunEstimate(
            scope_label=label,
            book_ids=books,
            chapter_ids=chapters,
            token_count_basis=basis,
            branches=estimates,
            maximum_cost_usd=total,
            available_budget_usd=self.repository.available_budget(),
            live_available=self.settings.live_enabled and self.provider is not None,
        )

    def create(self, request: RunRequest, owner: str, ip_hash: str) -> ExperimentRun:
        if not self.settings.live_enabled or not self.provider:
            raise ArchiveProblem(
                "live_disabled",
                "Live inquiries are not enabled. Recorded examples remain available.",
                503,
            )
        preflight_started = time.monotonic()
        estimate = self.estimate(request)
        preflight_ms = int((time.monotonic() - preflight_started) * 1000)
        corpus = self.repository.corpus(request.corpus_id, request.corpus_version)
        source_count = sum(
            chapter.source_count
            for book in corpus.books
            for chapter in book.chapters
            if chapter.id in estimate.chapter_ids
        )
        invalid = next((branch for branch in estimate.branches if not branch.eligible), None)
        if invalid:
            raise ArchiveProblem("scope_ineligible", invalid.reason)
        run_id = str(uuid4())
        configuration = RunConfiguration(
            corpus_id=request.corpus_id,
            corpus_version=request.corpus_version,
            scope_label=estimate.scope_label,
            model=self.settings.model,
            prompt_version=PROMPT_VERSION,
            output_limit=self.settings.output_limit,
            book_ids=estimate.book_ids,
            chapter_ids=estimate.chapter_ids,
            pricing_version=PRICING_VERSION,
        )
        configuration.configuration_hash = digest(configuration.model_dump())
        run = ExperimentRun(
            id=run_id,
            question=request.question,
            mode=request.mode,
            data_mode="live",
            is_preview=False,
            created_at=datetime.now(UTC),
            status="running",
            configuration=configuration,
            branches=[
                Branch(
                    id=f"{run_id}:{item.method.value}",
                    method=item.method,
                    status=BranchStatus.QUEUED,
                    answer_title="An inquiry in progress",
                    introduction="",
                    claims=[],
                    conclusion="",
                    insufficient_evidence=False,
                    context=ContextManifest(
                        source_ids=[],
                        selected_source_count=source_count,
                        supplied_source_count=0,
                        strategy="retrieved_passages"
                        if item.method == Method.RAG
                        else "complete_scope",
                        is_simulated=False,
                    ),
                    metrics=RunMetrics(basis="unavailable"),
                )
                for item in estimate.branches
            ],
            sources=[],
        )
        # Freeze resolved chapter selection, even when the request originally selected only books.
        frozen = request.model_copy(
            update={"book_ids": estimate.book_ids, "chapter_ids": estimate.chapter_ids}
        )
        return self.repository.create_run(
            run,
            frozen,
            owner,
            ip_hash,
            {item.method.value: item.maximum_cost_usd for item in estimate.branches},
            preflight_ms=preflight_ms,
        )
