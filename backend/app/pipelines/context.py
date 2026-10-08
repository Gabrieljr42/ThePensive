"""Scope resolution, hybrid context selection, and exact span validation."""

from app.citations import resolve_citation
from app.contracts import Claim, Corpus, RetrievalCandidate, RetrievalTrace, RunRequest
from app.corpus import SourceRange, SourceUnit
from app.errors import ArchiveProblem
from app.pipelines.generation import ProposedAnswer


def resolve_scope(corpus: Corpus, request: RunRequest) -> tuple[list[str], list[str], str]:
    books = {book.id: book for book in corpus.books}
    book_ids = list(dict.fromkeys(request.book_ids or books.keys()))
    if not book_ids or any(identifier not in books for identifier in book_ids):
        raise ArchiveProblem("invalid_scope", "Select available books.")
    available = {
        chapter.id: chapter
        for identifier in book_ids
        for chapter in books[identifier].chapters
        if chapter.source_count
    }
    chapters = list(dict.fromkeys(request.chapter_ids or available.keys()))
    if not chapters or any(identifier not in available for identifier in chapters):
        raise ArchiveProblem("invalid_scope", "Select imported chapters within the selected books.")
    actual_books = [
        identifier
        for identifier in book_ids
        if any(ch.id in chapters for ch in books[identifier].chapters)
    ]
    label = f"{len(actual_books)} book(s) · {len(chapters)} chapter(s) · supplied English PDF"
    return actual_books, chapters, label


def full_context(units: list[SourceUnit]):
    spans = [
        SourceRange(source_id=unit.source.id, start=0, end=len(unit.source.text)) for unit in units
    ]
    return blocks_for_spans(units, spans), spans


def merge_ranges(spans: list[SourceRange]) -> list[SourceRange]:
    merged: list[SourceRange] = []
    for span in sorted(spans, key=lambda s: (s.source_id, s.start, s.end)):
        if merged and merged[-1].source_id == span.source_id and span.start <= merged[-1].end:
            merged[-1].end = max(merged[-1].end, span.end)
        else:
            merged.append(span.model_copy())
    return merged


def blocks_for_spans(units: list[SourceUnit], spans: list[SourceRange]) -> list[dict]:
    order = {unit.source.id: unit.order for unit in units}
    sources = {unit.source.id: unit.source for unit in units}
    return [
        {
            "source_id": span.source_id,
            "start_offset": span.start,
            "end_offset": span.end,
            "book": sources[span.source_id].book,
            "chapter": sources[span.source_id].chapter,
            "pdf_page": sources[span.source_id].page_label,
            "text": sources[span.source_id].text[span.start : span.end],
        }
        for span in sorted(merge_ranges(spans), key=lambda s: (order[s.source_id], s.start))
    ]


def rag_context(ranked, units: list[SourceUnit], embedding_model: str):
    selected, spans, tokens = [], [], 0
    for entry in ranked:
        chunk = entry["chunk"]
        if len(selected) >= 8:
            break
        if tokens + chunk.estimated_tokens > 6000:
            continue
        # Skip a candidate if all of its ranges are already covered by earlier candidates.
        if all(
            any(
                previous.source_id == span.source_id
                and previous.start <= span.start
                and previous.end >= span.end
                for previous in merge_ranges(spans)
            )
            for span in chunk.spans
        ):
            continue
        selected.append(chunk.id)
        spans.extend(chunk.spans)
        tokens += chunk.estimated_tokens
    sources = {unit.source.id: unit.source for unit in units}
    candidates = []
    for entry in ranked:
        chunk = entry["chunk"]
        source = sources[chunk.spans[0].source_id]
        candidates.append(
            RetrievalCandidate(
                chunkId=chunk.id,
                sourceId=source.id,
                volumeId=chunk.book_id,
                bookTitle=source.book,
                chapterTitle=source.chapter,
                chapterNumber=source.chapter_number,
                pageLabel=source.page_label,
                similarity=entry["similarity"],
                rerankScore=entry["fusion"],
                rank=selected.index(chunk.id) + 1 if chunk.id in selected else None,
                shelfCoords={"aisle": 0, "row": 0, "slot": int(chunk.book_id.split("-")[-1]) - 1},
                excerpt=chunk.text[:320],
            )
        )
    trace = RetrievalTrace(
        candidates=candidates,
        retrievedChunkIds=selected,
        reranker="Reciprocal rank fusion · no model reranker",
        embeddingModel=embedding_model,
        topK=len(selected),
    )
    return blocks_for_spans(units, spans), merge_ranges(spans), trace


def validate_answer(
    answer: ProposedAnswer, units: list[SourceUnit], spans: list[SourceRange], branch_id: str
) -> list[Claim]:
    if answer.insufficient_evidence:
        if answer.claims:
            raise ValueError("An insufficient-evidence answer must not include factual claims.")
        return []
    if not answer.claims:
        raise ValueError("A successful answer must contain cited claims.")
    sources = {unit.source.id: unit.source for unit in units}
    supplied = list({span.source_id for span in spans})
    claims, number = [], 0
    for claim_index, proposal in enumerate(answer.claims):
        citations = []
        for proposed in proposal.citations:
            source = sources.get(proposed.source_id)
            if source is None or source.id not in supplied:
                raise ValueError("The proposed source was not supplied to this method.")
            number += 1
            citation = resolve_citation(
                source,
                proposed.excerpt,
                f"{branch_id}:citation-{number}",
                number,
                supplied,
                start_offset=proposed.start_offset,
            )
            if not any(
                span.source_id == source.id
                and span.start <= citation.start_offset
                and citation.end_offset <= span.end
                for span in spans
            ):
                raise ValueError("The proposed quote is outside the supplied source range.")
            citation.support_status = "not_assessed"
            citations.append(citation)
        claims.append(
            Claim(
                id=f"{branch_id}:claim-{claim_index + 1}", text=proposal.text, citations=citations
            )
        )
    return claims
