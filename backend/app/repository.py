"""The mock slice stores immutable run snapshots; generation can replace its service."""

import os
from typing import Protocol

from app.contracts import ExperimentRun


class RunRepository(Protocol):
    def save(self, run: ExperimentRun) -> None: ...
    def get(self, run_id: str) -> ExperimentRun | None: ...


class MemoryRunRepository:
    def __init__(self) -> None:
        self.runs: dict[str, ExperimentRun] = {}

    def save(self, run: ExperimentRun) -> None:
        if len(self.runs) >= 128 and run.id not in self.runs:
            del self.runs[next(iter(self.runs))]
        self.runs[run.id] = run.model_copy(deep=True)

    def get(self, run_id: str) -> ExperimentRun | None:
        run = self.runs.get(run_id)
        return run.model_copy(deep=True) if run else None


class PostgresRunRepository:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn

    def save(self, run: ExperimentRun) -> None:
        import psycopg
        from psycopg.types.json import Jsonb

        with psycopg.connect(self.dsn) as connection:
            connection.execute(
                "INSERT INTO experiment_snapshots (id, payload) VALUES (%s, %s) "
                "ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload",
                (run.id, Jsonb(run.model_dump(mode="json"))),
            )

    def get(self, run_id: str) -> ExperimentRun | None:
        import psycopg

        with psycopg.connect(self.dsn) as connection:
            row = connection.execute(
                "SELECT payload FROM experiment_snapshots WHERE id = %s", (run_id,)
            ).fetchone()
        return ExperimentRun.model_validate(row[0]) if row else None


def create_repository() -> RunRepository:
    dsn = os.environ.get("DATABASE_URL")
    return PostgresRunRepository(dsn) if dsn else MemoryRunRepository()
