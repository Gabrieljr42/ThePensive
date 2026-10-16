"""Administrative commands run outside public request handlers."""

import argparse
import json
import shutil
import time
from pathlib import Path

from app.corpus import CorpusBundle
from app.db import Database
from app.live_repository import LiveRepository
from app.pipelines.generation import GeminiProvider, embedding_reservation
from app.pipelines.ingestion import extract_pdf, inspect_pdf, validate_bundle
from app.settings import Settings


def _is_explicit_http_429(error: Exception) -> bool:
    """Recognize a received 429 response; transport failures remain uncertain."""
    response = getattr(error, "response", None)
    return getattr(error, "code", None) == 429 or getattr(response, "status_code", None) == 429


def _settle_no_call(repository, reservations):
    for ledger_id, _ in reservations:
        repository.settle(ledger_id, 0, {"status": "no_provider_call"})


def _settle_provider_failure(repository, reservations, error):
    if _is_explicit_http_429(error):
        for ledger_id, _ in reservations:
            repository.settle(ledger_id, 0, {"status": "provider_rejected_http_429"})
        return
    for ledger_id, _ in reservations:
        repository.settle(ledger_id, None, {"status": "embedding_consumption_unknown"})


def index_corpus(
    repository, settings, corpus_id, version, budget=1.0, provider=None, chapters=None,
    batch_size=1, pause_seconds=0,
):
    if not settings.live_enabled or not settings.gemini_api_key:
        raise ValueError("Enable live mode and configure GEMINI_API_KEY before indexing.")
    corpus = repository.corpus(corpus_id, version)
    if corpus.embedding_model != settings.embedding_model or corpus.embedding_dimensions != 768:
        raise ValueError("The embedding configuration does not match the frozen corpus version.")
    chunks = repository.chunks(corpus_id, version, missing_only=True)
    if chapters:
        available = {
            chapter.id for book in corpus.books for chapter in book.chapters if chapter.source_count
        }
        if not set(chapters) <= available:
            raise ValueError("Select imported chapters to index.")
        chunks = [chunk for chunk in chunks if chunk.chapter_id in chapters]
    expected = sum(embedding_reservation(chunk.text, chunk.chapter_id) for chunk in chunks)
    if expected > budget:
        raise ValueError(
            f"Indexing reservation ${expected:.4f} exceeds this command's ${budget:.2f} limit."
        )
    own_provider = provider is None
    provider = provider or GeminiProvider(settings)
    try:
        if not 1 <= batch_size <= 16 or pause_seconds < 0:
            raise ValueError("Use a batch size from one to sixteen and a nonnegative pause.")
        if batch_size > 1:
            for begin in range(0, len(chunks), batch_size):
                batch = chunks[begin:begin + batch_size]
                reservations = []
                try:
                    for chunk in batch:
                        reserved = embedding_reservation(chunk.text, chunk.chapter_id)
                        ledger_id = repository.reserve_operation(
                            "document_embedding", reserved,
                            f"embedding:{settings.embedding_model}:{chunk.id}",
                        )
                        reservations.append((ledger_id, reserved))
                except Exception:
                    # The batch has not reached the provider. Release every earlier
                    # reservation so a budget rejection cannot strand funds.
                    _settle_no_call(repository, reservations)
                    raise
                try:
                    vectors = provider.embed_documents([(c.text, c.chapter_id) for c in batch])
                except Exception as error:
                    _settle_provider_failure(repository, reservations, error)
                    raise
                try:
                    for chunk, vector, (ledger_id, reserved) in zip(
                        batch, vectors, reservations, strict=True
                    ):
                        repository.save_embedding(chunk, vector)
                        repository.settle(ledger_id, reserved, {
                            "basis": "utf8_byte_upper_bound", "model": settings.embedding_model,
                            "chunk_id": chunk.id, "dimensions": len(vector),
                        })
                except Exception:
                    for ledger_id, _ in reservations:
                        repository.settle(
                            ledger_id, None, {"status": "embedding_consumption_unknown"}
                        )
                    raise
                repository.publish_index(corpus_id, version)
                print(json.dumps({"indexed": min(begin + batch_size, len(chunks)),
                                  "total": len(chunks)}), flush=True)
                if pause_seconds and begin + batch_size < len(chunks):
                    time.sleep(pause_seconds)
            return {"indexed_chunks": len(chunks), "reservation_usd": expected}
        for index, chunk in enumerate(chunks, 1):
            reserved = embedding_reservation(chunk.text, chunk.chapter_id)
            ledger_id = repository.reserve_operation(
                "document_embedding",
                reserved,
                f"embedding:{settings.embedding_model}:{chunk.id}",
            )
            try:
                vector = provider.embed(chunk.text, title=chunk.chapter_id)
            except Exception as error:
                _settle_provider_failure(repository, [(ledger_id, reserved)], error)
                raise
            try:
                repository.save_embedding(chunk, vector)
                repository.settle(
                    ledger_id,
                    reserved,
                    {
                        "basis": "utf8_byte_upper_bound",
                        "model": settings.embedding_model,
                        "chunk_id": chunk.id,
                        "dimensions": len(vector),
                    },
                )
            except Exception:
                repository.settle(ledger_id, None, {"status": "embedding_consumption_unknown"})
                raise
            if index % 50 == 0 or index == len(chunks):
                print(json.dumps({"indexed": index, "total": len(chunks)}), flush=True)
        repository.publish_index(corpus_id, version)
    finally:
        if own_provider:
            provider.close()
    return {"indexed_chunks": len(chunks), "reservation_usd": expected}


