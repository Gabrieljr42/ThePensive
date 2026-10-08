"""Offline, edition-aware PDF extraction with reversible character locations."""

import hashlib
import re
from collections import defaultdict
from pathlib import Path

import tiktoken
from pypdf import PdfReader

from app.contracts import BookSummary, ChapterSummary, Corpus, SourcePassage
from app.corpus import Chunk, CorpusBundle, SourceRange, SourceUnit, digest

EXTRACTION_VERSION = "pypdf-pages-v2"


def normalize(raw: str) -> tuple[str, list[int]]:
    chars: list[str] = []
    offsets: list[int] = []
    for match in re.finditer(r"\S+|\s+", raw):
        if match.group().isspace():
            if chars and chars[-1] != " ":
                chars.append(" ")
                offsets.append(match.start())
        else:
            chars.extend(match.group())
            offsets.extend(range(match.start(), match.end()))
    if chars and chars[-1] == " ":
        chars.pop()
        offsets.pop()
    return "".join(chars), offsets


def compact_map(offsets: list[int]) -> list[list[int]]:
    segments: list[list[int]] = []
    for canonical, raw in enumerate(offsets):
        if segments and segments[-1][1] == canonical and segments[-1][3] == raw:
            segments[-1][1] += 1
            segments[-1][3] += 1
        else:
            segments.append([canonical, canonical + 1, raw, raw + 1])
    return segments


def canonical_page(raw: str, chapter_title: str | None = None):
    text, offsets = normalize(raw)
    repaired = False
    if chapter_title:
        title = re.escape(chapter_title).replace(r"\-", r"-\s*")
        # Calibre places the chapter's drop capital before its heading in reading order.
        pattern = rf"^(?:(?P<drop>[A-Za-z]) )?CHAPTER .+? {title} (?P<body>.+)$"
        match = re.match(pattern, text, re.IGNORECASE)
        if match:
            start = match.start("body")
            body, mapped = text[start:], offsets[start:]
            if match["drop"]:
                body = match["drop"] + body
                mapped = [offsets[match.start("drop")]] + mapped
                repaired = True
            text, offsets = body, mapped
    return text, compact_map(offsets), repaired


def inspect_pdf(path: Path) -> tuple[PdfReader, list[BookSummary]]:
    reader = PdfReader(path)
    if reader.is_encrypted:
        raise ValueError("The source PDF is encrypted.")
    books: list[BookSummary] = []
    current = None
    for item in reader.outline:
        if not isinstance(item, list):
            if item.title.startswith("Harry Potter and"):
                current = BookSummary(
                    id=f"vol-{len(books) + 1}",
                    ordinal=len(books) + 1,
                    title=item.title,
                    chapters=[],
                )
                books.append(current)
        elif current:
            destinations = [entry for entry in item if not isinstance(entry, list)]
            for position, entry in enumerate(destinations):
                match = re.match(r"Chapter (\d+) - (.+)", entry.title)
                if not match and entry.title != "Epilogue":
                    continue
                number = int(match[1]) if match else len(current.chapters) + 1
                start = reader.get_destination_page_number(entry) + 1
                following = destinations[position + 1 :]
                end = (
                    reader.get_destination_page_number(following[0])
                    if following
                    else len(reader.pages)
                )
                current.chapters.append(
                    ChapterSummary(
                        id=f"{current.id}-ch-{number}",
                        number=number,
                        title=match[2] if match else "Epilogue",
                        page_start=start,
                        page_end=end,
                    )
                )
    if not books or any(not book.chapters for book in books):
        raise ValueError("Validated book/chapter bookmarks are required for this PDF importer.")
    return reader, books


def chunk_units(units: list[SourceUnit], encoding=None) -> list[Chunk]:
    encoding = encoding or tiktoken.get_encoding("cl100k_base")
    chapters: dict[str, list[SourceUnit]] = defaultdict(list)
    for unit in units:
        chapters[unit.source.chapter_id].append(unit)
    chunks: list[Chunk] = []
    for chapter_id, chapter_units in chapters.items():
        text = ""
        ranges = []
        for unit in chapter_units:
            if text:
                text += "\n\n"
            start = len(text)
            text += unit.source.text
            ranges.append((start, len(text), unit))
        words = list(re.finditer(r"\S+", text))
        token_sizes = [len(encoding.encode(" " + word.group())) for word in words]
        position = 0
        while position < len(words):
            end = position
            size = 0
            while end < len(words) and (size + token_sizes[end] <= 600 or end == position):
                size += token_sizes[end]
                end += 1
            start_offset, end_offset = words[position].start(), words[end - 1].end()
            passage = text[start_offset:end_offset]
            spans = [
                SourceRange(
                    source_id=unit.source.id,
                    start=max(start_offset, begin) - begin,
                    end=min(end_offset, finish) - begin,
                )
                for begin, finish, unit in ranges
                if begin < end_offset and finish > start_offset
            ]
            first = chapter_units[0].source
            chunks.append(
                Chunk(
                    id=f"{first.corpus_version}:{chapter_id}:chunk-{len(chunks)}",
                    corpus_id=first.corpus_id,
                    corpus_version=first.corpus_version,
                    book_id=first.book_id,
                    chapter_id=chapter_id,
                    order=len(chunks),
                    text=passage,
                    estimated_tokens=len(encoding.encode(passage)),
                    spans=spans,
                )
            )
            if end == len(words):
                break
            overlap, next_position = 0, end
            while next_position > position + 1 and overlap < 80:
                next_position -= 1
                overlap += token_sizes[next_position]
            position = next_position
    return chunks


