CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS experiment_snapshots (
    id text PRIMARY KEY,
    payload jsonb NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now()
);

