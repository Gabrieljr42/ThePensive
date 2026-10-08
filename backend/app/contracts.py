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


class ChapterSummary(Contract):
    id: str
    number: int
    title: str
    page_start: int
    page_end: int
    source_count: int = 0
    chunk_count: int = 0
    estimated_tokens: int = 0
    indexed: bool = False


class BookSummary(Contract):
    id: str
    ordinal: int
    title: str
    chapters: list[ChapterSummary]


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
    books: list[BookSummary] = Field(default_factory=list)
    language: str = "en"
    indexed: bool = False
    extraction_version: str | None = None
    embedding_model: str | None = None
    embedding_dimensions: int | None = None


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
    book_id: str | None = None
    chapter_id: str | None = None
    pdf_page_index: int | None = None


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
    thinking_tokens: int | None = None
    model_version: str | None = None
    provider_request_id: str | None = None
    stage_ms: dict[str, int] = Field(default_factory=dict)
    usage_status: Literal["reported", "estimated", "unknown"] = "unknown"


class ContextManifest(Contract):
    source_ids: list[str]
    selected_source_count: int
    supplied_source_count: int
    strategy: Literal["retrieved_passages", "complete_scope"]
    is_simulated: bool
    input_tokens: int | None = None
    token_count_basis: str | None = None
    manifest_hash: str | None = None


class RetrievalCandidate(Contract):
    chunkId: str
    sourceId: str
    volumeId: str
    bookTitle: str
    chapterTitle: str
    chapterNumber: int
    pageLabel: str
    similarity: float | None = None
    rerankScore: float | None = None
    rank: int | None = None
    shelfCoords: dict[str, int]
    excerpt: str


class RetrievalTrace(Contract):
    candidates: list[RetrievalCandidate]
    retrievedChunkIds: list[str]
    reranker: str
    embeddingModel: str
    topK: int


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
    error_code: str | None = None
    retrieval: RetrievalTrace | None = None


class RunConfiguration(Contract):
    corpus_id: str
    corpus_version: str
    scope_label: str
    model: str
    prompt_version: str
    output_limit: int
    book_ids: list[str] = Field(default_factory=list)
    chapter_ids: list[str] = Field(default_factory=list)
    configuration_hash: str | None = None
    pricing_version: str | None = None


class ExperimentRun(Contract):
    schema_version: Literal["1.0", "2.0"] = "2.0"
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
    book_ids: list[str] = Field(default_factory=list, max_length=7)
    chapter_ids: list[str] = Field(default_factory=list, max_length=199)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=100)

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
    schema_version: Literal["1.0", "2.0"] = "2.0"
    run_id: str
    branch_id: str
    claim: Claim
    citation: Citation
    source: SourcePassage


class BranchEstimate(Contract):
    method: Method
    eligible: bool
    input_tokens: int
    maximum_cost_usd: float
    reason: str | None = None


class RunEstimate(Contract):
    schema_version: Literal["2.0"] = "2.0"
    scope_label: str
    book_ids: list[str]
    chapter_ids: list[str]
    token_count_basis: str
    branches: list[BranchEstimate]
    maximum_cost_usd: float
    available_budget_usd: float
    live_available: bool
