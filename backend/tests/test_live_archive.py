"""Real PostgreSQL tests with original text and a deterministic provider double."""

import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from pathlib import Path
from uuid import uuid4

import httpx
import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from app.contracts import BookSummary, ChapterSummary, Corpus, RunRequest, SourcePassage
from app.corpus import CorpusBundle, SourceRange, SourceUnit
from app.db import Database
from app.errors import ArchiveProblem
from app.live_repository import LiveRepository
from app.live_service import LiveService
from app.main import create_app
from app.pipelines.context import validate_answer
from app.pipelines.generation import (
    GeminiProvider,
    GenerationReceipt,
    ProposedAnswer,
    generation_cost,
)
from app.pipelines.ingestion import canonical_page, chunk_units, validate_bundle
from app.repository import MemoryRunRepository
from app.settings import Settings
from app.worker import process_task


def original_bundle():
    units = []
    texts = [
        "Mara keeps the archive's blue lantern. It turns blue when the observatory opens. "
        "The keeper records every visitor in a copper ledger.",
        "The observatory opens at midnight. Mara promised to guide lost readers home. "
        "The copper ledger contains dates, names, and a small drawing of each visitor.",
    ]
    chapters = []
    for index, text in enumerate(texts, 1):
        chapter_id = f"vol-1-ch-{index}"
        chapters.append(
            ChapterSummary(
                id=chapter_id,
                number=index,
                title=f"Chapter {index}",
                page_start=index,
                page_end=index,
                source_count=1,
                estimated_tokens=40,
                chunk_count=1,
                indexed=True,
            )
        )
        units.append(
            SourceUnit(
                source=SourcePassage(
                    id=f"pdf-original-fixture:page-{index}",
                    corpus_id="harry-potter-archive",
                    corpus_version="pdf-original-fixture",
                    book="The Lantern Ledger",
                    book_short="Ledger",
                    edition="Original test edition",
                    chapter=f"Chapter {index}",
                    chapter_number=index,
                    page_label=str(index),
                    page_kind="pdf",
                    text=text,
                    attribution="Pensieve original fixture",
                    book_id="vol-1",
                    chapter_id=chapter_id,
                    pdf_page_index=index - 1,
                ),
                order=index,
                raw_text=text,
                location_map=[[0, len(text), 0, len(text)]],
                text_hash=hashlib.sha256(text.encode()).hexdigest(),
            )
        )
    chunks = chunk_units(units)
    for chunk in chunks:
        chunk.embedding = [1.0] + [0.0] * 767
    return CorpusBundle(
        corpus=Corpus(
            id="harry-potter-archive",
            version="pdf-original-fixture",
            title="The Lantern Ledger",
            subtitle="Original test text",
            edition="Original test edition",
            source_kind="original_fiction",
            book_count=1,
            source_count=2,
            examples=[],
            indexed=True,
            embedding_model="gemini-embedding-2",
            embedding_dimensions=768,
            books=[
                BookSummary(id="vol-1", ordinal=1, title="The Lantern Ledger", chapters=chapters)
            ],
        ),
        file_hash="fixture-hash",
        page_count=2,
        units=units,
        chunks=chunks,
    )


class FixtureProvider:
    calls = 0

    def count(self, prompt):
        return max(100, len(prompt.encode()) // 4 + 200)

    def embed(self, text, *, query=False, title="none"):
        return [1.0] + [0.0] * 767

    def generate(self, prompt):
        self.calls += 1
        first = json.loads(prompt)["sources"][0]
        excerpt = first["text"].split(".")[0] + "."
        return GenerationReceipt(
            text=json.dumps(
                {
                    "answer_title": "The keeper",
                    "insufficient_evidence": False,
                    "claims": [
                        {
                            "text": "Mara keeps the archive's blue lantern.",
                            "citations": [
                                {
                                    "source_id": first["source_id"],
                                    "excerpt": excerpt,
                                    "start_offset": first["start_offset"],
                                }
                            ],
                        }
                    ],
                }
            ),
            usage={
                "prompt_token_count": self.count(prompt),
                "candidates_token_count": 35,
                "thoughts_token_count": 10,
                "cached_content_token_count": 0,
            },
            model_version="fixture-provider-v1",
            request_id="fixture-request",
            finish_reason="STOP",
        )


@pytest.fixture
def repo():
    dsn = os.getenv("PENSIEVE_TEST_DATABASE_URL")
    if not dsn:
        pytest.skip("Set PENSIEVE_TEST_DATABASE_URL to run real PostgreSQL integration tests.")
    info = psycopg.conninfo.conninfo_to_dict(dsn)
    if not info.get("dbname", "").endswith("_test"):
        raise ValueError("Integration tests require a dedicated database ending in _test.")
    namespace = "test_" + uuid4().hex
    with psycopg.connect(dsn) as connection:
        connection.execute("CREATE EXTENSION IF NOT EXISTS vector")
        connection.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(namespace)))
    isolated_dsn = make_conninfo(dsn, options=f"-c search_path={namespace},public")
    database = Database(isolated_dsn)
    settings = Settings(database_url=isolated_dsn, live_enabled=True, gemini_api_key="fixture")
    repository = LiveRepository(database, settings)
    with database.connection() as connection:
        schema = Path("migrations/schema.sql").read_text(encoding="utf-8")
        for statement in schema.split(";"):
            if statement.strip():
                connection.execute(statement)
    repository.import_bundle(original_bundle())
    yield repository
    database.close()
    with psycopg.connect(dsn) as connection:
        connection.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(namespace)))


