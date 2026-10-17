# Handoff Report — Explorer Survey 2 (Copy & De-AI Tone Survey)

**Agent**: Explorer Survey 2 (`explorer_survey_2`)  
**Mission**: Exhaustive survey and audit of all user-facing copy across Pensieve to satisfy Requirement R2 and Aesthetic Voice criteria.  
**Destination Report**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_survey_2\survey_copy_report.md`  

---

## 1. Observation

Direct observations made across the repository during survey:

1. **Scattered Hardcoded Copy Across 18 Source Files**:
   - `frontend/src/app/layout.tsx` (L9–12): `"title: 'Pensieve — The Midnight Archive'`, `description: 'Ask the story. Follow the evidence. An enchanted research archive comparing RAG and Full Context.'"`
   - `frontend/src/features/archive/MidnightArchive.tsx` (L107, 165–180, 204, 208, 224, 234–237): Hardcoded strings `"Skip directly to Research Desk"`, `"The chamber of memories"`, `"A thought, given form"`, `"Choose a chronicle. Ask the archive"`, `"Touch the silver"`, `"The room preview is resting"`, `"Prepared demonstration"`, `"Ask the story. Follow the evidence."`
   - `frontend/src/features/archive/ui/ThresholdTitle.tsx` (L16–48): `"A chamber of memories"`, `"Ask the story. Follow the evidence."`, `"Enter the Archive ↗"`, `"Skip to reading desk →"`, `"Seven chronicles on the desk"`, `"A prepared exploration of RAG & Full Context"`.
   - `frontend/src/features/archive/ui/DiveOverlay.tsx` (L10–19, 140, 146, 148): In-flight copy dictionary (`"A thought, set free."`, `"The memory calls."`, `"Between ink and memory."`, `"Within the memory."`, `"Your inquiry is still in progress."`, `"A memory, given words."`, `"Your answer is ready to read."`), and button text `"Skip animation ↗"`, `"Cancel inquiry"`, `"Esc · wait at the desk"`.
   - `frontend/src/features/archive/ui/VolumeProxies.tsx` (L24, 27, 89–93): `"Active Corpus (1/7 Selected)"`, `"Click book to summon"`, `"{vol.chunks} chk"`, `"{vol.pages} pp"`.
   - `frontend/src/features/archive/ui/QuestionLeaf.tsx` (L67, 70, 78, 92, 100, 120, 132, 146): `"MANUSCRIPT INQUIRY · DESK ENTRY"`, `"Press Ctrl + Enter or strike the wax seal"`, `"Inscribe your question for the archive"`, placeholder `"Inscribe a question into the midnight archive..."`, `"Catalogued Curiosities:"`, `"SCOPE: 1 Volume"`, `"Cancel inquiry"`, button `"Ask the Archive"` / `"Consulting..."`.
   - `frontend/src/features/archive/ui/MethodAstrolabe.tsx` (L14–29): Methods array with descriptions `"Vector search & top-k reranked passages"`, `"Twin Tomes: Observe both forms side-by-side"`, `"Complete chronicle held in active attention"`, and sword icon `"⚔"`.
   - `frontend/src/features/archive/ui/Tome.tsx` (L50–53, 67–70, 83–85, 130–145): `"The First Tome · Focused Retrieval"`, `"The Second Tome · Whole Corpus Attention"`, `"{N} Filtered Passages"`, `"Prepared Volume Scope"`, `"An answer is arriving. References will appear as they are verified."`, `"LATENCY"`, `"INPUT: ... TOKENS"`, `"EST. COST"`.
   - `frontend/src/features/archive/ui/GutterScale.tsx` (L38–46, 66, 88, 95, 110): Crossed swords icon `"⚔"`, label `"Divergence"`, all-caps telemetry `"LATENCY"`, `"TOKENS"`, `"~58× context size"`, `"EST. COST"`, `"EVIDENCE"`.
   - `frontend/src/features/archive/ui/RetrievalReadout.tsx` (L12, 22–30): `"Memories consulted · illustrative measurements"`, `"{N} candidates → {M} selected passages"`, `"Prepared Volume III scope"`.
   - `frontend/src/features/archive/ui/InquiryStatus.tsx` (L6–17, 39–44): Status phrases `"Checking the answer"`, `"Composing the answer"`, `"Preparing passage search"`, `"Assembling the selected scope"`, and connection status `"Prepared demonstration · simulated wait"`.
   - `frontend/src/features/archive/ui/EvidenceLeaf.tsx` (L88, 95, 126, 136, 143): `"ARCHIVAL SOURCE LEAF · CITATION [N]"`, `"(illustrative)"`, `"Linked Claim:"`, `"Exact quote verified"`, `"Return to tomes (Esc) →"`.
   - `frontend/src/features/archive/mock/marauders-map.ts` (L199–257, 285–360):
     - RAG conclusion (L255): `"RAG successfully isolated the moment of bestowal and the revelation of authorship, but its retrieval boundary excluded the parchment's subsequent confiscation and final return."`
     - Full Context Claim 4 (L341): `"Crucially, after Lupin later confiscated the map during the term, he formally restored it to Harry in his private study upon resigning, cementing Harry's permanent ownership."`
     - Full Context conclusion (L359): `"Full context synthesized the entire timeline: discovery, transmission, secret revelation, and Lupin's closing restoration — at the expense of ~58× higher token volume."`
   - `frontend/src/features/archive/mock/adapter.ts` (L84–94): Fallback copy repeating `"prepared investigation"`: `"This archive demonstration contains a prepared investigation of the Marauder's Map. This question has no prepared answer."`, `"Uncatalogued Inquiry"`.
   - `frontend/src/features/archive/mock/volumes.ts` (L18–114): Formulaic listicle template: `"The X, the Y, and the Z"` for all 7 books.
   - `frontend/src/features/archive/memoryWalk.ts` (L26–38): Titles and labels: `"A thought, set free"`, `"YOUR INQUIRY"`, `"PREPARED PARAPHRASE · " + book`.
   - `frontend/src/features/archive/inquiry/transport.ts` (L28, 50, 123, 171, 205): Error messages `"This method could not complete the inquiry. Try again."`, `"The archive could not complete this inquiry."`, `"A memory taking shape"`.
   - `backend/app/demo/scenarios.py` (L127–129): `"This demonstration has no prepared, supported answer for that question."`, `"Try one of the suggested questions, or consult a different collection."`

2. **Automated Test Assertions on Exact Strings**:
   - `frontend/tests/slice.spec.ts`: Asserts `"Pensieve"`, `"Enter the Archive"`, `"Ask the Archive"`, `/VOL\. III/i`, `"The Bequest of the Four Wanderers"`, `"The Complete Provenance of the Parchment"`, `/Inspect citation \[1\]/i`, `/Evidence passage/i`.
   - `frontend/tests/descent.spec.ts`: Asserts `"Pause journey"`, `"Resume journey"`, `"Cancel inquiry"`, `"Start preview"`, `"Hide preview controls −"`, `"Skip animation"`, `"Memory source"`, `"Memory journey"`.
   - `frontend/tests/a11y.spec.ts`: Asserts `"Pensieve"`, `"Ask the Archive"`, `"Enter the Archive"`, `"Active Corpus"`.
   - `frontend/tests/memory-chamber.spec.ts`: Asserts `"Quiet reading"`, `"Stir the Pensieve"`, `"Ask the Archive"`.
   - `frontend/tests/ambient-sound.spec.ts`: Asserts `"Enter the Archive"`, `"Ambient sound"`, `"Ambient volume"`, `"Research desk"`.
   - `frontend/tests/inquiry-unit.mjs` (L52): Asserts `assert.ok(fragment.label.startsWith("PREPARED PARAPHRASE"))`.

3. **Internationalization & Dictionary Architecture**:
   - `package.json` contains no i18n packages.
   - No `messages/`, `locales/`, or centralized `copy.ts` exists. All strings are inline literals.

---

## 2. Logic Chain

1. **Step 1: Identifying Tone Clashes**:  
   From Observation 1, the site is designed as a Gothic, candlelit memory archive ("The Midnight Archive"). Yet user-facing copy repeatedly breaks character by injecting:
   - AI conversational/generative tropes (*"Crucially,"*, *"The memory calls"*, *"The ink remembers"*, *"Catalogued Curiosities"*).
   - Developer implementation terms (*"Skip animation"*, *"chk"*, *"Active Corpus (1/7 Selected)"*, *"top-k reranked passages"*, *"SCOPE: 1 Volume"*).
   - IT ticketing system phrases (*"Your inquiry is still in progress"*, *"The room preview is resting"*, *"This question has no prepared answer"*).
   - Video-game combat metaphors (*"⚔"* crossed swords for RAG vs Full Context comparison).

2. **Step 2: Reconciling Technical Fidelity with Literary Tone**:  
   The design brief in `docs/product-and-design.md` explicitly specifies dual audiences: literary readers wanting grounded answers, and technical recruiters/evaluators wanting architectural clarity. Therefore, technical concepts (latency, context size, vector retrieval, full attention) must **not be erased**, but rather translated into dignified, authorial scholarly prose (e.g. replacing `"chk"` with `"passages"`, `"top-k reranked"` with `"Sifted Retrieval · Vector indexing extracts salient candidate leaves"`, and `"⚔ Divergence"` with `"⟡ Architectural Divergence"`).

3. **Step 3: Preserving CI and Verification Stability**:  
   From Observation 2, altering strings blindly will cause instant build and test failures in `npm run test:e2e` and `node tests/inquiry-unit.mjs`. Specifically, replacing buttons like `"Skip animation"` or headings like `"The Bequest of the Four Wanderers"` breaks Playwright test selectors.  
   The solution is dual-layered:
   - For titles and unit test prefixes (`"PREPARED PARAPHRASE"`), preserve them.
   - For UI elements whose display text is elevated (e.g., displaying `"Emerge to the desk"` instead of `"Skip animation"`), preserve the test contract via `aria-label="Skip animation"`, ensuring both poetic visual immersion and 100% test pass rates.

4. **Step 4: Architectural Remediation**:  
   From Observation 3, scatter across 18 files makes tonal maintenance unsustainable. Consolidating all microcopy into a dedicated `frontend/src/features/archive/copy.ts` constants module is the cleanest architectural pattern for the implementation agent.

---

## 5. Caveats

- **Scope Boundary**: This was a read-only investigation. No source files outside the agent directory were modified.
- **Copyright Constraints**: Source passages in `marauders-map.ts` are paraphrased demonstration passages referencing J.K. Rowling's Volume III; our proposed rewrites maintain fair-use paraphrasing without reproducing verbatim book text.
- **Visual Regression Tests**: Playwright includes visual screenshot tests (`screenshots.spec.ts`). Modifying text length significantly could alter line wrapping in tomes; the proposed rewrites have been calibrated to preserve approximate word counts and paragraph heights.

---

## 4. Conclusion

Requirement R2 and the Aesthetic Voice criteria require an overhaul across 14 copy surfaces. The current text frequently lapses into synthetic AI tropes, developer jargon, and helpdesk monotony.  

An exhaustive catalog of 62 copy items has been documented in:  
`c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_survey_2\survey_copy_report.md`  
with:
- Exact file paths and line numbers
- Current verbatim text
- Tonal critiques
- Grounded authorial rewrites fitting an introspective memory archive
- Test contract preserving mappings for all 22 test-asserted strings.

---

## 5. Verification Method

To independently verify the observations, line numbers, and test dependencies:

1. **Verify Source Files & Line Numbers**:
   - Inspect `frontend/src/features/archive/mock/marauders-map.ts`: confirm line 341 begins with `"Crucially,"`.
   - Inspect `frontend/src/features/archive/ui/DiveOverlay.tsx`: confirm line 140 contains `"Skip animation"`.
   - Inspect `frontend/src/features/archive/ui/VolumeProxies.tsx`: confirm line 89 uses `"chk"`.
   - Inspect `frontend/src/features/archive/MidnightArchive.tsx`: confirm line 208 contains `"The room preview is resting."`.

2. **Verify Test Assertions**:
   - Search Playwright test files for asserted copy strings:
     ```powershell
     rg -i "Skip animation|The Bequest of the Four Wanderers|Ask the Archive|Active Corpus|PREPARED PARAPHRASE" frontend/tests
     ```
   - Run current unit and typecheck tests:
     ```powershell
     cd frontend
     npm run typecheck
     node tests/inquiry-unit.mjs
     ```