def extract_pdf(path: Path, chapter_ids: list[str] | None = None) -> CorpusBundle:
    reader, books = inspect_pdf(path)
    with path.open("rb") as file:
        file_hash = hashlib.file_digest(file, "sha256").hexdigest()
    available = {chapter.id for book in books for chapter in book.chapters}
    selected = set(chapter_ids or available)
    if not selected <= available:
        raise ValueError("The requested chapter does not exist in this PDF.")
    version = (
        "pdf-"
        + digest(
            [
                file_hash,
                EXTRACTION_VERSION,
                "chapter-600-overlap-80-v1",
                "gemini-embedding-2",
                768,
                sorted(selected),
            ]
        )[:16]
    )
    units: list[SourceUnit] = []
    empty_pages, short_pages, repaired_pages = [], [], []
    encoding = tiktoken.get_encoding("cl100k_base")
    for book in books:
        for chapter in book.chapters:
            if chapter.id not in selected:
                continue
            for page_number in range(chapter.page_start, chapter.page_end + 1):
                raw = reader.pages[page_number - 1].extract_text() or ""
                text, mapping, repaired = canonical_page(
                    raw,
                    chapter.title if page_number == chapter.page_start else None,
                )
                if repaired:
                    repaired_pages.append(page_number)
                if not text:
                    empty_pages.append(page_number)
                    continue
                if len(text) < 50:
                    short_pages.append(page_number)
                units.append(
                    SourceUnit(
                        source=SourcePassage(
                            id=f"{version}:page-{page_number}",
                            corpus_id="harry-potter-archive",
                            corpus_version=version,
                            book=book.title,
                            book_short=book.title,
                            edition="The Complete Collection · supplied English PDF",
                            chapter=chapter.title,
                            chapter_number=chapter.number,
                            page_label=str(page_number),
                            page_kind="pdf",
                            text=text,
                            attribution="J. K. Rowling · supplied PDF",
                            book_id=book.id,
                            chapter_id=chapter.id,
                            pdf_page_index=page_number - 1,
                        ),
                        order=len(units),
                        raw_text=raw,
                        location_map=mapping,
                        text_hash=hashlib.sha256(text.encode()).hexdigest(),
                    )
                )
                chapter.source_count += 1
                chapter.estimated_tokens += len(encoding.encode(text))
    if any(ch.source_count == 0 for book in books for ch in book.chapters if ch.id in selected):
        raise ValueError(
            "An included chapter contains no extractable text; inspect it before import."
        )
    chunks = chunk_units(units, encoding)
    for book in books:
        for chapter in book.chapters:
            chapter.chunk_count = sum(chunk.chapter_id == chapter.id for chunk in chunks)
    bundle = CorpusBundle(
        corpus=Corpus(
            id="harry-potter-archive",
            version=version,
            title="Harry Potter · supplied PDF",
            subtitle="Seven books with edition-specific evidence",
            edition="The Complete Collection · supplied English PDF",
            source_kind="ingested_edition",
            book_count=len(books),
            source_count=len(units),
            examples=[],
            books=books,
            extraction_version=EXTRACTION_VERSION,
            embedding_model="gemini-embedding-2",
            embedding_dimensions=768,
        ),
        file_hash=file_hash,
        extraction_version=EXTRACTION_VERSION,
        page_count=len(reader.pages),
        units=units,
        chunks=chunks,
        audit={
            "empty_pages": empty_pages,
            "short_pages": short_pages,
            "drop_capital_repairs": repaired_pages,
            "included_chapters": sorted(selected),
        },
    )
    validate_bundle(bundle)
    return bundle


def validate_bundle(bundle: CorpusBundle) -> dict:
    units = {unit.source.id: unit for unit in bundle.units}
    if len(units) != len(bundle.units):
        raise ValueError("Duplicate source identifiers.")
    covered: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for unit in bundle.units:
        text = unit.source.text
        if hashlib.sha256(text.encode()).hexdigest() != unit.text_hash:
            raise ValueError("Source text hash mismatch.")
        position = 0
        for begin, end, raw_begin, raw_end in unit.location_map:
            if begin != position or end > len(text) or raw_end > len(unit.raw_text):
                raise ValueError("Invalid canonical-to-original map.")
            canonical, original = text[begin:end], unit.raw_text[raw_begin:raw_end]
            if len(canonical) != len(original) or any(
                c != r and not (c == " " and r.isspace())
                for c, r in zip(canonical, original, strict=True)
            ):
                raise ValueError("The canonical text cannot be mapped to the extraction.")
            position = end
        if position != len(text):
            raise ValueError("Incomplete source map.")
    for chunk in bundle.chunks:
        reconstructed = []
        for span in chunk.spans:
            unit = units.get(span.source_id)
            if unit is None or not 0 <= span.start < span.end <= len(unit.source.text):
                raise ValueError("Invalid chunk source span.")
            if unit.source.chapter_id != chunk.chapter_id:
                raise ValueError("A chunk crosses chapter boundaries.")
            reconstructed.append(unit.source.text[span.start : span.end])
            covered[span.source_id].append((span.start, span.end))
        if "\n\n".join(reconstructed) != chunk.text:
            raise ValueError("Chunk text differs from its source spans.")
    for source_id, unit in units.items():
        end = 0
        for begin, finish in sorted(covered[source_id]):
            if unit.source.text[end:begin].strip():
                raise ValueError("Chunk coverage has a gap.")
            end = max(end, finish)
        if unit.source.text[end:].strip():
            raise ValueError("Chunk coverage is incomplete.")
    return {
        "sources": len(units),
        "chunks": len(bundle.chunks),
        "chapters": len({chunk.chapter_id for chunk in bundle.chunks}),
        "estimated_tokens": sum(
            ch.estimated_tokens for book in bundle.corpus.books for ch in book.chapters
        ),
        "valid": True,
    }
