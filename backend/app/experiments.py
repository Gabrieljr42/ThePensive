from datetime import UTC, datetime
from uuid import uuid4

from app.contracts import (
    BranchStatus,
    ExperimentRun,
    Method,
    Mode,
    RunConfiguration,
    RunMetrics,
    RunRequest,
)
from app.demo.catalog import corpus_sources, get_corpus
from app.demo.scenarios import make_branch
from app.repository import RunRepository


class ExperimentService:
    def __init__(self, repository: RunRepository) -> None:
        self.repository = repository

    def create(self, request: RunRequest, preview: bool = False) -> ExperimentRun:
        corpus = get_corpus(request.corpus_id)
        if corpus is None:
            raise ValueError("The selected collection is not available.")
        valid_versions = {corpus.version}
        if corpus.id == "harry-potter-archive":
            valid_versions.update({"vol-1-ps", "vol-3-poa", "1997-2007-chronicles"})
        if request.corpus_version not in valid_versions:
            raise ValueError("The collection version has changed. Select the collection again.")
        run_id = str(uuid4())
        methods = (
            [Method.RAG, Method.FULL_CONTEXT]
            if request.mode == Mode.COMPARE
            else [Method(request.mode.value)]
        )
        run = ExperimentRun(
            schema_version="1.0",
            id=run_id,
            question=request.question,
            mode=request.mode,
            data_mode="mock",
            is_preview=preview,
            created_at=datetime.now(UTC),
            status="complete" if preview else "running",
            configuration=RunConfiguration(
                corpus_id=corpus.id,
                corpus_version=request.corpus_version,
                scope_label=f"All {corpus.source_count} companion passages"
                if corpus.id == "wizarding-notes"
                else f"All {corpus.source_count} original passages",
                model="Prepared demonstration",
                prompt_version="demo-v1",
                output_limit=512,
            ),
            branches=[
                make_branch(corpus.id, request.question, method, run_id) for method in methods
            ],
            sources=corpus_sources(corpus.id),
        )
        self.repository.save(run)
        return self.view(run_id) or run

    def view(self, run_id: str) -> ExperimentRun | None:
        run = self.repository.get(run_id)
        if run is None or run.is_preview or run.status in ("complete", "cancelled"):
            return run
        elapsed = (datetime.now(UTC) - run.created_at).total_seconds()
        for branch in run.branches:
            complete_at = 1.45 if branch.method == Method.RAG else 2.8
            if elapsed >= complete_at:
                branch.status = BranchStatus.COMPLETE
                continue
            branch.status = (
                BranchStatus.QUEUED
                if elapsed < 0.2
                else BranchStatus.PREPARING
                if elapsed < 0.65
                else BranchStatus.GENERATING
                if elapsed < complete_at - 0.3
                else BranchStatus.VALIDATING
            )
            branch.claims = []
            branch.introduction = ""
            branch.conclusion = ""
            branch.metrics = RunMetrics(basis="illustrative")
        run.status = (
            "complete"
            if all(branch.status == BranchStatus.COMPLETE for branch in run.branches)
            else "running"
        )
        if run.status == "complete":
            self.repository.save(run)
        return run

    def cancel(self, run_id: str) -> ExperimentRun | None:
        run = self.view(run_id)
        if run is None or run.status != "running":
            return run
        run.status = "cancelled"
        for branch in run.branches:
            if branch.status != BranchStatus.COMPLETE:
                branch.status = BranchStatus.CANCELLED
                branch.claims = []
                branch.introduction = ""
                branch.conclusion = ""
                branch.metrics = RunMetrics(basis="unavailable")
        self.repository.save(run)
        return run
