# Pensieve: phased development roadmap

## Phase 0 — design and experiment definition

**Outcome:** a coherent experience and a defensible comparison protocol before application code.

The product brief supplies three distinct creative directions, recommends The Midnight Archive, defines six core experiences, sets typography/color/motion principles, and maps components to behavior. The architecture brief defines source provenance, complete-context eligibility, recorded usage, evaluation, and the proposed stack.

**Completed in this planning pass:** the `Pensieve` subfolder, product/design brief, architecture brief, this roadmap, and the proposed decision records.

**Inputs for implementation:** choose a development provider/model against actual availability and budget; supply the intended Harry Potter files and edition metadata; validate the canonical extracted corpus size. Development can begin with original fixtures while these inputs are being resolved.

## Phase 1 — MVP: one complete question-to-evidence journey

**Outcome:** a beautiful but compact application that performs an honest paired experiment.

Build a thin slice in this order:

1. Set up Next.js, TypeScript, Tailwind, and shared design tokens. Create the archive shell, readable tome surface, and original fixture collection with known chapter/page metadata.
2. Build the responsive question composer, mode selector, visible scope picker, answer surfaces, evidence viewer, and plain error/empty states. Use explicit sample-state labels while the server path is incomplete.
3. Create PostgreSQL migrations and an offline ingestion CLI. Persist immutable source units, chapter/page mappings, chunks, embeddings, and a corpus manifest. Ingest one validated literary scope after the files arrive.
4. Add scoped retrieval, complete selected-context assembly, request-capacity preflight, and one provider adapter. Persist paired configuration and independent attempts.
5. Connect real generation, branch-tagged status events, provisional answer text, final citation validation, and source viewing. Enable cancellation and preserve a successful branch if its partner fails.
6. Add provider-reported usage, stage timing, versioned cost estimation, the RAG context inspector, and the complete-context manifest.
7. Add a minimal landing page, saved comparison route, architecture page, and the 24-question pilot evaluation. Display real results or the explicit unmeasured state.

**MVP features:** RAG / Full Context / Compare, edition-aware sources, claim-linked citations, responsive reading, a restrained magical transition, real run metrics, honest abstention, and a reproducible pilot.

**Exit criteria:** a question submitted through the browser produces the two configured methods on the same scope; the selected citation resolves to a validated source span; Full Context either supplies the complete declared scope or explains capacity; usage and timings match recorded operations; all essential actions work on phone and keyboard.

**Verification:** meaningful source-mapping fixtures, context-integrity and accounting checks, real PostgreSQL retrieval integration, one browser question-to-evidence journey, one branch-failure journey, and type/build checks. Provider calls are opt-in for the live smoke check; deterministic fixtures support local and CI validation.

**Portfolio artifact:** a running vertical slice with a short recorded demonstration of one question and its evidence, supported by the first measured report.

## Phase 2 — polished version: the archive becomes a place

**Outcome:** a memorable, cohesive experience across the complete product.

- Commission or generate original archive artwork, window/forest silhouettes, small book details, and a restrained emblem. Optimize image assets before adding them to the critical path.
- Refine the entrance transition, input focus light, twin-tome reveal, evidence thread, source margins, and quiet reading behavior. Keep uninterrupted reading the dominant state.
- Complete desktop/mobile comparison layouts, focus management, source deep links, reduced-motion behavior, loading geometry, and accessible chart/table pairs.
- Expand ingestion as source quality permits. Expose available editions and scope boundaries; add cross-book questions only when both methods can run on the same selected corpus.
- Implement claim alignment and disagreement highlights with a disclosed method. Give uncertain or unsupported comparisons a readable state.
- Produce the 40-question benchmark, category views, documented cache policy, and paired failure-case reviews. Tune retrieval on the development split only.
- Apply public-demo rate limits, per-run capacity/cost previews, measured asset budgets, and reliable saved runs.

**Exit criteria:** the scene feels consistent on landing, Ask, Compare, Evidence, Architecture, and Benchmark; content remains legible with ambient effects off; citations retain provenance across saved runs; published benchmark claims are supported by traceable attempts; documented performance and accessibility checks pass under the chosen conditions.

**Verification:** use visual inspection at phone, tablet, and desktop widths; inspect keyboard and zoom behavior; confirm motion controls; measure Core Web Vitals; rerun the held-out benchmark only when a new model, corpus, or method variant justifies a new manifest.

**Portfolio artifact:** the polished application, original art direction, an annotated design case study, and a public report explaining observed trade-offs.

## Phase 3 — standout portfolio version: show why the system behaves as it does

**Outcome:** an immersive product with unusually inspectable engineering.

