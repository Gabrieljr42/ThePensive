# Pensieve

**An enchanted archive for comparing RAG and Full Context, with every answer connected to its evidence.**

Creative recommendation: **The Midnight Archive** — a candlelit library opening onto a celestial observatory. Two illuminated tomes make the comparison visible; a thread of light connects an answer claim to its source passage.

Status: **the functional first slice and immersive presentation are implemented.** The Next.js interface consumes a separate FastAPI backend through generated OpenAPI types. Answers, retrieval, and measurements are prepared demonstrations; source matching and experiment storage are functional.

## Enter the archive

With Docker Desktop running, from this folder:

```sh
docker compose up --build -d
```

Open [the cinematic entrance](http://localhost:3000), [the reading desk](http://localhost:3000/ask), or [the FastAPI documentation](http://localhost:8000/docs).

The Compose stack contains Next.js, FastAPI, and PostgreSQL with pgvector. The database uses a named volume. Stop the services with `docker compose down`; the database volume is retained.

## Current experience

The threshold reveals the archive and offers an immediate path to the desk. Select an illuminated book, write a question on the manuscript, and choose RAG, Full Context, or Compare. The reading instrument and source-light trace show the prepared run progressing. The Twin Tomes reveal the answers. A citation opens an illuminated source chamber; the optional constellation exposes the stored claim-to-passage links.

The two available collections are original Harry Potter companion notes and The Lantern Ledger, an original archive tale. Folio references belong to these fixtures, not to novel editions. Suggested questions have prepared scenarios; other questions produce an explicit unprepared-answer state.

**Mocked:** retrieval, reranking, model generation, generation timing, token usage, and API cost. **Functional:** HTTP contracts, corpus selection, run lifecycle, cancellation, exact quotation resolution, experiment-scoped evidence lookup, and PostgreSQL snapshot storage in Compose. Native backend development uses bounded memory storage when `DATABASE_URL` is unset.

## Repository

```text
frontend/             Next.js, TypeScript, Tailwind, Motion, components, browser tests
backend/app/          FastAPI, contracts, original sources, mock engine, citations, repositories
backend/app/pipelines/ Future ingestion, retrieval, generation, and evaluation boundaries
contracts/            Exported OpenAPI schema
infra/                PostgreSQL and pgvector initialization
scripts/              Contract export
docs/                 Product plans, decisions, experience notes, screenshots
compose.yaml          Three-service local stack
```

## Development

Use Python 3.12+ and Node.js 22+. From `backend/`:

```sh
python -m venv .venv
```

Activate `.venv\Scripts\Activate.ps1` in PowerShell, or `source .venv/bin/activate` on macOS/Linux, then:

```sh
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

From `frontend/` in another terminal:

```sh
npm ci
npm run dev
```

Backend checks: `ruff check app tests` and `pytest -q`. Frontend checks: `npm run typecheck`, `npm run lint`, and `npm run test:e2e` with the services running. Browser tests use an installed Google Chrome in an isolated headless profile. `BASE_URL` can target a different local frontend port. The production frontend is compiled during the Docker build.

To regenerate contracts, run `python scripts/export_contracts.py` from the root using the backend environment, then `npm run contracts` in `frontend/`. The Pydantic models own the wire format; rendering components use aliases of generated types.

## Experience notes

The native production build uses `npm run build` followed by `npm start` in `frontend/`. Its standalone launcher includes the required public/static assets and binds to [127.0.0.1:3000](http://127.0.0.1:3000/). `PENSIEVE_HOST` and `PENSIEVE_PORT` can override that local binding.

Verification: 13 backend tests, 13 production browser tests, TypeScript, ESLint, and the native production build pass. Browser coverage includes automated accessibility scans and a local layout/interaction performance sample. The sample is laboratory evidence, not field Core Web Vitals certification.

Docker Compose configuration was validated, but the local Docker engine returned internal errors during the image build. Container runtime verification is outstanding; the native production application is available. No global Docker restart was performed.

- [Immersive upgrade, references, and verification](docs/experience-upgrade.md)
- [Original artwork and exact generation prompts](frontend/public/art/README.md)
- [Desktop entrance screenshot](docs/screenshots/entrance-desktop.png)
- [Desktop reading room screenshot](docs/screenshots/ask-desktop.png)
- [Source chamber screenshot](docs/screenshots/evidence-desktop.png)

Reduced motion, keyboard navigation, visible focus, mobile tabs/stacking, native dialog behavior, and quiet reading are part of the interface. No sound plays automatically. The Midnight Archive aisle is a WebGL scene that starts on a conservative pixel-ratio, shadow, and particle budget until a desktop GPU tier is known; the research desk stays in the DOM.

## Read the plan

- [Product concept, three creative directions, pages, and components](docs/product-and-design.md)
- [Architecture, source provenance, comparison protocol, and evaluation](docs/architecture.md)
- [Phased roadmap and the first implementation slice](docs/roadmap.md)
- [Architecture decisions and their trade-offs](docs/decisions.md)

## The experience

Enter the archive. Choose the books or chapters to consult. Ask a question. Open one tome for RAG, one for Full Context, or both for comparison. Follow a citation back to an edition-specific passage. Inspect the context, latency, token usage, and estimated cost behind the answer.

The working product name is **Pensieve**; **The Midnight Archive** is its visual direction. Harry Potter is the intended first literary corpus. The artwork and interface will use an original wizarding setting.

## Working assumptions

- A solo-developer portfolio project with a modest public demo audience.
- Next.js, TypeScript, Tailwind, and Motion own the interface; FastAPI/Python own source, experiment, and future AI responsibilities; PostgreSQL with pgvector is the backend data boundary.
- Model and embedding choices will be selected against measured corpus sizes, availability, and budget when implementation begins.
- Harry Potter book files and their editions have not yet been supplied. Exact pages and excerpts will come from validated ingestion of those files.
- The current small original fixtures support the functional demonstration while literary ingestion remains a later milestone.
- Live runs and recorded demonstrations will carry explicit labels; benchmark conclusions will come from measured experiments.

Planning date: **5 October 2026**.
