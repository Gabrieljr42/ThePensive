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
    model: str = "gemini-3.8-flash"
    full_context_model: str = "gemini-3.1-flash-lite"
    embedding_model: str = "gemini-embedding-2"
    embedding_dimensions: int = 768
    output_limit: int = 2048
    monthly_budget_usd: float = 50.0
    public_daily_budget_usd: float = 0.0
    public_run_budget_usd: float = 0.25
    local_run_budget_usd: float = 0.50
    public_daily_queries: int = 0
    public_context_tokens: int = 240000
    public_chapter_limit: int = 30
    full_context_token_limit: int = 240000
    provider_timeout_seconds: int = 120
    lease_seconds: int = 180
    private_dir: Path = ROOT / "data" / "private"

    @classmethod
    def from_env(cls) -> "Settings":
        model = os.getenv("GEMINI_MODEL", cls.model)
        full_context_model = os.getenv("GEMINI_FULL_CONTEXT_MODEL", cls.full_context_model)
        is_38 = model == "gemini-3.8-flash"
        default_daily = "0.0"
        default_run = "0.25" if is_38 else "0.03"
        default_local = "0.50" if is_38 else "0.25"
        return cls(
            database_url=os.getenv("DATABASE_URL", ""),
            gemini_api_key=os.getenv("GEMINI_API_KEY", ""),
            live_enabled=os.getenv("PENSIEVE_LIVE_ENABLED", "false").lower() == "true",
            public_mode=os.getenv("PENSIEVE_PUBLIC_MODE", "false").lower() == "true",
            proxy_key=os.getenv("PENSIEVE_PROXY_KEY", ""),
            session_secret=os.getenv("PENSIEVE_SESSION_SECRET", ""),
            model=model,
            full_context_model=full_context_model,
            embedding_model=os.getenv("GEMINI_EMBEDDING_MODEL", cls.embedding_model),
            monthly_budget_usd=float(os.getenv("PENSIEVE_MONTHLY_BUDGET_USD", "50")),
            public_daily_budget_usd=float(
                os.getenv("PENSIEVE_PUBLIC_DAILY_BUDGET_USD", default_daily)
            ),
            public_run_budget_usd=float(
                os.getenv("PENSIEVE_PUBLIC_RUN_BUDGET_USD", default_run)
            ),
            local_run_budget_usd=float(
                os.getenv("PENSIEVE_LOCAL_RUN_BUDGET_USD", default_local)
            ),
            public_daily_queries=int(os.getenv("PENSIEVE_PUBLIC_DAILY_QUERIES", "0")),
            public_context_tokens=int(os.getenv("PENSIEVE_PUBLIC_CONTEXT_TOKENS", "240000")),
            public_chapter_limit=int(os.getenv("PENSIEVE_PUBLIC_CHAPTER_LIMIT", "30")),
            full_context_token_limit=int(os.getenv("PENSIEVE_FULL_CONTEXT_TOKEN_LIMIT", "240000")),
            private_dir=Path(os.getenv("PENSIEVE_PRIVATE_DIR", str(cls.private_dir))),
        )

    def validate(self) -> None:
        if self.live_enabled and not (self.database_url and self.gemini_api_key):
            raise ValueError("Live mode requires DATABASE_URL and GEMINI_API_KEY.")
        if self.public_mode and not (self.proxy_key and self.session_secret):
            raise ValueError("Public mode requires proxy and session secrets.")
        if self.monthly_budget_usd <= 0:
            raise ValueError("The monthly budget must be positive.")
        if self.full_context_token_limit < 0:
            raise ValueError("The Full Context token limit must be nonnegative.")
