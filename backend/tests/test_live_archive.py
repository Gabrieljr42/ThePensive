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
from psycopg.types.json import Jsonb

from app.contracts import BookSummary, ChapterSummary, Corpus, Mode, RunRequest, SourcePassage
from app.corpus import Chunk, CorpusBundle, SourceRange, SourceUnit
from app.db import Database
from app.errors import ArchiveProblem
from app.live_repository import LiveRepository, microdollars
from app.live_service import LiveService
from app.main import create_app
from app.pipelines.context import full_context, rag_context, validate_answer
from app.pipelines.generation import (
    REVIEW_SYSTEM,
    GeminiProvider,
    GenerationReceipt,
    ProposedAnswer,
    citation_options,
    embedding_reservation,
    generation_cost,
    offered_citations,
    prepare_review_prompt,
    prompt_for,
    review_schema,
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
    review_calls = 0

    def count(self, prompt):
        return max(100, len(prompt.encode()) // 4 + 200)

    def count_review(self, prompt):
        return self.count(prompt)

    def embed(self, text, *, query=False, title="none"):
        return [1.0] + [0.0] * 767

    def generate(self, prompt):
        self.calls += 1
        self.primary_receipt = self._answer(prompt, "fixture-primary-request")
        return self.primary_receipt

    def review(self, prompt):
        self.review_calls += 1
        self.review_receipt = self._answer(prompt, "fixture-review-request", output_tokens=23)
        return self.review_receipt

    def _answer(self, prompt, request_id, output_tokens=35):
        payload = json.loads(prompt)
        if payload.get("review"):
            answer = {
                "answer_title": payload["proposed_answer_title"],
                "claim_reviews": [
                    {
                        "claim_index": dossier["claim_index"],
                        "action": "retain",
                        "text": dossier["proposed_text"],
                        "citations": [
                            {"quote_id": quote_id}
                            for quote_id in dossier["cited_quote_ids"]
                        ],
                    }
                    for dossier in payload["claim_dossiers"]
                ],
            }
        else:
            first = payload["sources"][0]
            answer = {
                "answer_title": "The keeper",
                "insufficient_evidence": False,
                "claims": [
                    {
                        "text": "Mara keeps the archive's blue lantern.",
                        "citations": [{"quote_id": first["citation_options"][0]["quote_id"]}],
                    }
                ],
            }
        return GenerationReceipt(
            text=json.dumps(answer),
            usage={
                "prompt_token_count": self.count(prompt),
                "candidates_token_count": output_tokens,
                "thoughts_token_count": 10,
                "cached_content_token_count": 0,
            },
            model_version="fixture-provider-v1",
            request_id=request_id,
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
    usage = {
        "prompt_token_count": 1000,
        "cached_content_token_count": 400,
        "candidates_token_count": 100,
        "thoughts_token_count": 50,
    }
    assert generation_cost(usage, "gemini-3.1-flash-lite") == 0.000385
    assert generation_cost(usage, "gemini-3.8-flash") == 0.0010425
    assert generation_cost(usage) == 0.0010425
    assert generation_cost({}) is None


def test_citation_options_resolve_exact_text_and_reject_unsupplied_options():
    bundle = original_bundle()
    source = bundle.units[0].source
    block = {"text": source.text, "start_offset": 0}
    option = citation_options(block)[0]
    answer = ProposedAnswer.model_validate(
        {
            "answer_title": "The keeper",
            "insufficient_evidence": False,
            "claims": [
                {
                    "text": "Mara keeps the lantern.",
                    "citations": [
                        {
                            "quote_id": 0,
                        }
                    ],
                }
            ],
        }
    )
    spans = [SourceRange(source_id=source.id, start=0, end=len(source.text))]
    claims = validate_answer(answer, bundle.units, spans, "branch")
    citation = claims[0].citations[0]
    assert citation.excerpt == option["text"]
    assert source.text[citation.start_offset : citation.end_offset] == option["text"]
    answer.claims[0].citations[0].quote_id = 99999
    with pytest.raises(ValueError, match="not supplied"):
        validate_answer(answer, bundle.units, spans, "branch")
    answer.claims[0].citations[0].quote_id = 0
    answer.claims[0].citations[0].source_id = bundle.units[1].source.id
    with pytest.raises(ValueError, match="different source"):
        validate_answer(answer, bundle.units, spans, "branch")


def test_full_context_options_preserve_every_word_and_original_character_ranges():
    bundle = original_bundle()
    blocks, _ = full_context(bundle.units)
    payload = json.loads(prompt_for("Who keeps the lantern?", blocks))
    offered = offered_citations(blocks)
    assert len(payload["sources"]) == len(bundle.units)
    for unit, block in zip(bundle.units, payload["sources"], strict=True):
        assert block["source_id"] == unit.source.id
        assert " ".join(option["text"] for option in block["citation_options"]) == unit.source.text
        for option in block["citation_options"]:
            candidate = offered[option["quote_id"]]
            begin = candidate["start_offset"]
            assert candidate["source_id"] == unit.source.id
            assert unit.source.text[begin : begin + len(option["text"])] == option["text"]


def test_sdk_configuration_uses_structured_output_and_disables_paid_retries():
    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))
    config = provider.config()
    assert config.response_json_schema["properties"]["claims"]
    assert config.automatic_function_calling.disable
    assert config.max_output_tokens == 2048
    provider.close()


def test_embedding_request_works_through_the_developer_sdk_transport():
    from google import genai
    from google.genai import types

    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))
    requests = []

    def handle(request):
        bodies = json.loads(request.content)["requests"]
        requests.extend(bodies)
        assert request.url.path.endswith("gemini-embedding-2:batchEmbedContents")
        assert all(body["outputDimensionality"] == 768 for body in bodies)
        assert all("autoTruncate" not in body for body in bodies)
        assert "key=" not in str(request.url)
        return httpx.Response(
            200,
            json={
                "embeddings": [{"values": [1.0] + [0.0] * 767} for _ in bodies],
            },
        )

    provider.client.close()
    provider.client = genai.Client(
        api_key="unit-test",
        http_options=types.HttpOptions(
            client_args={"transport": httpx.MockTransport(handle)},
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )
    try:
        assert len(provider.embed("A short source", title="The archive")) == 768
        assert len(provider.embed("Who keeps the lantern?", query=True)) == 768
        assert requests[0]["content"]["parts"][0]["text"].startswith("title: The archive")
        assert requests[1]["content"]["parts"][0]["text"].startswith("task: question answering")
        vectors = provider.embed_documents(
            [("First document", "Chapter 1"), ("Second document", "Chapter 2")]
        )
        assert len(vectors) == 2
        assert "First document" in requests[2]["content"]["parts"][0]["text"]
        assert "Second document" in requests[3]["content"]["parts"][0]["text"]
    finally:
        provider.close()


def test_preflight_counts_system_schema_and_context_via_discovery_contract():
    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))

    def handle(request):
        body = json.loads(request.content)["generateContentRequest"]
        assert body["model"] == f"models/{provider.settings.model}"
        assert body["systemInstruction"]["parts"][0]["text"]
        assert body["generationConfig"]["responseJsonSchema"]["properties"]["claims"]
        assert body["contents"][0]["parts"][0]["text"] == "Frozen source context"
        assert "key=" not in str(request.url)
        return httpx.Response(200, json={"totalTokens": 123})

    provider.counter.close()
    provider.counter = httpx.Client(transport=httpx.MockTransport(handle))
    assert provider.count("Frozen source context") == 123
    provider.close()


