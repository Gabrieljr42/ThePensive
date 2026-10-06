# Future AI modules

FastAPI owns all source, AI, experiment, and evaluation responsibilities. The first slice
uses `demo/` prepared scenarios behind the versioned contracts in `contracts.py`.

The next milestone can introduce these modules independently:

- `ingestion`: edition registration, page extraction, canonical location maps
- `chunking`: chapter-aware semantic chunks and overlap/source mappings
- `embeddings`: provider adapter, dimensional configuration, corpus versioning
- `retrieval`: source-scoped vector and lexical search
- `reranking`: optional, recorded candidate reranking
- `rag`: retrieval-context construction and generation
- `full_context`: complete-scope assembly, token preflight, generation
- `citations`: source resolution and structural validation (the initial resolver exists)
- `validation`: semantic support assessment, separately labeled
- `telemetry`: provider token usage, versioned prices, stage timings
- `experiments`: persisted immutable attempts and paired configurations
- `evaluation`: held-out questions, gold evidence, rubrics, benchmark manifests

These modules return the same `ExperimentRun`, `Branch`, `Claim`, and `EvidenceResponse`
models. The frontend handles rendering and interactions, not retrieval or prompting.

