"""Transactional persistence for corpus, branch tasks, and metered public queries."""

import math
import re
import unicodedata
from datetime import datetime
from uuid import uuid4
from zoneinfo import ZoneInfo

from psycopg.types.json import Jsonb

from app.contracts import Branch, BranchStatus, Corpus, ExperimentRun, RunRequest
from app.corpus import Chunk, CorpusBundle, SourceUnit, digest
from app.db import Database
from app.errors import ArchiveProblem
from app.settings import Settings


def periods():
    local = datetime.now(ZoneInfo("America/Sao_Paulo"))
    return local.strftime("%Y-%m"), local.strftime("%Y-%m-%d")


def microdollars(amount: float) -> int:
    return math.ceil(amount * 1_000_000)


class LiveRepository:
    def __init__(self, db: Database, settings: Settings):
        self.db, self.settings = db, settings

    def import_bundle(self, bundle: CorpusBundle):
        from app.pipelines.ingestion import validate_bundle

        validate_bundle(bundle)
        metadata = bundle.model_dump(exclude={"corpus", "units", "chunks"})
        with self.db.connection() as connection:
            existing = connection.execute(
                "SELECT file_hash FROM corpus_versions WHERE id=%s AND version=%s",
                (bundle.corpus.id, bundle.corpus.version),
            ).fetchone()
            if existing:
                if existing["file_hash"] != bundle.file_hash:
                    raise ValueError("The immutable corpus version has a different file hash.")
                return
            connection.execute(
                "INSERT INTO corpus_versions(id,version,manifest,file_hash,metadata) "
                "VALUES (%s,%s,%s,%s,%s)",
                (
                    bundle.corpus.id,
                    bundle.corpus.version,
                    Jsonb(bundle.corpus.model_dump()),
                    bundle.file_hash,
                    Jsonb(metadata),
                ),
            )
            with connection.cursor() as cursor:
                cursor.executemany(
                    "INSERT INTO source_units(id,corpus_id,corpus_version,book_id,chapter_id,"
                    "source_order,record) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                    [
                        (
                            unit.source.id,
                            unit.source.corpus_id,
                            unit.source.corpus_version,
                            unit.source.book_id,
                            unit.source.chapter_id,
                            unit.order,
                            Jsonb(unit.model_dump()),
                        )
                        for unit in bundle.units
                    ],
                )
                cursor.executemany(
                    "INSERT INTO chunks(id,corpus_id,corpus_version,book_id,chapter_id,"
                    "chunk_order,text_content,embedding,record) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s::vector,%s)",
                    [
                        (
                            chunk.id,
                            chunk.corpus_id,
                            chunk.corpus_version,
                            chunk.book_id,
                            chunk.chapter_id,
                            chunk.order,
                            chunk.text,
                            str(chunk.embedding) if chunk.embedding else None,
                            Jsonb(chunk.model_dump(exclude={"embedding"})),
                        )
                        for chunk in bundle.chunks
                    ],
                )

    def corpora(self) -> list[Corpus]:
        with self.db.connection() as connection:
            rows = connection.execute(
                "SELECT manifest FROM corpus_versions ORDER BY created_at DESC"
            ).fetchall()
        return [Corpus.model_validate(row["manifest"]) for row in rows]

    def corpus(self, corpus_id: str, version: str) -> Corpus:
        with self.db.connection() as connection:
            row = connection.execute(
                "SELECT manifest FROM corpus_versions WHERE id=%s AND version=%s",
                (corpus_id, version),
            ).fetchone()
        if not row:
            raise ArchiveProblem("corpus_not_found", "The selected corpus version is unavailable.")
        return Corpus.model_validate(row["manifest"])

    def units(self, request: RunRequest, chapters: list[str], source_ids=None) -> list[SourceUnit]:
        with self.db.connection() as connection:
            rows = connection.execute(
                "SELECT record FROM source_units WHERE corpus_id=%s AND corpus_version=%s "
                "AND chapter_id=ANY(%s) "
                + ("AND id=ANY(%s) " if source_ids is not None else "")
                + "ORDER BY source_order",
                (request.corpus_id, request.corpus_version, chapters)
                + ((source_ids,) if source_ids is not None else ()),
            ).fetchall()
        return [SourceUnit.model_validate(row["record"]) for row in rows]

    def chunks(self, corpus_id: str, version: str, missing_only=False) -> list[Chunk]:
        with self.db.connection() as connection:
            rows = connection.execute(
                "SELECT record FROM chunks WHERE corpus_id=%s AND corpus_version=%s "
                + ("AND embedding IS NULL " if missing_only else "")
                + "ORDER BY chunk_order",
                (corpus_id, version),
            ).fetchall()
        return [Chunk.model_validate(row["record"]) for row in rows]

    def save_embedding(self, chunk: Chunk, values: list[float]):
        if len(values) != 768 or not all(math.isfinite(v) for v in values):
            raise ValueError("The embedding must contain 768 finite values.")
        with self.db.connection() as connection:
            connection.execute(
                "UPDATE chunks SET embedding=%s::vector WHERE id=%s", (str(values), chunk.id)
            )

    def publish_index(self, corpus_id: str, version: str):
        corpus = self.corpus(corpus_id, version)
        with self.db.connection() as connection:
            missing = connection.execute(
                "SELECT DISTINCT chapter_id FROM chunks WHERE corpus_id=%s AND corpus_version=%s "
                "AND embedding IS NULL",
                (corpus_id, version),
            ).fetchall()
            pending = {row["chapter_id"] for row in missing}
            for book in corpus.books:
                for chapter in book.chapters:
                    chapter.indexed = chapter.source_count > 0 and chapter.id not in pending
            corpus.indexed = not pending
            connection.execute(
                "UPDATE corpus_versions SET manifest=%s WHERE id=%s AND version=%s",
                (Jsonb(corpus.model_dump()), corpus_id, version),
            )

    def retrieve(self, request: RunRequest, chapters: list[str], vector: list[float]):
        query = "".join(
            c
            for c in unicodedata.normalize("NFKD", request.question.casefold())
            if not unicodedata.combining(c)
        )
        focus_final = bool(re.search(r"\b(final|finais|desfecho|desfechos|climax)\b", query))
        focused = {}
        if focus_final:
            corpus = self.corpus(request.corpus_id, request.corpus_version)
            for book in corpus.books:
                imported = [chapter for chapter in book.chapters if chapter.source_count]
                # Apply chronology only to a complete selected book, never pretend
                # that the end of a partial import is the ending of the original book.
                if (
                    imported
                    and len(imported) == len(book.chapters)
                    and all(chapter.id in chapters for chapter in imported)
                ):
                    focused[book.id] = [chapter.id for chapter in imported[-2:]]
        channels = []
        with self.db.connection() as connection:
            # Give each selected book a candidate pool; a dense match in one volume
            # must not hide every passage from another volume in a synthesis query.
            for book_id in request.book_ids or [None]:
                search_chapters = focused.get(book_id, chapters)
                base = (request.corpus_id, request.corpus_version, search_chapters)
                book_filter = "AND book_id=%s " if book_id else ""
                book_parameter = (book_id,) if book_id else ()
                lexical = connection.execute(
                    "SELECT record,ts_rank_cd(lexical,websearch_to_tsquery('english',%s)) AS score "
                    "FROM chunks WHERE corpus_id=%s AND corpus_version=%s AND chapter_id=ANY(%s) "
                    + book_filter
                    + "AND lexical @@ websearch_to_tsquery('english',%s) "
                    "ORDER BY score DESC,id LIMIT 12",
                    (request.question, *base, *book_parameter, request.question),
                ).fetchall()
                semantic = connection.execute(
                    "SELECT record,1-(embedding <=> %s::vector) AS score FROM chunks "
                    "WHERE corpus_id=%s AND corpus_version=%s AND chapter_id=ANY(%s) "
                    + book_filter
                    + "AND embedding IS NOT NULL "
                    "ORDER BY embedding <=> %s::vector,id LIMIT 12",
                    (str(vector), *base, *book_parameter, str(vector)),
                ).fetchall()
                channels.extend((("lexical", lexical), ("semantic", semantic)))
        ranked = {}
        for channel, rows in channels:
            for rank, row in enumerate(rows, 1):
                chunk = Chunk.model_validate(row["record"])
                entry = ranked.setdefault(
                    chunk.id,
                    {
                        "chunk": chunk,
                        "fusion": 0,
                        "similarity": None,
                        "temporal_focus": chunk.book_id in focused,
                    },
                )
                entry["fusion"] += 1 / (60 + rank)
                if channel == "semantic":
                    entry["similarity"] = float(row["score"])
        candidates = sorted(ranked.values(), key=lambda e: (-e["fusion"], e["chunk"].id))
        groups = {}
        for entry in candidates:
            groups.setdefault(entry["chunk"].book_id, []).append(entry)
        seeds = []
        seed_limit = (
            len(candidates)
            if focused and len(groups) > 1
            else min(18, 6 * len(groups))
            if len(groups) > 1
            else 4
        )
        for position in range(seed_limit):
            for group in groups.values():
                if len(seeds) < seed_limit and position < len(group):
                    seeds.append(group[position])
        # Prioritize independent matches before filling remaining space with neighbours.
        # Interleaving neighbours too early can crowd out another book's crucial scene.
        expanded = list(seeds)
        seen = {entry["chunk"].id for entry in seeds}
        with self.db.connection() as connection:
            for seed in seeds:
                chunk = seed["chunk"]
                neighbours = connection.execute(
                    "SELECT record FROM chunks WHERE corpus_id=%s AND corpus_version=%s "
                    "AND chapter_id=%s AND book_id=%s AND chunk_order=%s "
                    "ORDER BY chunk_order",
                    (
                        request.corpus_id,
                        request.corpus_version,
                        chunk.chapter_id,
                        chunk.book_id,
                        chunk.order + 1,
                    ),
                ).fetchall()
                entries = [
                    ranked.get(
                        row["record"]["id"],
                        {
                            "chunk": Chunk.model_validate(row["record"]),
                            "fusion": seed["fusion"] / 2,
                            "similarity": None,
                            "temporal_focus": seed.get("temporal_focus", False),
                        },
                    )
                    for row in neighbours
                ]
                for entry in entries:
                    if entry["chunk"].id not in seen:
                        expanded.append(entry)
                        seen.add(entry["chunk"].id)
        return expanded + [entry for entry in candidates if entry["chunk"].id not in seen]

    def budget_used(self, connection, month: str, day: str | None = None):
        row = connection.execute(
            "SELECT COALESCE(sum(COALESCE(actual_microusd,reserved_microusd)),0) AS used "
            "FROM usage_ledger WHERE month_key=%s "
            + ("AND day_key=%s AND public=true" if day else ""),
            (month, day) if day else (month,),
        ).fetchone()
        return int(row["used"])

    def available_budget(self):
        month, _ = periods()
        with self.db.connection() as connection:
            return max(
                0,
                self.settings.monthly_budget_usd - self.budget_used(connection, month) / 1_000_000,
            )

    def reserve(self, connection, amount: int, public: bool):
        # One transactional lock serializes reservations across API, workers, and ingestion.
        connection.execute("SELECT pg_advisory_xact_lock(736512)")
        month, day = periods()
        if self.budget_used(connection, month) + amount > microdollars(
            self.settings.monthly_budget_usd
        ):
            raise ArchiveProblem(
                "budget_exhausted", "The archive's monthly API budget is used.", 429
            )
        if public and self.budget_used(connection, month, day) + amount > microdollars(
            self.settings.public_daily_budget_usd
        ):
            raise ArchiveProblem("daily_budget_exhausted", "Today's API budget is used.", 429)
        return month, day

    def reserve_operation(self, operation: str, amount: float, reference: str | None = None) -> str:
        identifier = reference or str(uuid4())
        with self.db.connection() as connection:
            # Serialize by the same lock used for budget accounting before inspecting
            # a stable operation ID, so concurrent resumptions cannot both reactivate it.
            connection.execute("SELECT pg_advisory_xact_lock(736512)")
            existing = (
                connection.execute(
                    "SELECT operation,month_key,day_key,reserved_microusd,actual_microusd,"
                    "state,usage FROM usage_ledger WHERE id=%s FOR UPDATE",
                    (reference,),
                ).fetchone()
                if reference
                else None
            )
            if existing:
                prior_usage = existing["usage"] or {}
                prior_status = prior_usage.get("status")
                if existing["operation"] != operation or prior_status not in {
                    "no_provider_call",
                    "provider_rejected_http_429",
                }:
                    raise ArchiveProblem(
                        "operation_already_attempted",
                        "This embedding was already attempted. Inspect its usage record.",
                        409,
                    )
                history = list(prior_usage.get("attempt_history", []))
                history.append(
                    {
                        "month_key": existing["month_key"],
                        "day_key": existing["day_key"],
                        "reserved_microusd": existing["reserved_microusd"],
                        "actual_microusd": existing["actual_microusd"],
                        "state": existing["state"],
                        "usage": {
                            key: value
                            for key, value in prior_usage.items()
                            if key != "attempt_history"
                        },
                    }
                )
                month, day = self.reserve(connection, microdollars(amount), False)
                connection.execute(
                    "UPDATE usage_ledger SET month_key=%s,day_key=%s,reserved_microusd=%s,"
                    "actual_microusd=NULL,state='reserved',usage=%s WHERE id=%s",
                    (
                        month,
                        day,
                        microdollars(amount),
                        Jsonb({"attempt_history": history}),
                        identifier,
                    ),
                )
                return identifier

            month, day = self.reserve(connection, microdollars(amount), False)
            connection.execute(
                "INSERT INTO usage_ledger(id,operation,month_key,day_key,public,reserved_microusd) "
                "VALUES (%s,%s,%s,%s,false,%s)",
                (identifier, operation, month, day, microdollars(amount)),
            )
        return identifier

    def settle(self, ledger_id: str, actual: float | None, usage: dict):
        if usage.get("status") == "provider_rejected_http_429":
            state = "rejected"
        elif usage.get("status") == "no_provider_call":
            state = "released"
        elif actual is None:
            state = "unknown"
        else:
            state = "estimated" if usage.get("basis") == "utf8_byte_upper_bound" else "reported"
        with self.db.connection() as connection:
            connection.execute(
                "UPDATE usage_ledger SET actual_microusd=%s,usage=CASE "
                "WHEN usage ? 'attempt_history' THEN "
                "jsonb_build_object('attempt_history',usage->'attempt_history') || %s "
                "ELSE %s END,state=%s WHERE id=%s",
                (
                    microdollars(actual) if actual is not None else None,
                    Jsonb(usage),
                    Jsonb(usage),
                    state,
                    ledger_id,
                ),
            )

    def create_run(
        self,
        run: ExperimentRun,
        request: RunRequest,
        owner: str,
        ip_hash: str,
        reservations: dict[str, float],
        preflight_ms: int = 0,
    ) -> ExperimentRun:
        key = request.idempotency_key or str(uuid4())
        request_hash = digest(request.model_dump(exclude={"idempotency_key"}))
        with self.db.connection() as connection:
            connection.execute("SELECT pg_advisory_xact_lock(736512)")
            existing = connection.execute(
                "SELECT request_hash,payload FROM live_runs WHERE owner_id=%s AND "
                "idempotency_key=%s",
                (owner, key),
            ).fetchone()
            if existing:
                if existing["request_hash"] != request_hash:
                    raise ArchiveProblem(
                        "idempotency_conflict", "This request key was already used.", 409
                    )
                return ExperimentRun.model_validate(existing["payload"])
            if self.settings.public_mode:
                _, day = periods()
                count = connection.execute(
                    "SELECT count(*) AS count FROM live_runs WHERE (owner_id=%s OR ip_hash=%s) "
                    "AND (created_at AT TIME ZONE 'America/Sao_Paulo')::date=%s::date",
                    (owner, ip_hash, day),
                ).fetchone()["count"]
                if count >= self.settings.public_daily_queries:
                    raise ArchiveProblem("query_quota", "Your daily query allowance is used.", 429)
                active = connection.execute(
                    "SELECT 1 FROM live_runs WHERE (owner_id=%s OR ip_hash=%s) "
                    "AND payload->>'status'='running'",
                    (owner, ip_hash),
                ).fetchone()
                if active:
                    raise ArchiveProblem("query_active", "You already have an active inquiry.", 429)
            amount = sum(microdollars(cost) for cost in reservations.values())
            month, day = self.reserve(connection, amount, self.settings.public_mode)
            connection.execute(
                "INSERT INTO "
                "live_runs(id,owner_id,ip_hash,idempotency_key,request_hash,request,payload) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (
                    run.id,
                    owner,
                    ip_hash,
                    key,
                    request_hash,
                    Jsonb(request.model_dump()),
                    Jsonb(run.model_dump(mode="json")),
                ),
            )
            connection.execute(
                "INSERT INTO stage_events(run_id,stage,elapsed_ms) "
                "VALUES (%s,'shared_preflight',%s)",
                (run.id, preflight_ms),
            )
            for branch in run.branches:
                task_id = str(uuid4())
                connection.execute(
                    "INSERT INTO tasks(id,run_id,branch_id,method) VALUES (%s,%s,%s,%s)",
                    (task_id, run.id, branch.id, branch.method.value),
                )
                connection.execute(
                    "INSERT INTO usage_ledger(id,run_id,task_id,operation,month_key,day_key,public,"
                    "reserved_microusd) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                    (
                        task_id,
                        run.id,
                        task_id,
                        branch.method.value,
                        month,
                        day,
                        self.settings.public_mode,
                        microdollars(reservations[branch.method.value]),
                    ),
                )
        return run

    def get_run(self, run_id: str, owner: str | None = None):
        with self.db.connection() as connection:
            row = connection.execute(
                "SELECT payload FROM live_runs WHERE id=%s " + ("AND owner_id=%s" if owner else ""),
                (run_id, owner) if owner else (run_id,),
            ).fetchone()
        return ExperimentRun.model_validate(row["payload"]) if row else None

    def update_branch(self, task_id: str, branch: Branch, sources=None, elapsed=0, context=None):
        with self.db.connection() as connection:
            task = connection.execute("SELECT * FROM tasks WHERE id=%s", (task_id,)).fetchone()
            row = connection.execute(
                "SELECT payload FROM live_runs WHERE id=%s FOR UPDATE", (task["run_id"],)
            ).fetchone()
            run = ExperimentRun.model_validate(row["payload"])
            current = next(item for item in run.branches if item.id == branch.id)
            if current.status in ("complete", "failed", "cancelled"):
                return False
            run.branches = [branch if item.id == branch.id else item for item in run.branches]
            if sources:
                existing = {source.id: source for source in run.sources}
                existing.update({source.id: source for source in sources})
                run.sources = list(existing.values())
            statuses = {item.status for item in run.branches}
            terminal = statuses <= {"complete", "failed", "cancelled"}
            if terminal:
                run.status = (
                    "complete"
                    if "complete" in statuses
                    else ("cancelled" if "cancelled" in statuses else "failed")
                )
            connection.execute(
                "UPDATE live_runs SET payload=%s WHERE id=%s",
                (Jsonb(run.model_dump(mode="json")), run.id),
            )
            connection.execute(
                "INSERT INTO stage_events(run_id,task_id,stage,elapsed_ms) VALUES (%s,%s,%s,%s)",
                (run.id, task_id, str(branch.status), elapsed),
            )
            if context:
                connection.execute(
                    "UPDATE tasks SET context=%s WHERE id=%s", (Jsonb(context), task_id)
                )
            if branch.status in ("complete", "failed", "cancelled"):
                connection.execute(
                    "UPDATE tasks SET state=%s,attempt=COALESCE(attempt,'{}'::jsonb) || "
                    "jsonb_build_object('branch',%s::jsonb),finished_at=now() WHERE id=%s",
                    (str(branch.status), Jsonb(branch.model_dump(mode="json")), task_id),
                )
        return True

    def cancel(self, run_id: str, owner: str):
        with self.db.connection() as connection:
            row = connection.execute(
                "SELECT payload FROM live_runs WHERE id=%s AND owner_id=%s FOR UPDATE",
                (run_id, owner),
            ).fetchone()
            if not row:
                return None
            run = ExperimentRun.model_validate(row["payload"])
            if run.status != "running":
                return run
            for branch in run.branches:
                if branch.status not in ("complete", "failed", "cancelled"):
                    branch.status = BranchStatus.CANCELLED
                    branch.claims = []
            run.status = "cancelled"
            connection.execute(
                "UPDATE live_runs SET payload=%s WHERE id=%s",
                (Jsonb(run.model_dump(mode="json")), run.id),
            )
            connection.execute(
                "UPDATE usage_ledger SET actual_microusd=0,state='released' WHERE task_id IN "
                "(SELECT id FROM tasks WHERE run_id=%s AND NOT call_started) AND state='reserved'",
                (run_id,),
            )
            connection.execute(
                "UPDATE tasks SET state='cancelled',finished_at=now() WHERE run_id=%s "
                "AND state IN ('queued','working')",
                (run_id,),
            )
        return run

    def claim_task(self, worker_id: str):
        with self.db.connection() as connection:
            connection.execute("SELECT pg_advisory_xact_lock(736513)")
            active = connection.execute(
                "SELECT count(*) AS count FROM tasks WHERE state='working' AND lease_until>now()"
            ).fetchone()["count"]
            if active >= 2:
                return None
            task = connection.execute(
                "SELECT * FROM tasks WHERE state='queued' ORDER BY created_at,method DESC,id "
                "FOR UPDATE SKIP LOCKED LIMIT 1"
            ).fetchone()
            if not task:
                return None
            connection.execute(
                "UPDATE tasks SET state='working',worker_id=%s,lease_until=now()+%s*interval "
                "'1 second' "
                "WHERE id=%s",
                (worker_id, self.settings.lease_seconds, task["id"]),
            )
            row = connection.execute(
                "SELECT request,payload, "
                "GREATEST(0,extract(epoch FROM (now()-created_at))*1000)::integer "
                "AS queue_wait_ms, "
                "COALESCE((SELECT elapsed_ms FROM stage_events WHERE run_id=live_runs.id "
                "AND task_id IS NULL AND stage='shared_preflight' LIMIT 1),0) AS preflight_ms "
                "FROM live_runs WHERE id=%s",
                (task["run_id"],),
            ).fetchone()
        return {**task, **row}

    def heartbeat(self, worker_id: str, task_ids: list[str] | None = None):
        with self.db.connection() as connection:
            connection.execute(
                "INSERT INTO worker_heartbeats(id,seen_at) VALUES (%s,now()) "
                "ON CONFLICT(id) DO UPDATE SET seen_at=now()",
                (worker_id,),
            )
            connection.execute(
                "UPDATE tasks SET lease_until=now()+%s*interval '1 second' "
                "WHERE worker_id=%s AND state='working' AND id=ANY(%s)",
                (self.settings.lease_seconds, worker_id, task_ids or []),
            )

    def start_call(self, task_id: str):
        with self.db.connection() as connection:
            task = connection.execute("SELECT run_id FROM tasks WHERE id=%s", (task_id,)).fetchone()
            run = connection.execute(
                "SELECT payload FROM live_runs WHERE id=%s FOR UPDATE", (task["run_id"],)
            ).fetchone()
            if run["payload"]["status"] != "running":
                return False
            return (
                connection.execute(
                    "UPDATE tasks SET call_started=true WHERE id=%s AND state='working' "
                    "RETURNING id",
                    (task_id,),
                ).fetchone()
                is not None
            )

    def save_receipt(self, task_id, receipt, stage="primary", metadata=None):
        from dataclasses import asdict

        if stage not in {"primary", "source_review"}:
            raise ValueError("Unknown provider receipt stage.")
        with self.db.connection() as connection:
            payload = {stage: asdict(receipt)}
            if metadata:
                payload["generation_metadata"] = metadata
            connection.execute(
                "UPDATE tasks SET attempt=COALESCE(attempt,'{}'::jsonb) || %s WHERE id=%s",
                (Jsonb(payload), task_id),
            )

    def recover_expired(self):
        with self.db.connection() as connection:
            rows = connection.execute(
                "SELECT id,run_id,branch_id,call_started FROM tasks "
                "WHERE state='working' AND lease_until<now() FOR UPDATE SKIP LOCKED"
            ).fetchall()
            for task in rows:
                if not task["call_started"]:
                    connection.execute(
                        "UPDATE tasks SET state='queued',worker_id=NULL WHERE id=%s", (task["id"],)
                    )
        for task in rows:
            if task["call_started"]:
                run = self.get_run(task["run_id"])
                branch = next(item for item in run.branches if item.id == task["branch_id"])
                branch.status, branch.error_code = BranchStatus.FAILED, "provider_interrupted"
                branch.error = "The server restarted during a provider call. Start a new inquiry."
                self.update_branch(task["id"], branch)

    def readiness(self):
        with self.db.connection() as connection:
            connection.execute("SELECT 1 FROM live_runs LIMIT 1")
            recent = connection.execute(
                "SELECT 1 FROM worker_heartbeats WHERE seen_at>now()-interval '45 seconds' LIMIT 1"
            ).fetchone()
        return {"database": True, "worker": bool(recent)}

    def export_bundle(self, corpus_id: str, version: str):
        corpus = self.corpus(corpus_id, version)
        chapters = [ch.id for book in corpus.books for ch in book.chapters if ch.source_count]
        request = RunRequest(question="Export corpus", corpus_id=corpus_id, corpus_version=version)
        with self.db.connection() as connection:
            row = connection.execute(
                "SELECT metadata FROM corpus_versions WHERE id=%s AND version=%s",
                (corpus_id, version),
            ).fetchone()
            rows = connection.execute(
                "SELECT record,embedding::text AS vector FROM chunks "
                "WHERE corpus_id=%s AND corpus_version=%s ORDER BY chunk_order",
                (corpus_id, version),
            ).fetchall()
        import json

        chunks = [
            Chunk.model_validate(
                {**row["record"], "embedding": json.loads(row["vector"]) if row["vector"] else None}
            )
            for row in rows
        ]
        return CorpusBundle(
            corpus=corpus, units=self.units(request, chapters), chunks=chunks, **row["metadata"]
        )
