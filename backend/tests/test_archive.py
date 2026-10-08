from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.citations import resolve_citation
from app.contracts import RunRequest
from app.demo.catalog import CORPORA, SOURCES
from app.experiments import ExperimentService
from app.main import create_app
from app.repository import MemoryRunRepository


@pytest.fixture
def client():
    return TestClient(create_app(MemoryRunRepository()))


@pytest.mark.parametrize("corpus", CORPORA, ids=lambda corpus: corpus.id)
def test_every_prepared_answer_has_exact_supplied_source_spans(client, corpus):
    for example in corpus.examples:
        response = client.post(
            "/api/runs",
            json={
                "question": example.question,
                "mode": "compare",
                "corpus_id": corpus.id,
                "corpus_version": corpus.version,
            },
        )
        assert response.status_code == 201
        preview = client.get(f"/api/demo?corpus_id={corpus.id}&question_id={example.id}").json()
        assert preview["data_mode"] == "mock"
        assert preview["configuration"]["corpus_version"] == corpus.version
        sources = {source["id"]: source for source in preview["sources"]}
        for branch in preview["branches"]:
            assert branch["metrics"]["basis"] == "illustrative"
            if branch["method"] == "full_context":
                assert set(branch["context"]["source_ids"]) == set(sources)
            for claim in branch["claims"]:
                for citation in claim["citations"]:
                    assert citation["source_id"] in branch["context"]["source_ids"]
                    source = sources[citation["source_id"]]
                    assert (
                        source["text"][citation["start_offset"] : citation["end_offset"]]
                        == citation["excerpt"]
                    )
                    result = client.get(f"/api/runs/{preview['id']}/evidence/{citation['id']}")
                    assert result.status_code == 200
                    assert result.json()["claim"]["id"] == claim["id"]
                    assert result.json()["source"]["corpus_id"] == corpus.id


def test_unsupplied_and_invented_quotations_are_rejected():
    source = SOURCES[0]
    with pytest.raises(ValueError, match="supplied"):
        resolve_citation(source, source.text, "citation", 1, [])
    with pytest.raises(ValueError, match="does not occur"):
        resolve_citation(source, "A fabricated quote.", "citation", 1, [source.id])


@pytest.mark.parametrize(
    "mode,methods",
    [
        ("rag", ["rag"]),
        ("full_context", ["full_context"]),
        ("compare", ["rag", "full_context"]),
    ],
)
def test_mode_controls_returned_branches(client, mode, methods):
    response = client.get(f"/api/demo?mode={mode}")
    assert response.status_code == 200
    assert [branch["method"] for branch in response.json()["branches"]] == methods


def test_partial_completion_and_cancel_preserve_completed_branch():
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question=CORPORA[0].examples[0].question,
            corpus_id=CORPORA[0].id,
            corpus_version=CORPORA[0].version,
        )
    )
    snapshot = repository.get(run.id)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=1.8)
    repository.save(snapshot)
    partial = service.view(run.id)
    assert partial.branches[0].status == "complete"
    assert partial.branches[0].claims
    assert partial.branches[1].status == "generating"
    assert partial.branches[1].claims == []
    assert partial.branches[1].metrics.input_tokens is None
    cancelled = service.cancel(run.id)
    assert cancelled.status == "cancelled"
    assert cancelled.branches[0].claims == partial.branches[0].claims
    assert cancelled.branches[1].status == "cancelled"
    assert cancelled.branches[1].metrics.basis == "unavailable"


def test_unprepared_question_abstains_and_corpus_version_is_checked(client):
    corpus = CORPORA[0]
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question="What recipe makes the Stone?",
            corpus_id=corpus.id,
            corpus_version=corpus.version,
        ),
        preview=True,
    )
    assert all(branch.insufficient_evidence and not branch.claims for branch in run.branches)
    response = client.post(
        "/api/runs",
        json={
            "question": "A valid question",
            "mode": "compare",
            "corpus_id": corpus.id,
            "corpus_version": "stale",
        },
    )
    assert response.status_code == 422
    assert set(response.json()) == {"code", "message"}


@pytest.mark.parametrize(
    "payload",
    [
        {"question": "   ", "corpus_id": CORPORA[0].id, "corpus_version": CORPORA[0].version},
        {"question": "A question", "corpus_id": "missing", "corpus_version": CORPORA[0].version},
        {
            "question": "A question",
            "corpus_id": CORPORA[0].id,
            "corpus_version": CORPORA[0].version,
            "mode": "magic",
        },
    ],
)
def test_invalid_requests_return_the_documented_problem_shape(client, payload):
    response = client.post("/api/runs", json=payload)
    assert response.status_code == 422
    assert set(response.json()) == {"code", "message"}


def test_evidence_is_scoped_to_its_experiment(client):
    first = client.get("/api/demo").json()
    second = client.get("/api/demo?corpus_id=lantern-ledger").json()
    citation = first["branches"][0]["claims"][0]["citations"][0]["id"]
    response = client.get(f"/api/runs/{second['id']}/evidence/{citation}")
    assert response.status_code == 404
    assert set(response.json()) == {"code", "message"}


def test_matching_a_topic_does_not_fabricate_a_prepared_answer():
    service = ExperimentService(MemoryRunRepository())
    corpus = CORPORA[0]
    run = service.create(
        RunRequest(
            question="Who manufactured the Mirror of Erised?",
            corpus_id=corpus.id,
            corpus_version=corpus.version,
        ),
        preview=True,
    )
    assert all(branch.insufficient_evidence and not branch.claims for branch in run.branches)


def test_completed_run_persists_to_repository():
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question=CORPORA[0].examples[0].question,
            corpus_id=CORPORA[0].id,
            corpus_version=CORPORA[0].version,
        )
    )
    snapshot = repository.get(run.id)
    snapshot.created_at = datetime.now(UTC) - timedelta(seconds=3.0)
    repository.save(snapshot)

    completed = service.view(run.id)
    assert completed.status == "complete"
    assert all(branch.status == "complete" for branch in completed.branches)

    stored = repository.get(run.id)
    assert stored is not None
    assert stored.status == "complete"


def test_cancel_persists_to_repository():
    repository = MemoryRunRepository()
    service = ExperimentService(repository)
    run = service.create(
        RunRequest(
            question=CORPORA[0].examples[0].question,
            corpus_id=CORPORA[0].id,
            corpus_version=CORPORA[0].version,
        )
    )
    cancelled = service.cancel(run.id)
    assert cancelled.status == "cancelled"

    stored = repository.get(run.id)
    assert stored is not None
    assert stored.status == "cancelled"