- **Run replay:** step through context preparation, supplied passages, generation status, citation checks, and final measurements from recorded events. Label playback and preserve the original measured timeline.
- **Evidence map:** an optional constellation of claim-to-passage relationships, with an equivalent list. Links represent actual stored relationships.
- **Controlled experiments:** vary chunk size, retrieval budget, reranking, and model choice as distinct versioned variants. Present effects on quality, latency, tokens, and estimated cost.
- **Long-context stress tests:** use original controlled documents with facts at different positions to study context coverage and attention behavior separately from memorized literary knowledge.
- **Retrieval case studies:** explain a missed passage, a corrected multi-hop answer, and a justified abstention, including the implementation change and measured effect.
- **Reproducible run export:** export configuration, hashes, source references allowed for distribution, measurements, scoring rubric, and benchmark manifest. Re-running is described as a repeated experiment, not a guarantee of identical model output.
- **Portfolio packaging:** a concise repository README, architecture diagram, demo video, polished screenshots, accessibility/performance evidence, and a narrative covering problem, design decisions, technical choices, outcomes, and limitations.

**Exit criteria:** a reviewer can move from an interesting claim to the original run, supplied context, evidence, and evaluation; reproduce the fixture-based evaluation; and understand which decisions improved the observed results.

**Portfolio artifact:** a complete case study that demonstrates visual craft, full-stack delivery, retrieval engineering, source integrity, experiment design, and operational judgment.

## Priorities and scope control

| Priority | Deliverables | Reason |
| --- | --- | --- |
| Essential | Paired methods, shared scope, exact sources, evidence viewer, real usage/timing, accessible reading | Establishes product and technical credibility |
| High | Twin tomes, original entrance, evidence thread, retrieval inspector, context manifest, pilot benchmark | Establishes the project's distinctive identity |
| Later | Claim alignment, broader corpus, deeper benchmark, run replay, experiments | Adds explanatory depth after the core is proven |
| Deferred | Multi-user workspaces, billing, social features, heavy 3D, voice, broad document uploads | Expands product scope beyond the initial portfolio objective |

Implement the signature evidence thread before adding more ambient effects. Build one complete vertical slice before expanding the number of pages or retrieval variants. A feature earns its place by improving source understanding, comparative evaluation, reading quality, or portfolio explanation.

## First implementation slice

**Implemented:** the typed FastAPI mock slice and immersive `/` + `/ask` presentation. The repository now separates `frontend/` and `backend/`, exports OpenAPI to `contracts/`, and runs through the root Compose stack. See [experience notes](experience-upgrade.md) and the current [README](../README.md). Live ingestion and generation remain subsequent milestones.

The next concrete deliverable is `/ask` with a shared question form, two readable tome surfaces, a small original paginated fixture collection, and an evidence drawer that links a claim to an exact source span. The initial fixture is labeled **Original sample collection**. Its measurements remain unavailable until actual measured operations exist.

Begin with the happy path and the insufficient-evidence state. Then connect PostgreSQL retrieval and the provider. This sequence makes the interaction reviewable early while the live architecture is built against the same citation contract.

Suggested first UI components: `ArchiveShell`, `QuestionComposer`, `ModeSelector`, `CorpusScopePicker`, `AnswerTome`, `DualTomeSpread`, `ClaimCitation`, `EvidenceDrawer`, and `RunMetrics`.

Suggested future application layout, to be created during implementation:

```text
Pensieve/
  docs/                      Design, architecture, and decisions
  src/
    app/                     Landing, Ask, Compare, Evidence, Benchmark
      api/                   Run, corpus, and evidence endpoints
    components/
      archive/               Scene, navigation, and reading mode
      question/              Composer, modes, and scope
      answers/               Tomes, claims, and branch state
      evidence/              Excerpts, locations, and linkbacks
      metrics/               Timings, usage, and estimates
      benchmark/             Questions, scores, and charts
    server/
      corpus/                Source units and provenance
      retrieval/             Lexical/vector retrieval and fusion
      context/               Complete-context assembly and preflight
      generation/            Provider adapter and schemas
      citations/             Span resolution and validation
      telemetry/             Events, usage, and cost estimates
      evaluation/            Rubrics and aggregation
  db/migrations/             Relational/vector schema
  scripts/                   Offline ingestion and benchmark commands
  fixtures/                  Original sample source documents
  tests/                     Source, context, accounting, and journey checks
  public/art/                Optimized original visual assets
```

This tree is a proposal. The current folder contains the planning documents only.

## Planning estimates

For a solo developer familiar with this stack, reserve roughly 2–3 focused weeks for the MVP, 2–3 more for visual and evaluation polish, and 2–4 for standout experiments and portfolio packaging. These are planning ranges rather than a delivery commitment. Corpus extraction quality, available model context, live-call budget, and artwork effort can materially change them.
