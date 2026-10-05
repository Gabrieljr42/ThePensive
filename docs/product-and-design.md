# Pensieve: product and design brief

## Product concept

Pensieve is an enchanted reading room where a visitor can ask questions of a literary archive and watch two document-answering methods work. Its core promise is: **Ask the story. Follow the evidence.**

The audience has two overlapping needs. Readers want a clear, sourced answer. Recruiters and engineers want to understand the implementation and its trade-offs. The experience starts with reading; technical detail opens through progressive disclosure.

The first corpus will be the Harry Potter books supplied for ingestion. The product setting is original: a quiet archive, an observatory window, a scholar's desk, and books that illuminate when consulted. A future dataset can enter the same world without redesigning the application.

The defining product behavior is a complete chain from **question → selected scope → supplied context → answer claim → source passage → original edition**. The magic gives that chain a visible form.

## Three creative directions

### A. The Midnight Archive — recommended

**Mood:** hushed, warm, scholarly, cinematic. A late-night visit to a library whose books still remember their readers.

**Visual style:** tall shelves dissolve into indigo shadow; a distant arched window reveals stars and a castle silhouette; candlelight falls on a broad reading desk. Linen, book cloth, worn brass, ink, and restrained parchment textures establish material depth. Large reading surfaces and narrow annotations keep answers readable.

**Palette:** midnight `#111522`, raised indigo `#1A2130`, parchment `#F0E5CE`, ink `#28232D`, antique brass `#C7A768`, moonlit blue `#A5CAD2`.

**Typography:** Cormorant Garamond, weight 600, for large titles and tome headings; Source Sans 3, weights 400 and 600, for answers, navigation, controls, and evidence; a system monospace for optional technical detail. The book character comes from the titles and composition, while prose remains comfortable to read.

**Layout:** an atmospheric entrance followed by a working reading desk. Compare mode opens into two substantial pages with shared controls above and an evidence shelf below.

**Interactions:** the input's brass border catches light on focus; submitting sends a small pulse into the book spines; the two results unfold once; activating a citation illuminates a thread to a passage in the evidence drawer. The archive quiets when the user begins reading.

**Signature:** **the evidence thread**. A selected answer claim, its citation, and the exact passage illuminate together. The relationship works through text labels and focus states as well as a visual thread.

**Why it works:** the atmosphere directly supports the subject: books, source tracing, and comparative reading. The two-tome composition is memorable in a portfolio screenshot and useful during an actual experiment. It can be built with art, CSS, SVG, and a few focused animations.

### B. The Astral Observatory

**Mood:** expansive, precise, mysterious, contemplative. An astronomer's instrument for finding connections across stories.

**Visual style:** a dark observatory dome, engraved astrolabes, vellum star charts, orbit lines, and glass instruments. Answers appear on broad chart plates, with sources arranged as a constellation. Metric graphics resemble instrument readings.

**Palette:** deep space `#0D1625`, slate `#26364B`, starlight `#DDE8EF`, icy blue `#8CC7D6`, violet `#A79AC8`, instrument brass `#BCA572`.

**Typography:** restrained Roman-style display lettering, such as Marcellus, with Source Sans 3 for the working interface; tabular figures for instrument readings. Typeface selection remains provisional for this alternative.

**Layout:** a panoramic sky-chart entrance and a central question instrument; broad result plates with an optional source constellation beside them.

**Interactions:** selecting an answer claim traces a constellation of supporting passages; RAG illuminates selected source points; Full Context displays the entire scope boundary; Compare reveals the two evidence paths on the same chart.

**Signature:** a navigable **constellation of evidence**, with an equivalent list for reading and keyboard navigation.

**Why it works:** this is the strongest metaphor for multi-hop reasoning, cross-book connections, and evaluation. Its main design challenge is keeping the star chart secondary to the answer and preventing a dense source graph from becoming hard to scan.

### C. The Sylvan Scriptorium

**Mood:** secluded, organic, ritualistic, quietly alive. A hidden forest archive lit by fireflies and amber lanterns.

