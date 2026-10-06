"""Versioned wire models. Export OpenAPI to generate the frontend's types."""

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Method(StrEnum):
    RAG = "rag"
    FULL_CONTEXT = "full_context"


class Mode(StrEnum):
    RAG = "rag"
    FULL_CONTEXT = "full_context"
    COMPARE = "compare"


class BranchStatus(StrEnum):
    QUEUED = "queued"
    PREPARING = "preparing_context"
    GENERATING = "generating"
    VALIDATING = "validating"
    COMPLETE = "complete"
    CANCELLED = "cancelled"
    FAILED = "failed"


class ExampleQuestion(Contract):
    id: str
    label: str
    question: str


class Corpus(Contract):
    id: str
    version: str
    title: str
    subtitle: str
    edition: str
    source_kind: Literal["original_companion_notes", "original_fiction", "ingested_edition"]
    book_count: int
    source_count: int
    examples: list[ExampleQuestion]


class SourcePassage(Contract):
    id: str
    corpus_id: str
    corpus_version: str
    book: str
    book_short: str
    edition: str
    chapter: str
    chapter_number: int
    page_label: str
    page_kind: Literal["demo_folio", "printed", "pdf", "location"]
    text: str
    attribution: str


class Citation(Contract):
    id: str
    number: int
    source_id: str
    excerpt: str
    start_offset: int
    end_offset: int
    structural_status: Literal["verified", "pending", "invalid"]
    support_status: Literal["fixture_reviewed", "not_assessed", "supported", "unsupported"]


class Claim(Contract):
    id: str
    text: str
    citations: list[Citation]


class RunMetrics(Contract):
    basis: Literal["illustrative", "provider_reported", "unavailable"]
    latency_ms: int | None = None
    input_tokens: int | None = None
    output_tokens: int | None = None
    cached_input_tokens: int | None = None
    estimated_cost_usd: float | None = None
    pricing_label: str | None = None


class ContextManifest(Contract):
    source_ids: list[str]
    selected_source_count: int
    supplied_source_count: int
    strategy: Literal["retrieved_passages", "complete_scope"]
    is_simulated: bool


class Branch(Contract):
    id: str
    method: Method
    status: BranchStatus
    answer_title: str
    introduction: str
    claims: list[Claim]
    conclusion: str
    insufficient_evidence: bool
    context: ContextManifest
    metrics: RunMetrics
    error: str | None = None


class RunConfiguration(Contract):
    corpus_id: str
    corpus_version: str
    scope_label: str
    model: str
    prompt_version: str
    output_limit: int


class ExperimentRun(Contract):
    schema_version: Literal["1.0"] = "1.0"
    id: str
    question: str
    mode: Mode
    data_mode: Literal["mock", "live"]
    is_preview: bool
    created_at: datetime
    status: Literal["running", "complete", "cancelled", "failed"]
    configuration: RunConfiguration
    branches: list[Branch]
    sources: list[SourcePassage]


class RunRequest(Contract):
    question: str = Field(min_length=3, max_length=2000)
    mode: Mode = Mode.COMPARE
    corpus_id: str
    corpus_version: str

    @field_validator("question")
    @classmethod
    def clean_question(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("Enter a question with at least three characters.")
        return value


class ApiProblem(Contract):
    code: str
    message: str


class EvidenceResponse(Contract):
    schema_version: Literal["1.0"] = "1.0"
    run_id: str
    branch_id: str
    claim: Claim
    citation: Citation
    source: SourcePassage