def test_source_review_prompt_keeps_original_gappy_quote_ids_and_limits_sources():
    def block(source_id, text):
        return {
            "source_id": source_id,
            "start_offset": 0,
            "end_offset": len(text),
            "book": "Fixture",
            "chapter": source_id,
            "pdf_page": "1",
            "text": text,
        }

    original = prompt_for(
        "What happened?",
        [block(f"source-{number}", ("word " * 100) + f"source {number}") for number in range(3)],
    )
    source_data = json.loads(original)["sources"]
    ids = [source_data[index]["citation_options"][0]["quote_id"] for index in (0, 2)]
    answer = ProposedAnswer.model_validate(
        {
            "answer_title": "Evidence",
            "insufficient_evidence": False,
            "claims": [
                {
                    "text": "A sourced statement.",
                    "citations": [{"quote_id": quote_id} for quote_id in ids],
                }
            ],
        }
    )
    review_prompt, allowed_by_claim = prepare_review_prompt(original, answer)
    review = json.loads(review_prompt)
    assert len(review["claim_dossiers"]) == 1
    dossier = review["claim_dossiers"][0]
    assert dossier["claim_index"] == 0
    assert {block["source_id"] for block in dossier["source_options"]} == {
        "source-0", "source-2"
    }
    assert all(len(block["options"]) <= 3 for block in dossier["source_options"])
    offered_dossier_ids = {
        option["quote_id"]
        for block in dossier["source_options"]
        for option in block["options"]
    }
    assert offered_dossier_ids == allowed_by_claim[0]
    selector = review_schema(review_prompt)["$defs"]["ProposedReviewCitation"]["properties"][
        "quote_id"
    ]
    assert selector["enum"] == sorted(allowed_by_claim[0])
    assert "source-1" not in review_prompt