**Visual style:** deep foliage around a sheltered writing desk, hand-bound books, botanical marginalia, mossed stone, dark timber, and natural vellum. Branching forms organize supporting evidence; the composition resembles a field journal rather than a control panel.

**Palette:** forest `#102B27`, moss `#53634A`, vellum `#EEE5CB`, lantern amber `#D6AA65`, mist `#ADC7BE`, plum `#604451`.

**Typography:** a literary serif, such as EB Garamond, for titles and short passages; a warm humanist sans for controls; handwritten accents restricted to ornamental annotations. Typeface selection remains provisional for this alternative.

**Layout:** an asymmetrical forest entrance; journal-like result pages; a branching evidence index with a normal list view.

**Interactions:** a firefly settles on the active citation; source branches extend when a question spans several chapters; journal panels unfold on first reveal; leaf shadows move slowly at the perimeter.

**Signature:** a **living evidence tree** that grows from a claim into its supporting passages.

**Why it works:** it has the most unusual mood and a strong relationship to discovery. Its main design challenge is preserving a crisp comparison layout amid organic decoration, especially on smaller screens.

## Recommendation and design critique

Choose **The Midnight Archive** as the foundation. Borrow the observatory's precision for the benchmark page and a distant forest silhouette for atmosphere. Keep the reading desk and evidence thread as the organizing ideas.

An early concept centered on a large glowing input over a night sky. That composition could fit many AI demos. The revised concept centers on an actual reading desk, two tomes, and source margins. Each distinctive object now has a product responsibility: choosing scope, comparing methods, reading answers, or following evidence.

The main aesthetic risk is giving the compare experience a genuine book-like composition: a quiet central gutter, substantial page margins, citation annotations, and shared instrument readings. Dense result data remains regular text and tables. The physical metaphor should be strongest at entry and transition, then recede during reading.

## First-visit storyboard

1. The archive appears immediately, with the headline **“Ask the story. Follow the evidence.”** and a clear **“Enter the archive”** action. A desk and an open book anchor the scene. An optional **“See a recorded comparison”** link lets a visitor explore without a live request.
2. Entering brings the desk into focus through a short transition. The question form is ready for use; book and chapter scope are visible. Suggested questions include “What does the Mirror of Erised reveal?” and “How do different characters understand courage?” Each suggestion declares the scope it needs.
3. The visitor selects **RAG**, **Full Context**, or **Compare**. Brief adjacent descriptions explain the choice. Compare is the default for the guided demo; the user's last choice is retained in a local session.
4. Submitting creates a shared run. A small light travels toward the relevant book spine. Plain status text describes real events: “Finding passages,” “Preparing full context,” and “Writing the answer.” Each branch progresses independently.
5. Two tomes open in Compare. Text appears as the provider streams it, with stable space reserved for citations and measurements. The reveal finishes quickly; no theatrical delay holds up the answer.
6. The visitor activates a citation. Its claim and passage illuminate, and the evidence viewer opens to the exact excerpt with book, edition, chapter, and available page information.
7. The visitor opens **“Inspect this run”** to see retrieved chunks, full-context coverage, token usage, timings, cost estimates, and validation results. The benchmark and architecture pages deepen the portfolio story.

## Page structure

### Landing — `/`

**Job:** establish the world and explain why this experiment matters.

The page includes an atmospheric hero, one direct CTA, a concise explanation of the two methods, a preview of the two-tome comparison, an evidence-tracing example, and links to the benchmark and architecture. A compact creator note explains the engineering contribution and links to the eventual repository.

Components: `ArchiveHero`, `EntranceScene`, `ProductThesis`, `MethodIntroduction`, `ComparisonPreview`, `EvidencePreview`, `CreatorNote`, `ArchiveFooter`.

The scene uses original environment art and layered silhouettes. A paused or static version preserves the same composition. The hero loads usable content before ambient effects.

### Ask — `/ask`

**Job:** move from a question to a source-grounded answer with minimal friction.

