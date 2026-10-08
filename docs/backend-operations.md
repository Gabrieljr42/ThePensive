# Pensieve backend operations

## Runtime

FastAPI owns the corpus, retrieval, generation, citation validation, and usage ledger. A separate
Python worker leases at most two branches globally from PostgreSQL. The browser polls persisted
snapshots, so provider execution survives a disconnected browser. Explicit cancellation stops
further work and hides unfinished answers. A request already sent to Gemini may still be billed;
unknown usage keeps its financial reservation.

The Next.js server forwards the anonymous session cookie and the configured proxy secret. The
browser never receives that secret or the Gemini key. Public mode rejects direct API requests,
restricts each session/IP to three daily queries and one active run, and enforces shared financial
reservations in a PostgreSQL transaction. Public comparisons use up to three selected chapters,
30,000 input tokens, $0.03 per inquiry, and $0.15 daily, inside the $5 monthly API allowance.

Generation uses Gemini 3.1 Flash-Lite with structured answers, 2,048 output tokens, minimal
thinking, and no external tools or automatic paid retries. Pricing snapshot:
`gemini-standard-usd-2026-10-07`: input $0.25, cached input $0.025, output/thinking $1.50 per million
tokens. Embedding 2 text input is $0.20 per million tokens. Generation costs use returned usage;
embedding costs conservatively reserve UTF-8 byte bounds and are labeled estimated. Actual invoices
can differ. Model changes require an explicitly verified pricing/capability record; embedding
changes require a new corpus version.

## Local setup

Copy the root `.env.example` to `.env`. Configure `GEMINI_API_KEY` locally and set
`PENSIEVE_LIVE_ENABLED=true` when ready for paid calls. Keep `PENSIEVE_PUBLIC_MODE=false` locally.
Docker Compose overrides DATABASE_URL with the internal database address; native Python uses
127.0.0.1:5435. All exposed development ports bind only to 127.0.0.1.

From the repository root:

```sh
docker compose up --build -d
```

Native development from `backend/`, after installing `requirements-dev.txt`:

```sh
python -m alembic upgrade head
python -m app.cli inspect ../harrypotter.pdf
python -m app.cli extract ../harrypotter.pdf --chapters vol-1-ch-1 vol-1-ch-2 vol-1-ch-3
python -m app.cli import ../data/private/<version>.json
python -m app.cli index harry-potter-archive <version> --budget 1
python -m app.worker
```

Start `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000` in another terminal. Run
`npm run dev` from `frontend/`. Live mode loads the imported catalog and adds an explicit chapter
selector. When live mode is disabled, prepared examples remain clearly marked as demonstrations.

Extract without `--chapters` to process all seven books. Reimporting a completed bundle does not
duplicate records. Indexing resumes only missing embeddings and refuses to repeat an uncertain
paid attempt automatically. All original files, exports, source maps, and local session secrets
belong in the ignored `data/private/` directory. No PDF or full source text belongs in public assets.

The PDF extraction owns page/chapter provenance. Chapter opening drop capitals are reordered into
the body while preserving a map to their original extracted positions. Page numbers identify this
specific PDF, not an unverified printed edition. A citation must fit an exact range supplied to its
branch; location verification does not assert semantic support.

## Vercel and Railway

Use the existing GitHub repository. In Vercel select `frontend/` as the root directory. In Railway
create API and worker services from `backend/`, selecting `/backend/railway-api.toml` and
`/backend/railway-worker.toml` as their configuration files. Create PostgreSQL from the
`pgvector/pgvector:pg17` image with a persistent volume at `/var/lib/postgresql/data` and a private
database connection. Use independent strong database credentials.

Both Python services need DATABASE_URL, GEMINI_API_KEY, PENSIEVE_PROXY_KEY,
PENSIEVE_SESSION_SECRET, PENSIEVE_MONTHLY_BUDGET_USD=5, and PENSIEVE_PUBLIC_MODE=true. Start with
PENSIEVE_LIVE_ENABLED=false. API migrations execute in the pre-deploy stage. Set BACKEND_URL to the
API's HTTPS origin and the same PENSIEVE_PROXY_KEY in Vercel's server environment.

Transfer the validated corpus with an administrative export/import rather than regenerating
embeddings. Enable live mode only after checking `/health/ready`, the live query journey, quota
rejection, and a database restoration. API hosting is charged separately from Gemini. Configure
platform spending alerts and daily database/volume backups. Retain at least seven daily backups
and verify restoration after migration changes. A code rollback must remain compatible with the
database migration; restore into a separate database instead of dropping source history.

## Verification

Backend: `ruff check app tests migrations` and `pytest -q`. Set PENSIEVE_TEST_DATABASE_URL to a
dedicated PostgreSQL database whose name ends in `_test` to execute integration tests. Tests
create and remove isolated schemas only in that database; the real corpus is untouched. The
checked-in CI configuration provisions pgvector and runs these tests without paid provider calls.

Frontend: regenerate contracts, run typecheck, lint, `node tests/inquiry-unit.mjs`, build, and the
browser question-to-evidence journey. Verify live Gemini separately using a small selected scope
and the same financial ledger. A simulated provider test proves application behavior, not the
quality or availability of Gemini itself.