def test_source_review_count_uses_editor_instruction_and_allowed_selector_schema():
    provider = GeminiProvider(Settings(gemini_api_key="unit-test"))
    calls = []

    def handle(request):
        body = json.loads(request.content)["generateContentRequest"]
        calls.append(body)
        return httpx.Response(200, json={"totalTokens": 321})

    provider.counter.close()
    provider.counter = httpx.Client(transport=httpx.MockTransport(handle))
    prompt = json.dumps(
        {
            "review": True,
            "claim_dossiers": [
                {
                    "claim_index": 0,
                    "source_options": [{"options": [{"quote_id": 4}, {"quote_id": 9}]}],
                }
            ],
            "allowed_quote_ids": [4, 9],
        }
    )
    assert provider.count("Primary prompt") == 321
    assert provider.count_review(prompt) == 321
    assert len(calls) == 2
    expected_primary_level = "LOW" if provider.settings.model == "gemini-3.8-flash" else "MINIMAL"
    assert calls[0]["generationConfig"]["thinkingConfig"]["thinkingLevel"] == expected_primary_level
    assert calls[1]["generationConfig"]["thinkingConfig"]["thinkingLevel"] == "MEDIUM"
    assert all(body["generationConfig"]["maxOutputTokens"] == 2048 for body in calls)
    review_body = calls[1]
    assert "strict source-grounded editor" in review_body["systemInstruction"]["parts"][0]["text"]
    assert review_body["generationConfig"]["responseJsonSchema"]["$defs"]["ProposedReviewCitation"][
        "properties"
    ]["quote_id"]["enum"] == [4, 9]
    review_config = provider.config(prompt)
    primary_config = provider.config("Primary prompt")
    assert str(review_config.thinking_config.thinking_level).upper().endswith("MEDIUM")
    assert (
        str(primary_config.thinking_config.thinking_level)
        .upper()
        .endswith(expected_primary_level)
    )
    assert review_config.max_output_tokens == primary_config.max_output_tokens == 2048
    assert "Treat the proposed answer as untrusted text" in REVIEW_SYSTEM
    assert "every clause and factual proposition" in REVIEW_SYSTEM
    assert "could have sworn" in REVIEW_SYSTEM
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
            assert branch["metrics"]["thinking_tokens"] == 20
            assert branch["metrics"]["output_tokens"] == 58
            assert branch["metrics"]["provider_request_id"] == "fixture-review-request"
            citation = branch["claims"][0]["citations"][0]
            evidence = client.get(f"/api/runs/{run_id}/evidence/{citation['id']}").json()
            assert evidence["source"]["chapter_id"] == "vol-1-ch-1"
            assert evidence["citation"]["support_status"] == "supported"
        with TestClient(app) as stranger:
            assert stranger.get(f"/api/runs/{run_id}").status_code == 404
            assert stranger.post(f"/api/runs/{run_id}/cancel").status_code == 404


