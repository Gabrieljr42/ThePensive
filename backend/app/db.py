"""One bounded pool per process; all SQL parameters are bound by psycopg."""

from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


class Database:
    def __init__(self, dsn: str):
        self.pool = ConnectionPool(
            dsn,
            min_size=1,
            max_size=5,
            open=False,
            kwargs={"row_factory": dict_row, "connect_timeout": 10},
            timeout=10,
        )

    @contextmanager
    def connection(self):
        if self.pool.closed:
            self.pool.open(wait=True, timeout=10)
        with self.pool.connection() as connection:
            yield connection

    def close(self):
        self.pool.close()
