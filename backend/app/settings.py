"""Server-owned settings. Secrets are never included in contracts or logs."""

import os
import secrets
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")


def local_session_secret(directory: Path) -> str:
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / "session-secret"
    try:
        with path.open("x", encoding="utf-8") as file:
            file.write(secrets.token_hex(32))
    except FileExistsError:
        pass
    return path.read_text(encoding="utf-8").strip()


@dataclass(frozen=True)
class Settings:
    database_url: str = ""
    gemini_api_key: str = ""
    live_enabled: bool = False
    public_mode: bool = False
    proxy_key: str = ""
    session_secret: str = ""
    model: str = "gemini-3.1-flash-lite"
    embedding_model: str = "gemini-embedding-2"
    embedding_dimensions: int = 768
    output_limit: int = 2048
    monthly_budget_usd: float = 5.0
    public_daily_budget_usd: float = 0.15
    public_run_budget_usd: float = 0.03
    local_run_budget_usd: float = 0.25
    public_daily_queries: int = 3
    public_context_tokens: int = 30000
    public_chapter_limit: int = 3
    provider_timeout_seconds: int = 120
    lease_seconds: int = 180
    private_dir: Path = ROOT / "data" / "private"

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            database_url=os.getenv("DATABASE_URL", ""),
            gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
            live_enabled=os.getenv("PENSIEVE_LIVE_ENABLED", "false").lower() == "true",
            public_mode=os.getenv("PENSIEVE_PUBLIC_MODE", "false").lower() == "true",
            proxy_key=os.getenv("PENSIEVE_PROXY_KEY", ""),
            session_secret=os.getenv("PENSIEVE_SESSION_SECRET", ""),
            model=os.getenv("GEMINI_MODEL", cls.model),
            embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", cls.embedding_model),
            monthly_budget_usd=float(os.getenv("PENSIEVE_MONTHLY_BUDGET_USD", "5")),
            private_dir=Path(os.getenv("PENSIEVE_PRIVATE_DIR", str(cls.private_dir))),
        )

    def validate(self) -> None:
        if self.live_enabled and not (self.database_url and self.gemini_api_key):
            raise ValueError("Live mode requires DATABASE_URL and GEMINI_API_KEY.")
        if self.public_mode and not (self.proxy_key and self.session_secret):
            raise ValueError("Public mode requires proxy and session secrets.")
        if self.monthly_budget_usd <= 0:
            raise ValueError("The monthly budget must be positive.")