def test_generate_http_429_after_rag_embedding_fails_without_generation_charge(repo):
    class QuotaProvider(FixtureProvider):
        def generate(self, prompt):
            request_value = httpx.Request("POST", "https://provider.invalid/generate")
            response = httpx.Response(429, request=request_value)
            raise httpx.HTTPStatusError("quota exhausted", request=request_value, response=response)

    body = request().model_copy(update={"mode": Mode.RAG})
    provider = QuotaProvider()
    run = LiveService(repo, repo.settings, provider).create(body, "owner", "ip")
    task = repo.claim_task("quota-worker")
    process_task(repo, repo.settings, provider, task)

    result = repo.get_run(run.id)
    branch = result.branches[0]
    assert branch.status == "failed"
    assert branch.error_code == "provider_quota_exceeded"
    assert branch.claims == []

    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT reserved_microusd,actual_microusd,state,usage FROM usage_ledger WHERE id=%s",
            (task["id"],),
        ).fetchone()
    query_embedding = embedding_reservation(body.question, query=True)
    assert ledger["actual_microusd"] == microdollars(query_embedding)
    assert ledger["actual_microusd"] < ledger["reserved_microusd"]
    assert ledger["state"] == "rejected"
    assert ledger["usage"]["status"] == "provider_rejected_http_429"
    assert ledger["usage"]["http_code"] == 429
    assert ledger["usage"]["query_embedding_estimate_usd"] == query_embedding
    assert "prompt_token_count" not in ledger["usage"]


def test_live_worker_rejects_exact_legacy_citation_without_quote_id(repo):
    class LegacyCitationProvider(FixtureProvider):
        def generate(self, prompt):
            receipt = super().generate(prompt)
            first = json.loads(prompt)["sources"][0]
            option = first["citation_options"][0]
            answer = json.loads(receipt.text)
            answer["claims"][0]["citations"] = [
                {
                    "source_id": first["source_id"],
                    "excerpt": option["text"],
                    "start_offset": first["start_offset"],
                }
            ]
            receipt.text = json.dumps(answer)
            return receipt

    body = request().model_copy(update={"mode": Mode.FULL_CONTEXT})
    provider = LegacyCitationProvider()
    run = LiveService(repo, repo.settings, provider).create(body, "owner", "ip")
    task = repo.claim_task("legacy-worker")
    process_task(repo, repo.settings, provider, task)

    result = repo.get_run(run.id)
    branch = result.branches[0]
    assert branch.status == "failed"
    assert branch.error_code == "answer_validation_failed"
    assert branch.claims == []
    first = full_context(repo.units(body, ["vol-1-ch-1"]))[0][0]
    option = json.loads(prompt_for(body.question, [first]))["sources"][0]["citation_options"][0]
    source = repo.units(body, ["vol-1-ch-1"])[0].source
    assert (
        source.text[first["start_offset"] : first["start_offset"] + len(option["text"])]
        == (option["text"])
    )


def run_single_branch(repo, provider, mode=Mode.FULL_CONTEXT):
    body = request().model_copy(update={"mode": mode})
    run = LiveService(repo, repo.settings, provider).create(body, "owner", "ip")
    task = repo.claim_task("review-worker")
    process_task(repo, repo.settings, provider, task)
    return body, repo.get_run(run.id), task


def test_source_review_can_correct_claim_and_preserves_both_receipts(repo):
    class CorrectingProvider(FixtureProvider):
        def review(self, prompt):
            self.review_calls += 1
            answer = json.loads(self._answer(prompt, "review-correction").text)
            answer["claim_reviews"][0]["action"] = "revise"
            answer["claim_reviews"][0]["text"] = "Mara keeps the blue lantern."
            return GenerationReceipt(
                text=json.dumps(answer),
                usage={
                    "prompt_token_count": self.count(prompt),
                    "candidates_token_count": 23,
                    "thoughts_token_count": 4,
                    "cached_content_token_count": 0,
                },
                model_version="fixture-review-v1",
                request_id="review-correction",
                finish_reason="STOP",
            )

    provider = CorrectingProvider()
    _, run, task = run_single_branch(repo, provider)
    branch = run.branches[0]
    assert branch.status == "complete"
    assert branch.claims[0].text == "Mara keeps the blue lantern."
    assert branch.claims[0].citations[0].support_status == "supported"
    assert branch.metrics.provider_request_id == "review-correction"
    assert branch.metrics.stage_ms["source_review"] >= 0
    with repo.db.connection() as connection:
        attempt = connection.execute(
            "SELECT attempt FROM tasks WHERE id=%s", (task["id"],)
        ).fetchone()["attempt"]
    assert attempt["primary"]["request_id"] == "fixture-primary-request"
    assert attempt["source_review"]["request_id"] == "review-correction"
    assert attempt["generation_metadata"] == {
        "prompt_version": "source-grounded-v8-claim-dossiers",
        "review_version": "source-review-v3-claim-dossiers",
    }


