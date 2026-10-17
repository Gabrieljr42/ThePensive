"""Indexing reservation recovery tests using an in-memory SQL connection."""

from contextlib import contextmanager
from types import SimpleNamespace

import httpx
import pytest

from app.cli import index_corpus
from app.errors import ArchiveProblem
from app.live_repository import LiveRepository
from app.settings import Settings


class Result:
    def __init__(self, row=None):
        self.row = row

    def fetchone(self):
        return self.row


class MemoryConnection:
    def __init__(self):
        self.rows = {}

    def execute(self, query, params=()):
        if "SELECT pg_advisory_xact_lock" in query:
            return Result()
        if "FROM usage_ledger WHERE id=%s FOR UPDATE" in query:
            return Result(self.rows.get(params[0]))
        if "FROM usage_ledger WHERE month_key=%s" in query:
            month = params[0]
            used = sum(
                row["actual_microusd"]
                if row["actual_microusd"] is not None
                else row["reserved_microusd"]
                for row in self.rows.values()
                if row["month_key"] == month
            )
            return Result({"used": used})
        if query.startswith("INSERT INTO usage_ledger"):
            identifier, operation, month, day, reserved = params
            self.rows[identifier] = {
                "operation": operation,
                "month_key": month,
                "day_key": day,
                "reserved_microusd": reserved,
                "actual_microusd": None,
                "state": "reserved",
                "usage": None,
            }
            return Result()
        if query.startswith("UPDATE usage_ledger SET month_key="):
            month, day, reserved, usage, identifier = params
            row = self.rows[identifier]
            row.update(
                month_key=month,
                day_key=day,
                reserved_microusd=reserved,
                actual_microusd=None,
                state="reserved",
                usage=usage.obj,
            )
            return Result()
        if query.startswith("UPDATE usage_ledger SET actual_microusd="):
            actual, incoming, _fallback, state, identifier = params
            row = self.rows[identifier]
            previous = row["usage"] or {}
            usage = incoming.obj
            if "attempt_history" in previous:
                usage = {"attempt_history": previous["attempt_history"], **usage}
            row.update(actual_microusd=actual, usage=usage, state=state)
            return Result()
        raise AssertionError(f"Unexpected SQL in unit test: {query}")


class MemoryDatabase:
    def __init__(self):
        self.connection_value = MemoryConnection()

    @contextmanager
    def connection(self):
        yield self.connection_value


class IndexRepository(LiveRepository):
    def __init__(self):
        settings = Settings(
            live_enabled=True,
            gemini_api_key="fixture-only",
            monthly_budget_usd=10,
        )
        super().__init__(MemoryDatabase(), settings)
        self.saved = {}
        self.publish_count = 0
        self.reserve_calls = 0
        self.fail_reserve_at = None
        self._chunks = [
            SimpleNamespace(id=f"chunk-{number}", text=f"source {number}", chapter_id="ch-1")
            for number in range(3)
        ]

    def corpus(self, corpus_id, version):
        return SimpleNamespace(
            embedding_model="gemini-embedding-2", embedding_dimensions=768
        )

    def chunks(self, corpus_id, version, missing_only=False):
        return [chunk for chunk in self._chunks if chunk.id not in self.saved]

    def reserve_operation(self, operation, amount, reference=None):
        self.reserve_calls += 1
        if self.reserve_calls == self.fail_reserve_at:
            raise ArchiveProblem("budget_exhausted", "fixture budget exhausted", 429)
        return super().reserve_operation(operation, amount, reference)

    def save_embedding(self, chunk, values):
        self.saved[chunk.id] = values

    def publish_index(self, corpus_id, version):
        self.publish_count += 1


class SettingsForIndex:
    live_enabled = True
    gemini_api_key = "fixture-only"
    embedding_model = "gemini-embedding-2"


class BatchProvider:
    def __init__(self, fail_after=None):
        self.calls = []
        self.fail_after = fail_after

    def embed_documents(self, documents):
        self.calls.append(documents)
        if self.fail_after is not None and len(self.calls) == self.fail_after:
            request = httpx.Request("POST", "https://provider.invalid/embed")
            response = httpx.Response(429, request=request)
            raise httpx.HTTPStatusError("quota", request=request, response=response)
        return [[1.0] * 768 for _ in documents]


def test_failed_reservation_releases_prior_batch_reservations_without_provider_call():
    repository = IndexRepository()
    repository.fail_reserve_at = 2
    provider = BatchProvider()

    with pytest.raises(ArchiveProblem, match="fixture budget exhausted"):
        index_corpus(
            repository,
            SettingsForIndex(),
            "corpus",
            "version",
            provider=provider,
            batch_size=2,
        )

    assert provider.calls == []
    ledger = repository.db.connection_value.rows
    assert len(ledger) == 1
    row = next(iter(ledger.values()))
    assert row["actual_microusd"] == 0
    assert row["state"] == "released"
    assert row["usage"]["status"] == "no_provider_call"


def test_http_429_is_recorded_as_rejected_and_same_stable_id_can_be_retried():
    repository = IndexRepository()
    provider = BatchProvider(fail_after=1)

    with pytest.raises(httpx.HTTPStatusError):
        index_corpus(
            repository,
            SettingsForIndex(),
            "corpus",
            "version",
            provider=provider,
            batch_size=2,
        )

    rows = repository.db.connection_value.rows
    assert len(rows) == 2
    first_row_id, row = next(iter(rows.items()))
    assert row["actual_microusd"] == 0
    assert row["state"] == "rejected"
    assert row["usage"]["status"] == "provider_rejected_http_429"

    assert repository.reserve_operation("document_embedding", 0.01, first_row_id) == first_row_id
    retried = rows[first_row_id]
    assert retried["state"] == "reserved"
    assert retried["actual_microusd"] is None
    assert len(retried["usage"]["attempt_history"]) == 1
    assert retried["usage"]["attempt_history"][0]["usage"]["status"] == (
        "provider_rejected_http_429"
    )
    repository.settle(first_row_id, 0, {"status": "no_provider_call"})
    assert rows[first_row_id]["usage"]["attempt_history"]


def test_uncertain_attempt_stays_blocked_from_automatic_or_manual_retry():
    repository = IndexRepository()
    identifier = repository.reserve_operation("document_embedding", 0.01, "stable-chunk")
    repository.settle(identifier, None, {"status": "embedding_consumption_unknown"})

    with pytest.raises(ArchiveProblem, match="already attempted"):
        repository.reserve_operation("document_embedding", 0.01, identifier)


def test_resume_skips_completed_vectors_and_retries_only_unindexed_chunk():
    repository = IndexRepository()
    provider = BatchProvider(fail_after=2)

    with pytest.raises(httpx.HTTPStatusError):
        index_corpus(
            repository,
            SettingsForIndex(),
            "corpus",
            "version",
            provider=provider,
            batch_size=2,
        )

    assert set(repository.saved) == {"chunk-0", "chunk-1"}
    retry_provider = BatchProvider()
    result = index_corpus(
        repository,
        SettingsForIndex(),
        "corpus",
        "version",
        provider=retry_provider,
        batch_size=2,
    )
    assert result["indexed_chunks"] == 1
    assert retry_provider.calls == [[("source 2", "ch-1")]]