The shared question form contains `QuestionComposer`, `ModeSelector`, `CorpusScopePicker`, `ContextCapacityNotice`, `ExampleQuestions`, and a visible submit action. The scope picker shows the selected books, edition, and chapters. It exposes a spoiler boundary through explicit chapter selection.

The results area uses `AnswerTome` with answer prose, `ClaimCitation`, `AnswerStatus`, `EvidenceShelf`, and `RunMetrics`. `RetrievalInspector` is available for RAG; `ContextManifest` shows included material for Full Context. A clear unsupported-answer state explains that the selected source material does not support an answer.

The empty state invites a question. If there is no corpus, it names the missing dataset and offers the available original sample collection. Missing API configuration offers a labeled recorded demo. Provider failures include a retry action that retains the question and scope.

### Compare — `/compare` and saved view `/compare/[runId]`

**Job:** let a visitor judge both answers and inspect what caused the differences.

Use the same composer and request pipeline as Ask, preset to Compare. The saved view reads an existing run rather than generating a new one merely because a page was opened.

The top shows `SharedRunHeader`: question, corpus version, exact scope, model, prompt version, and run status. `DualTomeSpread` contains one `AnswerTome` for each method. A `ComparisonSummary` reports measured differences in latency, input/output tokens, estimated cost, citation coverage, and available evaluation scores. Each measurement has a label and unit.

`ClaimComparison` can group aligned claims as supported by both, supported by one, differing, or unsupported. Semantic alignment belongs to the polished phase and carries its evaluation method; simple text differences are described as text differences.

The lower section holds `RetrievalInspector`, `ContextManifest`, `EvidenceShelf`, and `RunDetails`. A failure in one branch leaves the completed branch readable. Retry preserves the old branch's configuration and records a new attempt.

### Evidence — drawer plus `/evidence/[sourceId]`

**Job:** establish where a claim came from.

`EvidenceDrawer` contains `SourceBreadcrumb`, `EditionLabel`, `PageReference`, `ExcerptPage`, `ClaimLinkback`, and `CitationValidationStatus`. The evidence reference resolves against the frozen source version used by that run.

The viewer displays the exact bounded excerpt first. Adjacent passages can be expanded. Page labels distinguish the source file's page index from a printed page number. An EPUB without fixed page mapping displays chapter and location. A styled excerpt is labeled as an extracted passage; a facsimile is offered only when an actual source-page image is available.

On desktop the viewer occupies a comfortable side panel; on a phone it becomes a full-height dialog. Escape closes it, focus returns to the activating citation, and a deep link remains available. A standalone page supports direct linking and screen-reader navigation.

### Architecture — `/architecture`

**Job:** make the implementation understandable to an engineer in a few minutes.

Start with `SystemOverview`, then `PipelineDiagram`, `IngestionWalkthrough`, `ChunkingExample`, `PromptAssemblyView`, `CitationContract`, and `DecisionRecords`. Every diagram node has a short plain-language description. Examples show actual fixture source spans and an explicitly labeled sample prompt.

The page explains ingestion, stable source locations, chunking, embeddings, vector/lexical retrieval, complete-context assembly, citation validation, telemetry, and benchmark methodology. Links lead to implementation files once those exist.

### Benchmark — `/benchmark`

**Job:** show evidence for the project's engineering conclusions.

`BenchmarkManifest` names the dataset, corpus version, model, prompt, run date, repetitions, and scoring rubric. `QuestionCategoryFilter` selects factual, multi-hop, cross-book, and unanswerable questions. `ScoreSummary`, `MetricComparisonChart`, `QuestionResultsTable`, and `FailureCaseReview` reveal outcomes and limitations.

Charts use engraved instrument styling, direct labels, and a companion table. Median and p95 latency are accompanied by the sample count; small samples are identified. Questions link to the original compare runs and their source evidence.

If no benchmark has been run, show the planned dataset and a clear “Results have not been measured yet” state. Descriptions of expected method trade-offs remain hypotheses until measurements support them.

## Wireframes

