# Pensieve: proposed architecture decisions

These records capture the recommended approach before implementation. Status: **proposed**, pending implementation evidence and any user steering.

## ADR-001 — separate frontend and AI/backend applications

**Context:** a solo portfolio project needs a polished public site, an interactive reading interface, source ingestion, provider calls, and reproducible evaluation.

**Decision:** use Next.js/TypeScript for the UI and HTTP transport; use FastAPI/Python for source processing, retrieval, generation, citations, experiment recording, and evaluation. Run both with PostgreSQL/pgvector through Compose. This updates the initial single-application proposal following the user's architecture preference.

**Alternatives:** Vite plus FastAPI offers a familiar Python processing environment but introduces two application runtimes and deployment boundaries. Separate services support independent scaling but create operational work beyond the pilot's needs.

**Trade-off:** two application runtimes require coordinated local configuration and contracts. FastAPI's OpenAPI export generates the frontend types, and a same-origin proxy keeps browser configuration simple. Long-running processing can gain a worker later.

**Revisit when:** user uploads, slow extraction, or concurrent generation requires durable background work.

## ADR-002 — source and retrieval data in PostgreSQL

**Context:** exact citations depend on relational source metadata, while RAG needs semantic and exact-term retrieval.

**Decision:** store canonical sources, chapter/page maps, chunks, vectors, lexical indexes, and runs in PostgreSQL with pgvector. Start with exact vector search and rank fusion.

**Alternatives:** a dedicated vector service can simplify very large semantic indexes but splits source and retrieval data. A fixture-only local index is useful for UI development but does not demonstrate the intended production data path.

**Trade-off:** retrieval query tuning is visible implementation work. Approximate indexes require measuring speed and recall under source filters.

**Revisit when:** measured data volume or latency exceeds what the chosen PostgreSQL setup handles comfortably.

## ADR-003 — immutable edition-aware source spans

**Context:** page references vary by edition, extraction can change text, and chunk overlap can obscure the original location.

**Decision:** canonical source units and their original-location maps are immutable within a corpus version. Chunks reference those spans. Citations resolve against the version used by the generating attempt.

**Alternative:** letting the model write a book/chapter/page string is faster to prototype but cannot establish source integrity.

**Trade-off:** ingestion requires careful validation and extra mapping records. EPUB sources may offer stable locations without printed page numbers.

**Revisit when:** a new source format needs a different location adapter; retain the immutable span contract.

## ADR-004 — Full Context includes the complete declared scope

**Context:** a meaningful comparison must reveal what each method was allowed to read and what it actually received.

**Decision:** both methods share a visible source scope. RAG selects passages within it; Full Context submits all its canonical text. A scope that exceeds capacity produces an explicit eligibility state.

**Alternatives:** truncation, summaries, or hierarchical answering can handle larger collections, but each changes the comparison method and must be labeled separately.

**Trade-off:** a full seven-book paired run may be unavailable on the selected model. Smaller declared scopes remain valid experiments.

**Revisit when:** adding a separately named compression or hierarchical method, or a model with suitable measured context capacity.

## ADR-005 — reveal magic through source relationships

**Context:** the user wants an immersive wizarding product with strong usability, accessibility, and performance.

**Decision:** make the two-tome comparison and evidence thread the signature interactions. Use an original layered 2D archive scene with small transform/opacity transitions and quiet reading controls.

**Alternative:** a fully navigable 3D castle can create spectacle but increases loading, input, and accessibility complexity for a reading product.

**Trade-off:** the environment is cinematic rather than freely navigable. Interaction effort goes into the reading and evidence journey.

**Revisit when:** a measured 3D enhancement improves that journey without degrading the documented quality targets.

## ADR-006 — conclusions come from versioned experiments

**Context:** the product compares quality, citations, latency, tokens, and estimated cost. Those outcomes depend on the corpus, question scope, model, caching, and implementation.

**Decision:** report question-level results from frozen configurations, held-out questions, counterbalanced repetitions, preserved failures, and declared scoring methods. Keep recorded demonstrations explicitly labeled.

**Alternative:** static showcase metrics or broad claims about a universal winner look concise but cannot demonstrate experimental credibility.

**Trade-off:** the benchmark requires annotation work and live-call budget. Early pages may contain a clear unmeasured state.

**Revisit when:** adding a new corpus, model, retrieval variant, or rubric; publish a new manifest rather than overwrite previous conclusions.