@pytest.mark.parametrize("selector", [999, None])
def test_source_review_rejects_missing_or_unoffered_quote_id(repo, selector):
    class InvalidReviewProvider(FixtureProvider):
        def review(self, prompt):
            self.review_calls += 1
            answer = json.loads(self._answer(prompt, "invalid-review").text)
            if selector is None:
                answer["claim_reviews"][0]["citations"] = [{}]
            else:
                answer["claim_reviews"][0]["citations"][0]["quote_id"] = selector
            receipt = self._answer(prompt, "invalid-review")
            receipt.text = json.dumps(answer)
            return receipt

    provider = InvalidReviewProvider()
    _, run, _ = run_single_branch(repo, provider)
    branch = run.branches[0]
    assert branch.status == "failed"
    assert branch.error_code == "answer_validation_failed"
    assert branch.claims == []


def test_review_http_429_settles_only_known_primary_and_embedding_cost(repo):
    class ReviewQuotaProvider(FixtureProvider):
        def review(self, prompt):
            self.review_calls += 1
            req = httpx.Request("POST", "https://provider.invalid/review")
            response = httpx.Response(429, request=req)
            raise httpx.HTTPStatusError("quota exhausted", request=req, response=response)

    provider = ReviewQuotaProvider()
    body, run, task = run_single_branch(repo, provider, Mode.RAG)
    branch = run.branches[0]
    assert branch.status == "failed"
    assert branch.error_code == "provider_quota_exceeded"
    assert branch.claims == []
    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT actual_microusd,state,usage FROM usage_ledger WHERE id=%s", (task["id"],)
        ).fetchone()
    expected = generation_cost(ledger["usage"]["primary"]) + embedding_reservation(
        body.question, query=True
    )
    assert ledger["actual_microusd"] == microdollars(expected)
    assert ledger["state"] == "rejected"
    assert ledger["usage"]["rejected_stage"] == "source_review"
    assert "source_review" not in ledger["usage"]


def test_review_timeout_keeps_entire_reservation_unknown(repo):
    class ReviewTimeoutProvider(FixtureProvider):
        def review(self, prompt):
            self.review_calls += 1
            raise TimeoutError("review response uncertain")

    provider = ReviewTimeoutProvider()
    _, run, task = run_single_branch(repo, provider)
    assert run.branches[0].status == "failed"
    assert run.branches[0].claims == []
    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT reserved_microusd,actual_microusd,state,usage FROM usage_ledger WHERE id=%s",
            (task["id"],),
        ).fetchone()
    assert ledger["actual_microusd"] is None
    assert ledger["state"] == "unknown"
    assert ledger["usage"]["uncertain_stage"] == "source_review"


@pytest.mark.parametrize("failure", ["timeout", "quota"])
def test_query_embedding_failure_does_not_erase_uncertain_consumption(repo, failure):
    class EmbeddingFailureProvider(FixtureProvider):
        def embed(self, text, *, query=False, title="none"):
            if failure == "quota":
                req = httpx.Request("POST", "https://provider.invalid/embed")
                response = httpx.Response(429, request=req)
                raise httpx.HTTPStatusError("quota exhausted", request=req, response=response)
            raise TimeoutError("embedding response uncertain")

    provider = EmbeddingFailureProvider()
    _, run, task = run_single_branch(repo, provider, Mode.RAG)
    assert run.branches[0].status == "failed"
    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT actual_microusd,state,usage FROM usage_ledger WHERE id=%s", (task["id"],)
        ).fetchone()
    if failure == "quota":
        assert ledger["actual_microusd"] == 0
        assert ledger["state"] == "rejected"
        assert ledger["usage"]["rejected_stage"] == "query_embedding"
    else:
        assert ledger["actual_microusd"] is None
        assert ledger["state"] == "unknown"
        assert ledger["usage"]["uncertain_stage"] == "query_embedding"


