from alembic import context
from sqlalchemy import create_engine, pool

from app.settings import Settings

url = Settings.from_env().database_url
if not url:
    raise RuntimeError("DATABASE_URL is required to run migrations.")
url = url.replace("postgresql://", "postgresql+psycopg://", 1)
engine = create_engine(url, poolclass=pool.NullPool)
with engine.connect() as connection:
    context.configure(connection=connection)
    with context.begin_transaction():
        context.run_migrations()
