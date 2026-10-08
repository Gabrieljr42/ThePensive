"""Versioned corpus, durable runs, task leases, and budget reservations."""

from alembic import op

revision = "0001_live_archive"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from pathlib import Path

    sql = Path(__file__).parents[1].joinpath("schema.sql").read_text(encoding="utf-8")
    for statement in sql.split(";"):
        if statement.strip():
            op.execute(statement)


def downgrade():
    raise RuntimeError("Restore a backup instead of destroying the archive's source history.")