def test_abstention_skips_source_review(repo):
    class AbstainingProvider(FixtureProvider):
        def generate(self, prompt):
            self.calls += 1
            return GenerationReceipt(
                text=json.dumps(
                    {
                        "answer_title": "Insufficient evidence",
                        "insufficient_evidence": True,
                        "claims": [],
                    }
                ),
                usage={
                    "prompt_token_count": self.count(prompt),
                    "candidates_token_count": 3,
                    "thoughts_token_count": 0,
                    "cached_content_token_count": 0,
                },
                model_version="fixture-provider-v1",
                request_id="abstention-primary",
                finish_reason="STOP",
            )

    provider = AbstainingProvider()
    _, run, _ = run_single_branch(repo, provider)
    assert run.branches[0].status == "complete"
    assert run.branches[0].insufficient_evidence
    assert run.branches[0].claims == []
    assert provider.review_calls == 0


@pytest.mark.parametrize("cancel_at", ["primary", "source_review"])
def test_cancellation_after_paid_stage_reconciles_known_cost_without_claims(repo, cancel_at):
    class CancellingProvider(FixtureProvider):
        run_id = None

        def _cancel(self):
            repo.cancel(self.run_id, "owner")

        def generate(self, prompt):
            receipt = super().generate(prompt)
            if cancel_at == "primary":
                self._cancel()
            return receipt

        def review(self, prompt):
            receipt = super().review(prompt)
            self._cancel()
            return receipt

    provider = CancellingProvider()
    body = request().model_copy(update={"mode": Mode.FULL_CONTEXT})
    run = LiveService(repo, repo.settings, provider).create(body, "owner", "ip")
    provider.run_id = run.id
    task = repo.claim_task("cancel-review-worker")
    process_task(repo, repo.settings, provider, task)

    final = repo.get_run(run.id)
    assert final.branches[0].status == "cancelled"
    assert final.branches[0].claims == []
    expected = generation_cost(provider.primary_receipt.usage)
    if cancel_at == "source_review":
        expected += generation_cost(provider.review_receipt.usage)
    with repo.db.connection() as connection:
        ledger = connection.execute(
            "SELECT reserved_microusd,actual_microusd,state FROM usage_ledger WHERE id=%s",
            (task["id"],),
        ).fetchone()
    assert ledger["actual_microusd"] == microdollars(expected)
    assert ledger["state"] == "reported"
    assert ledger["actual_microusd"] is not None


def test_retrieval_balances_selected_books_and_expands_neighbors_within_scope(repo):
    records = []
    for book_number, book_id in enumerate(("vol-1", "vol-2"), 1):
        chapter_id = f"{book_id}-neighbor-test"
        for position in range(3):
            chunk = Chunk(
                id=f"neighbor-test:{book_id}:chunk-{position}",
                corpus_id="harry-potter-archive",
                corpus_version="pdf-original-fixture",
                book_id=book_id,
                chapter_id=chapter_id,
                order=position,
                text=f"lantern archive keeper book {book_number} passage {position}",
                estimated_tokens=10,
                spans=[],
                embedding=[1.0] + [0.0] * 767,
            )
            records.append(chunk)

    with repo.db.connection() as connection:
        for chunk in records:
            connection.execute(
                "INSERT INTO chunks(id,corpus_id,corpus_version,book_id,chapter_id,chunk_order,"
                "text_content,embedding,record) VALUES (%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)",
                (
                    chunk.id,
                    chunk.corpus_id,
                    chunk.corpus_version,
                    chunk.book_id,
                    chunk.chapter_id,
                    chunk.order,
                    chunk.text,
                    str(chunk.embedding),
                    Jsonb(chunk.model_dump(exclude={"embedding"})),
                ),
            )

    scoped_request = request().model_copy(
        update={
            "book_ids": ["vol-1", "vol-2"],
            "chapter_ids": ["vol-1-neighbor-test", "vol-2-neighbor-test"],
        }
    )
    retrieved = repo.retrieve(scoped_request, scoped_request.chapter_ids, [1.0] + [0.0] * 767)

    assert retrieved
    assert {item["chunk"].book_id for item in retrieved} == {"vol-1", "vol-2"}
    assert {item["chunk"].chapter_id for item in retrieved} == set(scoped_request.chapter_ids)
    first_four_books = [item["chunk"].book_id for item in retrieved[:4]]
    assert first_four_books.count("vol-1") == 2
    assert first_four_books.count("vol-2") == 2
    retrieved_ids = {item["chunk"].id for item in retrieved}
    assert retrieved_ids == {chunk.id for chunk in records}