def request(**changes):
    return RunRequest(
        question="Quem mantém a lanterna azul?",
        mode="compare",
        corpus_id="harry-potter-archive",
        corpus_version="pdf-original-fixture",
        book_ids=["vol-1"],
        chapter_ids=["vol-1-ch-1"],
        **changes,
    )


def complete_tasks(repo, provider):
    while task := repo.claim_task("integration-worker"):
        process_task(repo, repo.settings, provider, task)


def test_drop_capital_and_reversible_locations():
    raw = "M\n\t\nCHAPTER\tONE\nTHE\tBOY\tWHO\tLIVED\nr.\tDursley kept a ledger."
    text, mapping, repaired = canonical_page(raw, "The Boy Who Lived")
    assert text == "Mr. Dursley kept a ledger."
    assert repaired
    for begin, end, source_begin, source_end in mapping:
        assert len(text[begin:end]) == source_end - source_begin
        for canonical, original in zip(text[begin:end], raw[source_begin:source_end], strict=True):
            assert canonical == original or canonical == " " and original.isspace()


def test_chunks_cover_original_sources_and_do_not_cross_chapters():
    bundle = original_bundle()
    assert validate_bundle(bundle)["chapters"] == 2
    bundle.chunks[0].spans[0].start = 5
    with pytest.raises(ValueError, match="differs"):
        validate_bundle(bundle)


def test_quote_must_be_in_actual_supplied_range():
    bundle = original_bundle()
    source = bundle.units[0].source
    answer = ProposedAnswer.model_validate(
        {
            "answer_title": "A claim",
            "insufficient_evidence": False,
            "claims": [
                {
                    "text": "The keeper records visitors.",
                    "citations": [
                        {
                            "source_id": source.id,
                            "excerpt": "The keeper records every visitor in a copper ledger.",
                        }
                    ],
                }
            ],
        }
    )
    with pytest.raises(ValueError, match="outside"):
        validate_answer(
            answer, bundle.units, [SourceRange(source_id=source.id, start=0, end=40)], "branch"
        )


def test_gemini_cost_includes_thinking_and_cached_input():
    assert (
        generation_cost(
            {
                "prompt_token_count": 1000,
                "cached_content_token_count": 400,
                "candidates_token_count": 100,
                "thoughts_token_count": 50,
            }
        )
        == 0.000385
    )
    assert generation_cost({}) is None


def test_sdk_configuration_uses_structured_output_and_disables_paid_retries():
    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))
    config = provider.config()
    assert config.response_json_schema["properties"]["claims"]
    assert config.automatic_function_calling.disable
    assert config.max_output_tokens == 2048
    provider.close()


def test_preflight_counts_system_schema_and_context_via_discovery_contract():
    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))

    def handle(request):
        body = json.loads(request.content)["generateContentRequest"]
        assert body["model"] == "models/gemini-3.1-flash-lite"
        assert body["systemInstruction"]["parts"][0]["text"]
        assert body["generationConfig"]["responseJsonSchema"]["properties"]["claims"]
        assert body["contents"][0]["parts"][0]["text"] == "Frozen source context"
        assert "key=" not in str(request.url)
        return httpx.Response(200, json={"totalTokens": 123})

    provider.counter.close()
    provider.counter = httpx.Client(transport=httpx.MockTransport(handle))
    assert provider.count("Frozen source context") == 123
    provider.close()


def test_sdk_receipt_uses_enum_value_not_python_enum_string(monkeypatch):
    from google.genai import types

    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))
    response = types.GenerateContentResponse(
        candidates=[
            types.Candidate(
                content=types.Content(parts=[types.Part(text="{}")]),
                finish_reason=types.FinishReason.STOP,
            )
        ]
    )
    monkeypatch.setattr(provider.client.models, "generate_content", lambda **_: response)
    assert provider.generate("A source").finish_reason == "STOP"
    provider.close()


def test_import_is_idempotent_and_export_retains_embeddings(repo):
    repo.import_bundle(original_bundle())
    restored = repo.export_bundle("harry-potter-archive", "pdf-original-fixture")
    assert len(restored.units) == 2
    assert len(restored.chunks) == 2
    assert restored.chunks[0].embedding == [1.0] + [0.0] * 767
    assert validate_bundle(restored)["valid"]


