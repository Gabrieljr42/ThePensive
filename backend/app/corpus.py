"""Private corpus records, separate from the public presentation contract."""

import hashlib
import json

from pydantic import Field

from app.contracts import Contract, Corpus, SourcePassage


class SourceUnit(Contract):
    source: SourcePassage
    order: int
    raw_text: str
    # canonical start/end, raw start/end. Equal-length segments map character-for-character.
    location_map: list[list[int]]
    text_hash: str


class SourceRange(Contract):
    source_id: str
    start: int
    end: int


class Chunk(Contract):
    id: str
    corpus_id: str
    corpus_version: str
    book_id: str
    chapter_id: str
    order: int
    text: str
    estimated_tokens: int
    spans: list[SourceRange]
    embedding: list[float] | None = None


class CorpusBundle(Contract):
    schema_version: str = "2.0"
    corpus: Corpus
    file_hash: str
    page_count: int
    extraction_version: str = "pypdf-pages-v1"
    chunking_version: str = "chapter-600-overlap-80-v1"
    token_count_basis: str = "cl100k_base_estimate"
    units: list[SourceUnit]
    chunks: list[Chunk]
    audit: dict = Field(default_factory=dict)


def digest(value: object) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode("utf-8")
    ).hexdigest()