def test_final_chapter_focus_requires_a_complete_selected_book(repo):
    def add_corpus(corpus_id, version, sourced_chapters):
        book_id = "vol-1"
        chapter_ids = [f"{book_id}-ch-{number}" for number in range(1, 5)]
        chapters = [
            ChapterSummary(
                id=chapter_id,
                number=number,
                title=f"Chapter {number}",
                page_start=number,
                page_end=number,
                source_count=1 if number <= sourced_chapters else 0,
                estimated_tokens=20 if number <= sourced_chapters else 0,
                chunk_count=1 if number <= sourced_chapters else 0,
                indexed=number <= sourced_chapters,
            )
            for number, chapter_id in enumerate(chapter_ids, 1)
        ]
        units = []
        for number, chapter_id in enumerate(chapter_ids[:sourced_chapters], 1):
            text = f"Chapter {number} holds a lantern and a closing passage."
            units.append(
                SourceUnit(
                    source=SourcePassage(
                        id=f"{version}:page-{number}",
                        corpus_id=corpus_id,
                        corpus_version=version,
                        book="Fixture Volume",
                        book_short="Fixture",
                        edition="Synthetic test edition",
                        chapter=f"Chapter {number}",
                        chapter_number=number,
                        page_label=str(number),
                        page_kind="pdf",
                        text=text,
                        attribution="Synthetic test fixture",
                        book_id=book_id,
                        chapter_id=chapter_id,
                        pdf_page_index=number - 1,
                    ),
                    order=number - 1,
                    raw_text=text,
                    location_map=[[0, len(text), 0, len(text)]],
                    text_hash=hashlib.sha256(text.encode()).hexdigest(),
                )
            )
        chunks = chunk_units(units)
        for chunk in chunks:
            chunk.embedding = [1.0] + [0.0] * 767
        corpus = Corpus(
            id=corpus_id,
            version=version,
            title="Synthetic temporal fixture",
            subtitle="Four chapter test corpus",
            edition="Synthetic edition",
            source_kind="original_fiction",
            book_count=1,
            source_count=len(units),
            examples=[],
            books=[
                BookSummary(
                    id=book_id,
                    ordinal=1,
                    title="Fixture Volume",
                    chapters=chapters,
                )
            ],
            indexed=True,
            embedding_model="gemini-embedding-2",
            embedding_dimensions=768,
        )
        repo.import_bundle(
            CorpusBundle(
                corpus=corpus,
                file_hash=f"fixture-{version}",
                page_count=len(units),
                units=units,
                chunks=chunks,
            )
        )
        return chapter_ids

    vector = [1.0] + [0.0] * 767
    complete_chapters = add_corpus("temporal-complete", "four-chapters", 4)
    complete_request = RunRequest(
        question="Quais os desfechos finais?",
        mode=Mode.RAG,
        corpus_id="temporal-complete",
        corpus_version="four-chapters",
        book_ids=["vol-1"],
        chapter_ids=complete_chapters,
    )
    final_ranked = repo.retrieve(complete_request, complete_chapters, vector)
    assert {item["chunk"].chapter_id for item in final_ranked} == set(complete_chapters[-2:])
    assert all(item["temporal_focus"] for item in final_ranked)
    _, _, final_trace = rag_context(
        final_ranked, repo.units(complete_request, complete_chapters), "gemini-embedding-2"
    )
    assert "final-chapter focus" in final_trace.reranker

    partial_chapters = complete_chapters[:2]
    partial_request = complete_request.model_copy(update={"chapter_ids": partial_chapters})
    partial_ranked = repo.retrieve(partial_request, partial_chapters, vector)
    assert {item["chunk"].chapter_id for item in partial_ranked} == set(partial_chapters)
    assert not any(item["temporal_focus"] for item in partial_ranked)
    _, _, partial_trace = rag_context(
        partial_ranked, repo.units(partial_request, partial_chapters), "gemini-embedding-2"
    )
    assert "final-chapter focus" not in partial_trace.reranker

    incomplete_chapters = add_corpus("temporal-incomplete", "three-of-four", 3)
    incomplete_request = RunRequest(
        question="Quais os desfechos finais?",
        mode=Mode.RAG,
        corpus_id="temporal-incomplete",
        corpus_version="three-of-four",
        book_ids=["vol-1"],
        chapter_ids=incomplete_chapters,
    )
    incomplete_ranked = repo.retrieve(incomplete_request, incomplete_chapters, vector)
    assert {item["chunk"].chapter_id for item in incomplete_ranked} == set(incomplete_chapters[:3])
    assert not any(item["temporal_focus"] for item in incomplete_ranked)
    _, _, incomplete_trace = rag_context(
        incomplete_ranked,
        repo.units(incomplete_request, incomplete_chapters),
        "gemini-embedding-2",
    )
    assert "final-chapter focus" not in incomplete_trace.reranker


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
    class TinyCountProvider(FixtureProvider):
        def count(self, prompt):
            return 1

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
        provider=TinyCountProvider(),
    )
    with TestClient(app, base_url="https://archive.test") as client:
        assert client.get("/api/corpora").status_code == 403
        client.headers.update(
            {"x-pensieve-proxy-key": "proxy-secret", "x-pensieve-client-ip": "192.0.2.1"}
        )
        assert client.get("/api/corpora").status_code == 200
        body = request().model_copy(update={"mode": Mode.FULL_CONTEXT})
        first = client.post("/api/runs", json=body.model_dump())
        assert first.status_code == 201
        second = client.post("/api/runs", json=body.model_dump())
        assert second.status_code == 429