Desktop comparison: the shared header establishes a fair experiment before the reading surfaces diverge.

```text
PENSIEVE       Ask       Compare       Benchmark       Architecture
------------------------------------------------------------------
Question composer                             [Run comparison]
Scope: books / edition / chapters             [Context capacity]
------------------------------------------------------------------
Shared question + corpus version + model + prompt version
------------------------------------------------------------------
RAG TOME                         | FULL CONTEXT TOME
Answer with citation markers     | Answer with citation markers
                                 |
Sources used / open evidence     | Sources used / open evidence
------------------------------------------------------------------
Latency | Tokens | Estimated cost | Citation coverage | Scores
------------------------------------------------------------------
Retrieved passages               | Complete context manifest
                    Evidence shelf
```

Mobile: comparison summary stays visible; a real tab control chooses the reading surface. A “Show both answers” action stacks them for readers who prefer that view.

```text
PENSIEVE                            [Menu]
Question composer
Scope / capacity
[RAG] [Full Context] [Compare]
[Run comparison]
Shared run summary
Compact metrics comparison
[Read RAG] [Read Full Context]
Active answer + citations
[Show both answers]
Evidence list / full-height evidence viewer
```

## Component and state boundaries

| Layer | Components or modules | Responsibility |
| --- | --- | --- |
| World | `ArchiveShell`, `AmbientLayer`, `ReadingModeToggle` | Consistent scene, navigation, focus treatment, ambient controls |
| Inputs | `QuestionComposer`, `ModeSelector`, `CorpusScopePicker` | Accessible form state, validation, scope preview, submit/cancel |
| Experiment | `RunController`, `SharedRunHeader`, `BranchStatus` | Shared immutable configuration and independent branch lifecycle |
| Reading | `AnswerTome`, `ClaimCitation`, `DualTomeSpread` | Readable prose and stable claim-to-evidence activation |
| Evidence | `EvidenceShelf`, `EvidenceDrawer`, `ExcerptPage` | Source provenance, exact spans, claim linkbacks |
| Inspection | `RunMetrics`, `RetrievalInspector`, `ContextManifest` | Measured values and supplied context |
| Evaluation | `BenchmarkManifest`, `ScoreSummary`, `QuestionResultsTable` | Reproducible results and category-level comparisons |

Each branch has explicit states: `queued`, `preparing-context`, `generating`, `validating`, `complete`, `failed`, and `cancelled`. Retrieval adds intermediate events in the RAG branch. Loading and partial states have reserved layouts so the page does not jump.

The active evidence selection stores `runId`, `branchId`, `claimId`, and `sourceId`. Hover previews are optional enhancements; click, keyboard activation, and touch are the complete interaction. A citation only becomes verified after source validation.

## Design system

| Token | Value | Usage |
| --- | --- | --- |
| `night` | `#111522` | Scene and primary background |
| `raised` | `#1A2130` | Controls and instrument surfaces |
| `parchment` | `#F0E5CE` | Reading surface and light text on night |
| `ink` | `#28232D` | Text on parchment |
| `brass` | `#C7A768` | RAG accent, selected borders, warm focus |
| `moonlight` | `#A5CAD2` | Full Context accent and cool focus |

Accents identify methods through labels and shapes as well as color. On parchment, brass and moonlight are decorative; use ink for small text and controls. Final composited surfaces need contrast checks once the actual artwork is in place.

Plain-color contrast calculations on 5 October 2026: parchment on midnight **14.56:1**; ink on parchment **12.28:1**; brass on raised indigo **7.02:1**; moonlight on raised indigo **9.19:1**. These calculations cover the stated color pairs, not the accessibility of an implemented interface.

Type scale: UI captions 14px, controls 16px, answer prose 18px with approximately 1.7 line height, evidence prose 18px, section titles 28–36px, hero 48–88px depending on viewport. Long prose sits around 60–72 characters per line. Body copy uses sentence case. Decorative capitals are limited to short labels.

