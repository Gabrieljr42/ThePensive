"""Private database backups and restoration checks into a new disposable test database."""

import argparse
import json
import os
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

from app.settings import Settings


def pg_command(program, database_url, container=None):
    binary = shutil.which(program)
    if binary and container is None:
        return [binary, "--dbname", database_url]
    info = conninfo_to_dict(database_url)
    return [
        "docker",
        "exec",
        "-i",
        container or "pensieve-db-1",
        program,
        "--username",
        info.get("user", "pensieve"),
        "--dbname",
        info["dbname"],
    ]


def backup(database_url, output: Path, container=None):
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".partial")
    command = pg_command("pg_dump", database_url, container) + ["--format=custom"]
    with temporary.open("wb") as file:
        result = subprocess.run(command, stdout=file, stderr=subprocess.PIPE, check=False)
    if result.returncode:
        raise RuntimeError(
            "Database backup failed. Check connectivity and PostgreSQL client version."
        )
    if temporary.stat().st_size < 5:
        raise RuntimeError("Database backup is empty.")
    temporary.replace(output)
    return {"path": str(output), "bytes": output.stat().st_size}


def restore_check(database_url, dump: Path, container=None):
    namespace = f"pensieve_restore_{uuid4().hex[:12]}_test"
    admin_dsn = make_conninfo(database_url, dbname="postgres")
    restored_dsn = make_conninfo(database_url, dbname=namespace)
    tables = [
        "corpus_versions",
        "source_units",
        "chunks",
        "live_runs",
        "usage_ledger",
        "experiment_snapshots",
    ]
    with psycopg.connect(database_url) as original:
        expected = {
            table: original.execute(
                sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))
            ).fetchone()[0]
            for table in tables
        }
    with psycopg.connect(admin_dsn, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(namespace)))
    try:
        command = pg_command("pg_restore", restored_dsn, container) + ["--exit-on-error"]
        with dump.open("rb") as file:
            result = subprocess.run(command, stdin=file, capture_output=True, check=False)
        if result.returncode:
            raise RuntimeError("Restoration failed. The original database was not changed.")
        with psycopg.connect(restored_dsn) as restored:
            actual = {
                table: restored.execute(
                    sql.SQL("SELECT count(*) FROM {}").format(sql.Identifier(table))
                ).fetchone()[0]
                for table in tables
            }
            for table in ("source_units", "chunks"):
                projection = (
                    "id,md5(record::text),md5(embedding::text)"
                    if table == "chunks"
                    else "id,md5(record::text)"
                )
                originals = restored.execute(
                    sql.SQL("SELECT {} FROM {} ORDER BY id").format(
                        sql.SQL(projection), sql.Identifier(table)
                    )
                ).fetchall()
                with psycopg.connect(database_url) as original:
                    compare = original.execute(
                        sql.SQL("SELECT {} FROM {} ORDER BY id").format(
                            sql.SQL(projection), sql.Identifier(table)
                        )
                    ).fetchall()
                if originals != compare:
                    raise RuntimeError("Restored source records differ from the original database.")
        if expected != actual:
            raise RuntimeError(
                "Restored record counts differ. Check whether the original database changed."
            )
        return {"restored": True, "counts": actual}
    finally:
        # Only the uniquely named database created by this check may be removed.
        assert namespace.startswith("pensieve_restore_") and namespace.endswith("_test")
        with psycopg.connect(admin_dsn, autocommit=True) as admin:
            admin.execute(sql.SQL("DROP DATABASE {}").format(sql.Identifier(namespace)))


def main():
    parser = argparse.ArgumentParser(description="Back up the private Pensieve database")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--container")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--retain", type=int, default=7)
    args = parser.parse_args()
    settings = Settings.from_env()
    if not settings.database_url:
        parser.error("DATABASE_URL is required.")
    directory = Path(os.getenv("PENSIEVE_BACKUP_DIR", str(settings.private_dir / "backups")))
    output = args.output or directory / f"pensieve-{datetime.now(UTC):%Y%m%d-%H%M%S}.dump"
    print(json.dumps(backup(settings.database_url, output, args.container)), flush=True)
    if args.verify:
        print(json.dumps(restore_check(settings.database_url, output, args.container)), flush=True)
    if args.retain > 0:
        target_directory = output.parent.resolve()
        backups = sorted(target_directory.glob("pensieve-*.dump"), reverse=True)
        for old in backups[args.retain :]:
            if old.resolve().parent == target_directory and not old.is_symlink():
                old.unlink()


if __name__ == "__main__":
    main()