def test_public_daily_query_quota_zero_allows_multiple_inquiries(repo):
    class TinyCountProvider(FixtureProvider):
        def count(self, prompt):
            return 1

    repo.settings = replace(
        repo.settings,
        public_mode=True,
        proxy_key="proxy-secret",
        session_secret="session-secret",
        public_daily_queries=0,
    )
    app = create_app(
        MemoryRunRepository(),
        settings=repo.settings,
        live_repository=repo,
        provider=TinyCountProvider(),
    )
    with TestClient(app, base_url="https://archive.test") as client:
        client.headers.update(
            {"x-pensieve-proxy-key": "proxy-secret", "x-pensieve-client-ip": "192.0.2.1"}
        )
        body1 = request().model_copy(update={"mode": Mode.FULL_CONTEXT, "idempotency_key": "k1"})
        first = client.post("/api/runs", json=body1.model_dump())
        assert first.status_code == 201
        task = repo.claim_task("test-worker")
        repo.settle(task["id"], 0.001, {"status": "success", "basis": "utf8_byte_upper_bound"})
        with repo.db.connection() as conn:
            conn.execute("UPDATE live_runs SET payload=jsonb_set(payload, '{status}', '\"completed\"')")
        body2 = request().model_copy(update={"mode": Mode.FULL_CONTEXT, "idempotency_key": "k2"})
        second = client.post("/api/runs", json=body2.model_dump())
        assert second.status_code == 201


def test_public_review_reservation_is_rejected_by_unchanged_default_query_cap(repo):
    settings = replace(repo.settings, public_mode=True, public_run_budget_usd=0.03)
    assert settings.public_run_budget_usd == 0.03
    service = LiveService(repo, settings, FixtureProvider())
    estimate = service.estimate(request().model_copy(update={"mode": Mode.RAG}))
    assert estimate.branches[0].maximum_cost_usd > settings.public_run_budget_usd
    assert not estimate.branches[0].eligible
    with pytest.raises(ArchiveProblem, match="per-query cost limit"):
        service.create(request().model_copy(update={"mode": Mode.RAG}), "owner", "ip")


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
