CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS experiment_snapshots (
    id text PRIMARY KEY, payload jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE corpus_versions (
    id text NOT NULL, version text NOT NULL, manifest jsonb NOT NULL,
    file_hash text NOT NULL, metadata jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(id,version)
);
CREATE TABLE source_units (
    id text PRIMARY KEY, corpus_id text NOT NULL, corpus_version text NOT NULL,
    book_id text NOT NULL, chapter_id text NOT NULL, source_order integer NOT NULL,
    record jsonb NOT NULL,
    FOREIGN KEY(corpus_id,corpus_version) REFERENCES corpus_versions(id,version)
);
CREATE INDEX source_scope ON source_units(corpus_id,corpus_version,chapter_id,source_order);
CREATE TABLE chunks (
    id text PRIMARY KEY, corpus_id text NOT NULL, corpus_version text NOT NULL,
    book_id text NOT NULL, chapter_id text NOT NULL, chunk_order integer NOT NULL,
    text_content text NOT NULL, lexical tsvector GENERATED ALWAYS AS
    (to_tsvector('english', text_content)) STORED,
    embedding vector(768), record jsonb NOT NULL,
    FOREIGN KEY(corpus_id,corpus_version) REFERENCES corpus_versions(id,version)
);
CREATE INDEX chunk_scope ON chunks(corpus_id,corpus_version,chapter_id);
CREATE INDEX chunk_lexical ON chunks USING gin(lexical);
CREATE TABLE live_runs (
    id text PRIMARY KEY, owner_id text NOT NULL, ip_hash text NOT NULL,
    idempotency_key text NOT NULL, request_hash text NOT NULL, request jsonb NOT NULL,
    payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(owner_id,idempotency_key)
);
CREATE INDEX run_visitor ON live_runs(owner_id,created_at);
CREATE TABLE tasks (
    id text PRIMARY KEY, run_id text NOT NULL REFERENCES live_runs(id),
    branch_id text NOT NULL, method text NOT NULL, state text NOT NULL DEFAULT 'queued',
    lease_until timestamptz, worker_id text, call_started boolean NOT NULL DEFAULT false,
    context jsonb, attempt jsonb, created_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz, UNIQUE(run_id,branch_id)
);
CREATE INDEX task_queue ON tasks(state,created_at);
CREATE TABLE usage_ledger (
    id text PRIMARY KEY, run_id text REFERENCES live_runs(id), task_id text REFERENCES tasks(id),
    operation text NOT NULL, month_key text NOT NULL, day_key text NOT NULL,
    public boolean NOT NULL, reserved_microusd bigint NOT NULL CHECK(reserved_microusd>=0),
    actual_microusd bigint CHECK(actual_microusd>=0), usage jsonb,
    state text NOT NULL DEFAULT 'reserved', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ledger_period ON usage_ledger(month_key,day_key);
CREATE TABLE stage_events (
    sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id text REFERENCES live_runs(id), task_id text REFERENCES tasks(id),
    stage text NOT NULL, elapsed_ms integer NOT NULL, details jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE worker_heartbeats (id text PRIMARY KEY, seen_at timestamptz NOT NULL);