def main():
    parser = argparse.ArgumentParser(description="Pensieve private corpus administration")
    commands = parser.add_subparsers(dest="command", required=True)
    inspect = commands.add_parser("inspect")
    inspect.add_argument("pdf", type=Path)
    extract = commands.add_parser("extract")
    extract.add_argument("pdf", type=Path)
    extract.add_argument("--chapters", nargs="+")
    extract.add_argument("--output", type=Path)
    for name in ("validate", "import"):
        command = commands.add_parser(name)
        command.add_argument("bundle", type=Path)
    index = commands.add_parser("index")
    index.add_argument("corpus_id")
    index.add_argument("version")
    index.add_argument("--budget", type=float, default=1.0)
    index.add_argument("--chapters", nargs="+")
    index.add_argument("--batch-size", type=int, default=1)
    index.add_argument("--pause-seconds", type=float, default=0)
    export = commands.add_parser("export")
    export.add_argument("corpus_id")
    export.add_argument("version")
    export.add_argument("--output", type=Path, required=True)
    commands.add_parser("catalog")
    args = parser.parse_args()
    settings = Settings.from_env()
    settings.private_dir.mkdir(parents=True, exist_ok=True)
    if args.command == "inspect":
        reader, books = inspect_pdf(args.pdf)
        print(
            json.dumps(
                {"pages": len(reader.pages), "books": [book.model_dump() for book in books]},
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    if args.command == "extract":
        bundle = extract_pdf(args.pdf, args.chapters)
        output = args.output or settings.private_dir / f"{bundle.corpus.version}.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(bundle.model_dump_json(), encoding="utf-8")
        private_pdf = settings.private_dir / f"{bundle.file_hash}.pdf"
        if not private_pdf.exists():
            shutil.copyfile(args.pdf, private_pdf)
        print(
            json.dumps(
                {
                    **validate_bundle(bundle),
                    "version": bundle.corpus.version,
                    "output": str(output),
                    "audit": bundle.audit,
                }
            )
        )
        return
    if args.command == "validate":
        bundle = CorpusBundle.model_validate_json(args.bundle.read_text(encoding="utf-8"))
        print(json.dumps(validate_bundle(bundle)))
        return
    if not settings.database_url:
        parser.error("DATABASE_URL is required.")
    database = Database(settings.database_url)
    repository = LiveRepository(database, settings)
    try:
        if args.command == "import":
            bundle = CorpusBundle.model_validate_json(args.bundle.read_text(encoding="utf-8"))
            repository.import_bundle(bundle)
            print(json.dumps({"version": bundle.corpus.version, **validate_bundle(bundle)}))
        elif args.command == "index":
            print(
                json.dumps(
                    index_corpus(
                        repository,
                        settings,
                        args.corpus_id,
                        args.version,
                        args.budget,
                        chapters=args.chapters,
                        batch_size=args.batch_size,
                        pause_seconds=args.pause_seconds,
                    )
                )
            )
        elif args.command == "export":
            bundle = repository.export_bundle(args.corpus_id, args.version)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(bundle.model_dump_json(), encoding="utf-8")
            print(json.dumps({"output": str(args.output), **validate_bundle(bundle)}))
        else:
            print(json.dumps([corpus.model_dump() for corpus in repository.corpora()], indent=2))
    finally:
        database.close()


if __name__ == "__main__":
    main()