Layout: a 4px spacing unit; 16–24px phone gutters; 32–64px desktop page margins; a maximum working width around 1360px. Book surfaces have a subtly asymmetric edge and modest 8–12px corner treatment. Controls use consistent geometry and generous hit areas.

Materials: low-contrast parchment grain, restrained shadow at the central gutter, thin brass borders, and two or three engraved glyphs derived from archive functions. Real book/chapter/page metadata belongs in the margin; invented metadata does not.

The recommended font roles match the intended use of the [Cormorant display family](https://github.com/CatharsisFonts/Cormorant) and [Adobe Source Sans](https://github.com/adobe-fonts/source-sans). Self-host only the required font files and weights during implementation.

## Motion and ambiance

| Event | Treatment | Proposed duration |
| --- | --- | --- |
| Enter archive | Small scene shift and desk fade | 400–600ms |
| Focus question | Border light and gentle emphasis | 150–200ms |
| Submit question | One pulse from input to tome | 250–350ms |
| First result | Subtle page unfold | 250–350ms |
| Activate evidence | Claim highlight and thread reveal | 180–250ms |
| Close evidence | Quiet dissolve | 120–180ms |

These are design targets, not measured performance. Animate transforms and opacity; keep large blurs, animated shadows, and heavy filters out of continuous loops. A small ambient particle layer stays behind content and never follows every cursor movement. Turn particles off in reading mode and on small or reduced-motion displays. Pause loops when hidden or offscreen.

Honor operating-system reduced-motion preferences through Motion's [accessibility controls](https://motion.dev/docs/react-accessibility), and offer a separate “Quiet reading” toggle. A static glow and focused text replace travel, unfolding, and parallax. Essential progress remains available in words. Any future ambient sound is user-initiated, independently controllable, and remembered locally.

Use a real visible text caret and standard pointer. A wand-like accent may appear near the submit control; it does not replace the system cursor. There are no required gestures, page-turn drags, hover-only sources, or timed reading interactions.

## Branding and language

**Working name:** Pensieve. **Visual direction:** The Midnight Archive. **Tagline:** Ask the story. Follow the evidence.

Alternative product names: **Tome & Thread** for a distinctive evidence-led identity; **Lumen Archive** for a calm magical tone; **The Scriptorium** for scholarly character; **Aster Archive** for the observatory direction. These are creative candidates, not availability-checked names.

The wordmark can join a shallow bowl, an open book, and two crossing threads in one restrained emblem. Original motifs and a consistent typographic system establish the identity.

| Magical name | Clear functional label |
| --- | --- |
| The Archive | Ask |
| The Twin Tomes | Compare |
| The Source Leaves | Evidence |
| The Observatory | Benchmark |
| The Workshop | Architecture |
| The Run Ledger | History, introduced after the MVP |

Keep **RAG**, **Full Context**, **Compare**, **Ask**, and **View evidence** visible in working controls. Magical names can title spaces and supporting copy. “Cast a spell” can accompany an interaction, while the button says “Ask the archive” or “Run comparison.”

Useful state copy: “Finding supporting passages,” “Preparing the selected chapters,” “This passage supports claim 2,” “The selected chapters do not support this answer,” and “This scope exceeds the model's context capacity. Choose fewer chapters or a compatible model.”

## Quality bar

The experience should remain usable at 320px wide, at browser zoom, with a keyboard, and with ambient motion disabled. All controls have visible focus, clear names, and comfortable targets. Dialogs handle focus correctly. Streaming updates announce meaningful status changes without reading every token aloud. Charts have text/table equivalents. The page retains a readable fallback if artwork or custom fonts fail to load.

Performance targets for later measurement: LCP at or below 2.5s, INP at or below 200ms, and CLS at or below 0.1 under documented test conditions. A compact 2D scene is the initial choice; a 3D environment becomes worthwhile only if measurement shows that it improves the experience within the same budget.

The portfolio proof is the complete journey: a beautiful entrance, a useful comparison, an honest source viewer, a reproducible experiment, and an explanation of the implementation.