def test_paired_generation_and_run_scoped_evidence(repo):
    provider = FixtureProvider()
    app = create_app(
        MemoryRunRepository(), settings=repo.settings, live_repository=repo, provider=provider
    )
    with TestClient(app) as client:
        response = client.post("/api/runs", json=request().model_dump())
        assert response.status_code == 201
        run_id = response.json()["id"]
        complete_tasks(repo, provider)
        result = client.get(f"/api/runs/{run_id}").json()
        assert result["status"] == "complete"
        assert result["schema_version"] == "2.0"
        for branch in result["branches"]:
            assert branch["status"] == "complete"
            assert branch["metrics"]["basis"] == "provider_reported"
            assert branch["metrics"]["thinking_tokens"] == 10
            citation = branch["claims"][0]["citations"][0]
            evidence = client.get(f"/api/runs/{run_id}/evidence/{citation['id']}").json()
            assert evidence["source"]["chapter_id"] == "vol-1-ch-1"
            assert evidence["citation"]["support_status"] == "not_assessed"
        with TestClient(app) as stranger:
            assert stranger.get(f"/api/runs/{run_id}").status_code == 404
            assert stranger.post(f"/api/runs/{run_id}/cancel").status_code == 404


def test_idempotency_reuses_one_run_and_rejects_key_reuse(repo):
    service = LiveService(repo, repo.settings, FixtureProvider())
    body = request(idempotency_key="same-inquiry-key")
    first = service.create(body, "owner", "ip")
    second = service.create(body, "owner", "ip")
    assert first.id == second.id
    with pytest.raises(ArchiveProblem, match="already used"):
        service.create(body.model_copy(update={"question": "Another question"}), "owner", "ip")


def test_cancellation_preserves_success_and_releases_unstarted_branch(repo):
    provider = FixtureProvider()
    run = LiveService(repo, repo.settings, provider).create(request(), "owner", "ip")
    task = repo.claim_task("worker")
    process_task(repo, repo.settings, provider, task)
    cancelled = repo.cancel(run.id, "owner")
    assert cancelled.branches[0].status == "complete"
    assert cancelled.branches[1].status == "cancelled"
    with repo.db.connection() as connection:
        remaining = connection.execute(
            "SELECT actual_microusd FROM usage_ledger WHERE operation='full_context'"
        ).fetchone()
    assert remaining["actual_microusd"] == 0


def test_simultaneous_budget_reservations_cannot_overspend(repo):
    repo.settings = replace(repo.settings, monthly_budget_usd=0.01)

    def reserve():
        try:
            repo.reserve_operation("test", 0.006)
            return True
        except ArchiveProblem:
            return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(lambda _: reserve(), range(2)))
    assert sum(results) == 1


def test_public_access_requires_proxy_and_enforces_visitor_quota(repo):
    repo.settings = replace(
        repo.settings,
        public_mode=True,
        proxy_key="proxy-secret",
        session_secret="session-secret",
        public_daily_queries=1,
    )
    app = create_app(
        MemoryRunRepository(),
        settings=repo.settings,
        live_repository=repo,
        provider=FixtureProvider(),
    )
    with TestClient(app, base_url="https://archive.test") as client:
        assert client.get("/api/corpora").status_code == 403
        client.headers.update(
            {"x-pensieve-proxy-key": "proxy-secret", "x-pensieve-client-ip": "192.0.2.1"}
        )
        assert client.get("/api/corpora").status_code == 200
        first = client.post("/api/runs", json=request().model_dump())
        assert first.status_code == 201
        second = client.post("/api/runs", json=request().model_dump())
        assert second.status_code == 429


def test_worker_restart_requeues_only_tasks_without_paid_calls(repo):
    run = LiveService(repo, repo.settings, FixtureProvider()).create(request(), "owner", "ip")
    task = repo.claim_task("crashed")
    with repo.db.connection() as connection:
        connection.execute(
            "UPDATE tasks SET lease_until=now()-interval '1 minute' WHERE id=%s", (task["id"],)
        )
    repo.recover_expired()
    recovered = repo.claim_task("replacement")
    assert recovered["id"] == task["id"]
    repo.start_call(recovered["id"])
    with repo.db.connection() as connection:
        connection.execute(
            "UPDATE tasks SET lease_until=now()-interval '1 minute' WHERE id=%s", (task["id"],)
        )
    repo.recover_expired()
    result = repo.get_run(run.id)
    assert result.branches[0].error_code == "provider_interrupted"
    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT actual_microusd FROM usage_ledger WHERE id=%s", (task["id"],)
        ).fetchone()
    assert ledger["actual_microusd"] is None


def test_failed_method_does_not_erase_successful_partner(repo):
    provider = FixtureProvider()
    run = LiveService(repo, repo.settings, provider).create(request(), "owner", "ip")
    first = repo.claim_task("worker")
    process_task(repo, repo.settings, provider, first)

    class FailingProvider(FixtureProvider):
        def generate(self, prompt):
            raise TimeoutError("Simulated provider timeout")

    second = repo.claim_task("worker")
    process_task(repo, repo.settings, FailingProvider(), second)
    result = repo.get_run(run.id)
    assert [branch.status for branch in result.branches] == ["complete", "failed"]
    assert result.branches[0].claims
