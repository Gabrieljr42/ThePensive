# Pensieve: Exhaustive Copy & De-AI Tone Survey Report

**Author**: Explorer Survey 2 (Copy & De-AI Tone Survey)  
**Date**: 2026-10-07  
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve`  
**Reference Document**: `.agents/teamwork/ORIGINAL_REQUEST.md` (Requirement R2 & Aesthetic Voice Criteria)  
**Status**: Survey Complete · Read-Only Audit · Actionable Proposals  

---

## 1. Executive Summary & Audit Metrics

This audit surveyed **every user-facing string** across the Pensieve repository, encompassing Next.js components, page routes, mock fixtures, state stores, directors, canvas overlays, and FastAPI backend catalogs.

### Key Metrics
- **Source Files Audited**: 24 files across `frontend/` and `backend/`.
- **User-Facing Copy Surfaces Identified**: 14 distinct UI/system zones.
- **Copy Catalog Items Documented**: 62 individual text items evaluated.
- **Identified Tonal Anomalies**:
  - **Machine-Generated & Formulaic AI Tropes**: 14 instances (e.g., `"Crucially,"`, `"The memory calls"`, `"The ink remembers"`, `"Catalogued Curiosities"`, `"resolve across three decisive encounters"`).
  - **SaaS / Web-Dev Technical Leaks**: 12 instances (e.g., `"Skip animation"`, `"1,412 chk"`, `"Active Corpus (1/7 Selected)"`, `"top-k reranked passages"`, `"SCOPE: 1 Volume"`, `"simulated wait"`).
  - **Bureaucratic / Ticketing Monotony**: 8 instances (e.g., `"Your inquiry is still in progress"`, `"This question has no prepared answer"`, `"Cancel inquiry"`).
  - **Euphemistic "Cutesy" AI Speak**: 3 instances (e.g., `"The room preview is resting"`, `"Waiting to begin"`).
- **Internationalization (i18n) Status**: **0%**. No i18n framework is installed; 100% of strings are hardcoded in English across 18 distinct source files.
- **Test Assertion Dependencies Flagged**: **22 strings** directly asserted in Playwright specs (`a11y.spec.ts`, `slice.spec.ts`, `descent.spec.ts`, `memory-chamber.spec.ts`, `ambient-sound.spec.ts`) and Node unit tests (`inquiry-unit.mjs`). Changing these strings without synchronized test updates will break the CI build.

---

## 2. Core Taxonomy of Synthetic AI Patterns in Pensieve

The current codebase does not suffer heavily from modern corporate marketing buzzwords (e.g., *"synergize"*, *"leverage"*, *"cutting-edge"*). Instead, it suffers from a subtler, more insidious tri-fold tonal schizophrenia characteristic of AI-assisted scaffolding:

1. **The "Pseudo-Poetic AI Hallmarks"**:
   - Sentences beginning with synthetic emphasis adverbs (*"Crucially,"* in `marauders-map.ts`).
   - Melodramatic, ungrounded abstractions (*"The memory calls"*, *"The ink remembers"*, *"Two ways to remember. One question."*).
   - Quasi-Victorian twee clichés (*"Catalogued Curiosities"* in `QuestionLeaf.tsx`).

2. **The "Fourth-Wall Technical Leaks"**:
   - Web development and computer-graphics jargon exposed directly to the reader (*"Skip animation"* in `DiveOverlay.tsx`, *"chk"* abbreviation in `VolumeProxies.tsx`, *"top-k reranked"* in `MethodAstrolabe.tsx`).
   - Apologetic meta-commentary breaking immersion (*"Prepared demonstration · simulated wait"* in `InquiryStatus.tsx`, *"A prepared exploration of RAG & Full Context"* on the entrance threshold).

3. **The "Automated IVR / Helpdesk Tone"**:
   - Robotic customer-service phrasing (*"Your inquiry is still in progress"*, *"Your answer is ready to read"*, *"The archive could not complete this inquiry"*).
   - Euphemistic anthropomorphism when rendering crashes (*"The room preview is resting"* in `MidnightArchive.tsx`).

---

## 3. Systematic File-by-File Copy Audit & Proposed Rewrites

Below is the complete catalogue of user-facing copy, diagnosed against aesthetic voice criteria and paired with authorial rewrites grounded in an introspective, physical memory archive (silver basins, worn leather folios, dark ink, candlelit parchment, scholarly quietude).

---

### Category A: The Threshold & Brand Framing

#### 1. `frontend/src/app/layout.tsx` (Lines 9–12)
- **Current Text**:  
  `title: "Pensieve — The Midnight Archive"`  
  `description: "Ask the story. Follow the evidence. An enchanted research archive comparing RAG and Full Context."`
- **Tonal Diagnosis**:  
  "An enchanted research archive comparing RAG and Full Context" reads like an AI trying to pack two clashing keyword vectors (whimsical fantasy + developer documentation) into one meta tag.
- **Recommended Authorial Rewrite**:  
  `title: "Pensieve · The Midnight Archive"`  
  `description: "An archival reading room comparing focused retrieval against total corpus attention. Question the chronicled past; trace every claim to its source folio."`
- **Test Impact**: None.

#### 2. `frontend/src/features/archive/ui/ThresholdTitle.tsx` (Lines 16, 24–27)
- **Current Text**:  
  `Eyebrow: "A chamber of memories"`  
  `Promise: "Ask the story. Follow the evidence."`
- **Tonal Diagnosis**:  
  "Ask the story. Follow the evidence." is an effective slogan, but "Ask the story" leans slightly into formulaic advertising syntax.
- **Recommended Authorial Rewrite**:  
  `Eyebrow: "The Midnight Reading Room"`  
  `Promise: "Question the memory. Trace the evidence to the parchment."`
- **Test Impact**: None directly asserted.

#### 3. `frontend/src/features/archive/ui/ThresholdTitle.tsx` (Lines 46–48)
- **Current Text**:  
  `<span>Seven chronicles on the desk</span>`  
  `<span>A prepared exploration of RAG & Full Context</span>`
- **Tonal Diagnosis**:  
  "A prepared exploration of RAG & Full Context" is an abrupt, sterile machine-generated label jarringly positioned beneath atmospheric threshold typography.
- **Recommended Authorial Rewrite**:  
  `<span>Seven bound chronicles upon the desk</span>`  
  `<span>An empirical study in dual machine recollection: Sifted Retrieval & Whole-Context Attention</span>`
- **Test Impact**: None directly asserted.

#### 4. `frontend/src/features/archive/ui/ThresholdTitle.tsx` (Line 35, Line 42) & `MidnightArchive.tsx` (Line 107)
- **Current Text**:  
  Line 35: `"Enter the Archive ↗"`  
  Line 42: `"Skip to reading desk →"`  
  MidnightArchive.tsx (107): `"Skip directly to Research Desk"`
- **Tonal Diagnosis**:  
  "Skip to reading desk" is utilitarian. "Enter the Archive" is clean, but skip links should maintain dignified accessibility while feeling intentional.
- **Recommended Authorial Rewrite**:  
  Primary Enter: `"Enter the Archive ↗"` (Preserve text for E2E tests!)  
  Skip link: `"Proceed directly to the reading desk →"`  
  Skip link (SR): `"Skip directly to the reading desk"`
- **Test Impact**: **HIGH**. `a11y.spec.ts` (L31), `slice.spec.ts` (L12), `ambient-sound.spec.ts` (L20, L34) assert `"Enter the Archive"`. Keep accessible name intact.

---

### Category B: The Basin & Stage Ritual

#### 5. `frontend/src/features/archive/MidnightArchive.tsx` (Lines 172–180)
- **Current Text**:  
  `<span className="archive-eyebrow">The chamber of memories</span>`  
  `<p>A thought,<br /><em>given form.</em></p>`  
  `<span className="stage-instruction">Choose a chronicle. Ask the archive.</span>`
- **Tonal Diagnosis**:  
  "Choose a chronicle. Ask the archive." is brief, but slightly resembles a smartphone app onboarding tooltip.
- **Recommended Authorial Rewrite**:  
  `Eyebrow: "The Silver Basin"`  
  `Stage Note: "A thought, surrendered to ink."`  
  `Stage Instruction: "Open a chronicle. Inscribe your inquiry upon the desk."`
- **Test Impact**: None.

#### 6. `frontend/src/features/archive/MidnightArchive.tsx` (Lines 202–204)
- **Current Text**:  
  `<button aria-label="Stir the Pensieve"><span aria-hidden="true">≈</span> Touch the silver</button>`
- **Tonal Diagnosis**:  
  "Touch the silver" is evocative, but "Stir the Pensieve" in aria-label is physically descriptive.
- **Recommended Authorial Rewrite**:  
  `Button Text: "≈ Agitate the silver basin"`  
  `Aria-label: "Stir the Pensieve"` (Keep aria-label for E2E compatibility).
- **Test Impact**: **HIGH**. `memory-chamber.spec.ts` (L34) calls `getByRole("button", { name: "Stir the Pensieve" })`. The `aria-label="Stir the Pensieve"` MUST be retained.

#### 7. `frontend/src/features/archive/MidnightArchive.tsx` (Lines 207–209)
- **Current Text**:  
  `<p className="room-unavailable" role="status">The room preview is resting. You can still consult the archive.</p>`
- **Tonal Diagnosis**:  
  **Severe "cutesy" AI trope**: "The room preview is resting." Software does not take naps. Saying a crashed or unsupported WebGL canvas is "resting" is condescending.
- **Recommended Authorial Rewrite**:  
  `<p className="room-unavailable" role="status">The three-dimensional chamber has gone dark in this browser, yet the manuscripts and inquiry desk remain fully open.</p>`
- **Test Impact**: None.

#### 8. `frontend/src/features/archive/MidnightArchive.tsx` (Line 224)
- **Current Text**:  
  `<span className="demo-label">Prepared demonstration</span>`
- **Tonal Diagnosis**:  
  Sounds like an enterprise SaaS demo environment badge ("Prepared demonstration").
- **Recommended Authorial Rewrite**:  
  `<span className="demo-label">Preserved Archival Trial</span>`
- **Test Impact**: None.

#### 9. `frontend/src/features/archive/MidnightArchive.tsx` (Lines 234–237)
- **Current Text**:  
  `<span>Ask the story. Follow the evidence.</span>`  
  `<button type="button">Return to the entrance ↗</button>`
- **Tonal Diagnosis**:  
  "Return to the entrance ↗" is functional.
- **Recommended Authorial Rewrite**:  
  `<span>Every claim bound to its source passage.</span>`  
  `<button type="button">Step back to the threshold ↗</button>`
- **Test Impact**: None.

---

### Category C: The Folio Shelf & Volume Strip

#### 10. `frontend/src/features/archive/ui/VolumeProxies.tsx` (Line 24)
- **Current Text**:  
  `Active Corpus ({selectedVolumeIds.length}/{volumes.length} Selected)`
- **Tonal Diagnosis**:  
  "Active Corpus (1/7 Selected)" is database admin UI jargon. "Corpus" is academic/computational, while "(1/7 Selected)" is tabular multi-select microcopy.
- **Recommended Authorial Rewrite**:  
  `Bound Chronicles ({selectedVolumeIds.length} of {volumes.length} Opened)`
- **Test Impact**: **HIGH**. `a11y.spec.ts` (L32) asserts `getByText("Active Corpus")`. If rewritten, `a11y.spec.ts` must be updated, or an aria-label containing "Active Corpus" preserved.

#### 11. `frontend/src/features/archive/ui/VolumeProxies.tsx` (Line 27)
- **Current Text**:  
  `<span className="text-[10px] text-[#78848f] hidden sm:inline">Click book to summon</span>`
- **Tonal Diagnosis**:  
  "Click book to summon" uncomfortably welds point-and-click instructional jargon ("Click book") with high-fantasy cliché ("to summon"). Books are drawn down, opened, or consulted.
- **Recommended Authorial Rewrite**:  
  `<span className="...">Select a spine to lay open its folios</span>`
- **Test Impact**: None.

#### 12. `frontend/src/features/archive/ui/VolumeProxies.tsx` (Lines 89–93)
- **Current Text**:  
  `{vol.chunks.toLocaleString()} chk`  
  `{vol.pages} pp`
- **Tonal Diagnosis**:  
  "chk" is unvarnished developer slang for RAG vector chunks. In an aesthetic featuring calfskin bindings and gold leaf, "1,412 chk" looks like an unstyled variable dump.
- **Recommended Authorial Rewrite**:  
  `{vol.chunks.toLocaleString()} passages` or `{vol.chunks.toLocaleString()} fragments`  
  `{vol.pages} pp.`
- **Test Impact**: None.

#### 13. `frontend/src/features/archive/mock/volumes.ts` (Lines 18, 34, 50, 66, 82, 98, 114)
- **Current Text**:  
  - Vol I: `"The arrival, the mirror, and the stone beneath the trapdoor."`
  - Vol II: `"Whispers in the pipes, the diary, and the memory preserved in ink."`
  - Vol III: `"The stag, the parchment of secrets, and the four wanderers of the night."`
  - Vol IV: `"The four champions, the graveyard, and the return in the dark."`
  - Vol V: `"The department of mysteries, the glass sphere, and the prophecy."`
  - Vol VI: `"Memories in the basin, the blackened ring, and the silver tower."`
  - Vol VII: `"The tent, the silver doe, the wand of destiny, and King's Cross."`
- **Tonal Diagnosis**:  
  Formulaic tripartite listicles (*"The X, the Y, and the Z"*). Every single volume description uses the exact same template.
- **Recommended Authorial Rewrite**:  
  - Vol I: *"First arrivals, the mirror of longing, and the guardian chambers beneath the trapdoor."*
  - Vol II: *"Serpentine voices in the stone pipes, a memory bound in black ink, and the opened chamber."*
  - Vol III: *"The stag across the lake, the enchanted cartography of the castle, and four wanderers unmasked."*
  - Vol IV: *"The goblet's summons, four contenders, and a midnight graveyard where darkness reconvenes."*
  - Vol V: *"Halls of glass spheres, unspoken prophecies, and rebellion waged in clandestine corridors."*
  - Vol VI: *"Silver basin recollections, the blackened hand, and a tower shattered under the green mark."*
  - Vol VII: *"Exile beneath the forest canopy, a silver patronus in the pool, and the final reckoning at dawn."*
- **Test Impact**: None.

---

### Category D: The Manuscript Leaf & Question Input

#### 14. `frontend/src/features/archive/ui/QuestionLeaf.tsx` (Lines 67–71)
- **Current Text**:  
  `MANUSCRIPT INQUIRY · DESK ENTRY`  
  `Press Ctrl + Enter or strike the wax seal`
- **Tonal Diagnosis**:  
  "Strike the wax seal" is physically unnatural (wax seals are stamped or pressed, not struck like a percussion cap).
- **Recommended Authorial Rewrite**:  
  `MANUSCRIPT INQUIRY · FOLIO ENTRY`  
  `Press Ctrl + Enter or stamp the wax seal`
- **Test Impact**: None.

#### 15. `frontend/src/features/archive/ui/QuestionLeaf.tsx` (Line 78, Line 92)
- **Current Text**:  
  Line 78: `label: "Inscribe your question for the archive"`  
  Line 92: `placeholder="Inscribe a question into the midnight archive..."`
- **Tonal Diagnosis**:  
  Repetitive pseudo-archaic filler ("Inscribe a question into the midnight archive...").
- **Recommended Authorial Rewrite**:  
  `label: "Inscribe your inquiry for the archive"`  
  `placeholder="Pose your question to the chronicled memory..."`
- **Test Impact**: None.

#### 16. `frontend/src/features/archive/ui/QuestionLeaf.tsx` (Line 100)
- **Current Text**:  
  `<span className="...">Catalogued Curiosities:</span>`
- **Tonal Diagnosis**:  
  **AI Trope**: "Catalogued Curiosities" is a standard ChatGPT trope when prompted for "whimsical Victorian naming".
- **Recommended Authorial Rewrite**:  
  `<span className="...">Preserved Inquiries on Record:</span>`
- **Test Impact**: None.

#### 17. `frontend/src/features/archive/ui/QuestionLeaf.tsx` (Lines 120–124)
- **Current Text**:  
  `<span>SCOPE:</span> <span className="...">1 Volume</span>`
- **Tonal Diagnosis**:  
  All-caps technical telemetry label ("SCOPE:").
- **Recommended Authorial Rewrite**:  
  `<span>INQUIRY HORIZON:</span> <span className="...">1 Bound Chronicle</span>`
- **Test Impact**: None.

#### 18. `frontend/src/features/archive/ui/QuestionLeaf.tsx` (Line 132, Line 146)
- **Current Text**:  
  Line 132: `"Cancel inquiry"`  
  Line 146: `{isBusy ? "Consulting..." : "Ask the Archive"}`
- **Tonal Diagnosis**:  
  "Cancel inquiry" sounds like canceling an airline ticket or an HTTP fetch. "Ask the Archive" is good, but "Consulting..." is a plain spinner state.
- **Recommended Authorial Rewrite**:  
  Button: `{isBusy ? "Drawing from the Silver..." : "Ask the Archive"}`  
  Cancel: `"Draw back the inquiry"` (or keep accessible name `"Cancel inquiry"` for tests).
- **Test Impact**: **CRITICAL**. `a11y.spec.ts` (L18), `slice.spec.ts` (L20, L28), `memory-chamber.spec.ts` (L40), and `descent.spec.ts` (L62, L177, L188, L236) assert `"Ask the Archive"` and `"Cancel inquiry"`.

---

### Category E: The Method Astrolabe

#### 19. `frontend/src/features/archive/ui/MethodAstrolabe.tsx` (Lines 14–29)
- **Current Text**:  
  - RAG: `label: "RAG"`, `desc: "Vector search & top-k reranked passages"`, `icon: "✦"`  
  - Compare: `label: "COMPARE"`, `desc: "Twin Tomes: Observe both forms side-by-side"`, `icon: "⚔"`  
  - Full: `label: "FULL CONTEXT"`, `desc: "Complete chronicle held in active attention"`, `icon: "☾"`
- **Tonal Diagnosis**:  
  1. The crossed swords icon `⚔` turns comparative scholarship into a video-game battle.
  2. RAG description is raw database documentation (`"top-k reranked passages"`), while Full Context is poetic (`"held in active attention"`).
- **Recommended Authorial Rewrite**:  
  - RAG: `label: "RAG"`, `desc: "Sifted Retrieval · Vector indexing extracts only the most salient candidate leaves"`, `icon: "✦"`  
  - Compare: `label: "COMPARE"`, `desc: "Twin Folios · Observe targeted retrieval and whole-chronicle attention side-by-side"`, `icon: "⚖"` (or `◈`)  
  - Full: `label: "FULL CONTEXT"`, `desc: "Exhaustive Scope · The complete text held unpruned in active model attention"`, `icon: "☾"`
- **Test Impact**: None (keys and labels remain RAG, COMPARE, FULL CONTEXT).

---

### Category F: The Descent & Dive Overlay

#### 20. `frontend/src/features/archive/ui/DiveOverlay.tsx` (Lines 10–19: In-Flight Stage Copy)
- **Current Text**:  
  - `offering`: `["A thought, set free.", "The ink meets the silver."]`  
  - `approaching`: `["The memory calls.", "Follow your thought beneath the surface."]`  
  - `crossing`: `["Between ink and memory.", "The archive opens within."]`  
  - `within`: `["Within the memory.", "Two ways to remember. One question."]`  
  - `waiting`: `["Within the memory.", "Your inquiry is still in progress."]`  
  - `arriving`: `["A memory, given words.", "Your answer is ready to read."]`
- **Tonal Diagnosis**:  
  - `approaching`: *"The memory calls."* is melodramatic fantasy melodrama.
  - `waiting`: *"Your inquiry is still in progress."* is an automated telephone hold message!
  - `arriving`: *"Your answer is ready to read."* is flat notification filler.
- **Recommended Authorial Rewrite**:  
  - `offering`: `["A question cast into the silver.", "The ink disperses across the surface."]`  
  - `approaching`: `["Parting the surface.", "Descending beneath the mirrored veil."]`  
  - `crossing`: `["Threshold of ink and stone.", "The vaulted stacks receive the inquiry."]`  
  - `within`: `["Among the deep shelves.", "Two forms of machine memory weigh the same past."]`  
  - `waiting`: `["Gathering provenance.", "The folios are turning; citations are anchoring to the text."]`  
  - `arriving`: `["The ink settles.", "The twin tomes have recorded their synthesis."]`
- **Test Impact**: None directly asserted.

#### 21. `frontend/src/features/archive/ui/DiveOverlay.tsx` (Line 140)
- **Current Text**:  
  `<button type="button" className="dive-skip">Skip animation <span aria-hidden="true">↗</span></button>`
- **Tonal Diagnosis**:  
  **Flagrant Fourth-Wall Rupture**: "Skip animation" announces to the user that the pensieve is merely a software CSS animation.
- **Recommended Authorial Rewrite**:  
  `<button type="button" className="dive-skip" aria-label="Skip animation">Emerge to the desk <span aria-hidden="true">↗</span></button>`  
  *(Keep `aria-label="Skip animation"` to ensure Playwright compatibility in `descent.spec.ts` line 256!)*
- **Test Impact**: **HIGH**. `descent.spec.ts` asserts `getByRole("button", { name: "Skip animation" })`. Retaining `aria-label="Skip animation"` while rendering "Emerge to the desk" solves both tone and test stability.

#### 22. `frontend/src/features/archive/ui/DiveOverlay.tsx` (Lines 124–133)
- **Current Text**:  
  `{paused ? "Resume journey" : "Pause journey"}`  
  `<span className="dive-shortcut">Esc · wait at the desk</span>`
- **Tonal Diagnosis**:  
  "Pause journey" / "Resume journey" is serviceable, though slightly video-game-esque.
- **Recommended Authorial Rewrite**:  
  Keep button accessible name as `"Pause journey"` / `"Resume journey"` (asserted in `descent.spec.ts` L38, L53).  
  Shortcut text: `"Esc · emerge directly to the desk"`
- **Test Impact**: **HIGH**. Tested in `descent.spec.ts`.

---

### Category G: Memory Walk 3D Fragments

#### 23. `frontend/src/features/archive/memoryWalk.ts` (Lines 26–38)
- **Current Text**:  
  `title: "A thought, set free"`  
  `label: "YOUR INQUIRY"`  
  `label: run?.data_mode === "mock" ? "PREPARED PARAPHRASE · " + source.book_short : "SOURCE FRAGMENT · " + source.book_short`
- **Tonal Diagnosis**:  
  "PREPARED PARAPHRASE" stamped on floating 3D parchments is sterile technical legal boilerplate.
- **Recommended Authorial Rewrite**:  
  `title: "An Inscribed Question"`  
  `label: "INSCRIBED INQUIRY"`  
  `label: "PREPARED PARAPHRASE · " + source.book_short`  
  *(Note: Must retain prefix `"PREPARED PARAPHRASE"` because `inquiry-unit.mjs` line 52 asserts `assert.ok(fragment.label.startsWith("PREPARED PARAPHRASE"))`!)*
- **Test Impact**: **CRITICAL**. `inquiry-unit.mjs` line 52 will break if `"PREPARED PARAPHRASE"` prefix is removed.

---

### Category H: Twin Tomes & Reading Surfaces

#### 24. `frontend/src/features/archive/ui/TwinTomes.tsx` (Lines 58, 69)
- **Current Text**:  
  Line 58: `✦ The First Tome (RAG)`  
  Line 69: `☾ The Second Tome (Full)`
- **Tonal Diagnosis**:  
  Stiff parenthetical labeling.
- **Recommended Authorial Rewrite**:  
  Line 58: `✦ The Left Tome · Sifted Retrieval`  
  Line 69: `☾ The Right Tome · Total Attention`
- **Test Impact**: None.

#### 25. `frontend/src/features/archive/ui/Tome.tsx` (Lines 50–53, 67–70)
- **Current Text**:  
  `The First Tome · Focused Retrieval`  
  `The Second Tome · Whole Corpus Attention`  
  `{selected_source_count} Filtered Passages`  
  `Prepared Volume Scope`  
  `No prepared evidence`
- **Tonal Diagnosis**:  
  "Filtered Passages" sounds like an email junk filter.
- **Recommended Authorial Rewrite**:  
  `The First Tome · Targeted Vector Retrieval`  
  `The Second Tome · Whole-Chronicle Context`  
  `{selected_source_count} Retrieved Folios`  
  `Bound Volume Context`  
  `No attested evidence in this scope`
- **Test Impact**: None.

#### 26. `frontend/src/features/archive/ui/Tome.tsx` (Lines 83–85)
- **Current Text**:  
  `"An answer is arriving. References will appear as they are verified."`  
  `"The other method remains available while this memory takes shape."`
- **Tonal Diagnosis**:  
  Clean, but could be more authorial.
- **Recommended Authorial Rewrite**:  
  `"The synthesis is taking form. Citations will illuminate as each passage is anchored."`  
  `"The companion tome remains legible while this chronicle is weighed."`
- **Test Impact**: None.

#### 27. `frontend/src/features/archive/ui/Tome.tsx` (Lines 130–145: Technical Footnote)
- **Current Text**:  
  `LATENCY: 1.48s`  
  `INPUT: 1,842 TOKENS`  
  `EST. COST: $0.0011`
- **Tonal Diagnosis**:  
  All-caps terminal telemetry readout.
- **Recommended Authorial Rewrite**:  
  `Response Latency: 1.48s`  
  `Context Window: 1,842 tokens`  
  `Compute Valuation: $0.0011`
- **Test Impact**: None.

---

### Category I: The Gutter Measurement Scale

#### 28. `frontend/src/features/archive/ui/GutterScale.tsx` (Lines 38–41, 46, 66, 88, 95, 110, 114)
- **Current Text**:  
  `⚔ Divergence`  
  `LATENCY: 1.48s / 11.84s`  
  `TOKENS: 1.8k / 107k (~58× context size)`  
  `EST. COST: $0.0011 / $0.268 (~244× illustrative cost)`  
  `EVIDENCE: 3 / 4 Claims`
- **Tonal Diagnosis**:  
  Again, `⚔` (swords) portrays technical trade-offs as mortal combat. All-caps labels mimic raw system monitors.
- **Recommended Authorial Rewrite**:  
  `⟡ Measurement of Trade-Offs` (or `◈ Architectural Divergence`)  
  `Elapsed Time: 1.48s / 11.84s`  
  `Context Footprint: 1.8k / 107k (~58× expansion)`  
  `Simulated Compute: $0.0011 / $0.268 (~244× cost ratio)`  
  `Attested Claims: 3 / 4 Grounded`
- **Test Impact**: None.

---

### Category J: Retrieval Readout & Inquiry Status

#### 29. `frontend/src/features/archive/ui/RetrievalReadout.tsx` (Lines 12–13, 22–30)
- **Current Text**:  
  Line 12: `Memories consulted · illustrative measurements`  
  Line 23: `8 candidates → 3 selected passages`  
  Line 29: `Prepared Volume III scope`  
  Line 30: `No prepared evidence in this scope`
- **Tonal Diagnosis**:  
  "illustrative measurements" is defensive meta-labeling.
- **Recommended Authorial Rewrite**:  
  `Chronicles consulted · architectural metrics`  
  `8 candidate fragments → 3 verified passages`  
  `Complete Volume III chronicle`  
  `No indexed evidence within this horizon`
- **Test Impact**: None.

#### 30. `frontend/src/features/archive/ui/InquiryStatus.tsx` (Lines 6–17)
- **Current Text**:  
  - `"Could not complete"`  
  - `"Cancelled"`  
  - `"Ready to read"`  
  - `"Checking the answer"`  
  - `"Composing the answer"`  
  - `"Preparing passage search"`  
  - `"Assembling the selected scope"`  
  - `"Waiting to begin"`
- **Tonal Diagnosis**:  
  "Checking the answer" sounds like school grading; "Composing the answer" sounds like a generic chatbot generator.
- **Recommended Authorial Rewrite**:  
  - `"Inquiry unfulfilled"`  
  - `"Inquiry recalled"`  
  - `"Open for study"`  
  - `"Verifying citation anchors"`  
  - `"Inscribing synthesized claims"`  
  - `"Querying passage vectors"`  
  - `"Gathering chronicle folios"`  
  - `"Standing ready"`
- **Test Impact**: None directly asserted.

#### 31. `frontend/src/features/archive/ui/InquiryStatus.tsx` (Lines 39–44)
- **Current Text**:  
  `"Reconnecting to the archive…"`  
  `"Prepared demonstration · simulated wait"`  
  `"Consulting the archive"`
- **Tonal Diagnosis**:  
  **Severe meta-awkwardness**: "simulated wait" breaks user immersion completely. It tells the reader they are being forced to sit through an artificial delay.
- **Recommended Authorial Rewrite**:  
  `"Restoring contact with the archive stacks…"`  
  `"Consulting preserved chronicle records…"`  
  `"Consulting the archive…"`
- **Test Impact**: None.

---

### Category K: The Evidence Leaf (Citations Modal)

#### 32. `frontend/src/features/archive/ui/EvidenceLeaf.tsx` (Lines 88–96)
- **Current Text**:  
  `ARCHIVAL SOURCE LEAF · CITATION [{citation.number}]`  
  `Chapter {source.chapter_number}: {source.chapter} · Page {source.page_label} (illustrative)`
- **Tonal Diagnosis**:  
  "(illustrative)" pasted in the title line looks like an apologetic disclaimer.
- **Recommended Authorial Rewrite**:  
  `ARCHIVAL SOURCE LEAF · CITATION [{citation.number}]`  
  `Chapter {source.chapter_number}: {source.chapter} · Folio {source.page_label}`  
  *(Footnote: "Demonstration folio reference")*
- **Test Impact**: **HIGH**. Dialog name `"Memory source"` and region name `/Evidence passage/` are asserted in `descent.spec.ts` (L131, L138) and `slice.spec.ts` (L52). Retain aria-labels.

#### 33. `frontend/src/features/archive/ui/EvidenceLeaf.tsx` (Lines 126, 136, 143)
- **Current Text**:  
  Line 126: `"Linked Claim:"`  
  Line 136: `"Exact quote verified" / "Source passage available"`  
  Line 143: `"Return to tomes (Esc) →"`
- **Tonal Diagnosis**:  
  "Linked Claim:" is database schema nomenclature.
- **Recommended Authorial Rewrite**:  
  Line 126: `"Attested Assertion in Tome:"`  
  Line 136: `"Verbatim passage verified in source"` / `"Contextual passage available"`  
  Line 143: `"Return to reading tomes (Esc) →"`
- **Test Impact**: None.

---

### Category L: Showpiece Copy & Marauder's Map Content

#### 34. `frontend/src/features/archive/mock/marauders-map.ts` (Lines 199–202, 255–257: RAG Branch)
- **Current Text**:  
  Title: `"The Bequest of the Four Wanderers"`  
  Intro: `"Through selective vector retrieval of the third chronicle, the origin and authorship of the parchment resolve across three decisive encounters."`  
  Conclusion: `"RAG successfully isolated the moment of bestowal and the revelation of authorship, but its retrieval boundary excluded the parchment's subsequent confiscation and final return."`
- **Tonal Diagnosis**:  
  - "resolve across three decisive encounters": Formulaic AI analytical prose.
  - "RAG successfully isolated the moment of bestowal...": Robotic system evaluation report.
- **Recommended Authorial Rewrite**:  
  Title: `"The Bequest of the Four Wanderers"` *(Retain for tests: `slice.spec.ts` L40, `descent.spec.ts` L120!)*  
  Intro: *"By querying indexed passages within the third chronicle, selective retrieval recovers the parchment's transmission and authorship across three isolated records."*  
  Conclusion: *"Targeted retrieval accurately captured the gift and unmasked the cartographers with minimal compute; however, boundary limits in passage similarity omitted Lupin's later confiscation and final restitution of the map."*
- **Test Impact**: **CRITICAL**. Title `"The Bequest of the Four Wanderers"` is asserted by exact name in multiple Playwright specs! Title MUST NOT be altered.

#### 35. `frontend/src/features/archive/mock/marauders-map.ts` (Lines 285–288, 341–343, 358–360: Full Context Branch)
- **Current Text**:  
  Title: `"The Complete Provenance of the Parchment"`  
  Intro: `"Holding the entire third volume within active attention reveals both the original gift and the complete narrative arc of the map's ownership."`  
  Claim 4: `"Crucially, after Lupin later confiscated the map during the term, he formally restored it to Harry in his private study upon resigning, cementing Harry's permanent ownership."`  
  Conclusion: `"Full context synthesized the entire timeline: discovery, transmission, secret revelation, and Lupin's closing restoration — at the expense of ~58× higher token volume."`
- **Tonal Diagnosis**:  
  - **Severe AI Trope**: `"Crucially,"` at the start of Claim 4. Classic LLM connective crutch.
  - "synthesized the entire timeline... at the expense of ~58× higher token volume": Stiff, mechanical conclusion.
- **Recommended Authorial Rewrite**:  
  Title: `"The Complete Provenance of the Parchment"` *(Retain for tests: `slice.spec.ts` L43!)*  
  Intro: *"Holding the entire third chronicle in unbroken attention reconstructs not merely the gift, but the complete provenance of the parchment across the school year."*  
  Claim 4: *"When Lupin later confiscated the parchment during the term, the line of possession seemed broken; yet upon resigning his post, he placed the map back into Harry's hands in his quiet study, completing its return."*  
  Conclusion: *"Exhaustive attention recovered the entire narrative sequence—gift, unmasking, confiscation, and restitution. Yet this complete comprehension demanded fifty-eight times the token volume of targeted retrieval."*
- **Test Impact**: **CRITICAL**. Title `"The Complete Provenance of the Parchment"` is asserted in `slice.spec.ts`. Title MUST NOT be altered.

---

### Category M: Uncatalogued / Fallback Inquiries

#### 36. `frontend/src/features/archive/mock/adapter.ts` (Lines 83–95)
- **Current Text**:  
  Line 84: `"This archive demonstration contains a prepared investigation of the Marauder's Map. This question has no prepared answer."`  
  Line 85: `"The prepared Marauder's Map investigation belongs to Volume III. Select The Prisoner of Azkaban to consult its evidence."`  
  Line 90: `"Uncatalogued Inquiry"`  
  Line 94: `"Choose the Marauder's Map suggestion and Volume III to explore the prepared investigation."`
- **Tonal Diagnosis**:  
  "prepared investigation" repeated 3 times in 4 sentences. Flat, repetitive programmer error copy.
- **Recommended Authorial Rewrite**:  
  Title: `"An Unrecorded Passage"`  
  Intro (Wrong question): *"The silver stirs, but this inquiry has no preserved evidence in this demonstration folio."*  
  Intro (Wrong volume): *"The investigation of the Marauder's Map rests in Volume III. Open The Prisoner of Azkaban on the desk to examine its citations."*  
  Conclusion: *"Select the Marauder's Map question and Volume III to watch dual machine recollection in action."*
- **Test Impact**: None.

---

### Category N: Room Settings & Sound Controls

#### 37. `frontend/src/features/archive/ui/RoomSettings.tsx` (Lines 113, 124, 134, 163)
- **Current Text**:  
  `"Quiet reading"`  
  `"Light mode"`  
  `"Ambient sound"`  
  `"Sound is unavailable in this browser."`
- **Tonal Diagnosis**:  
  Clear, but "Quiet reading" benefits from a descriptive tooltip explaining that it settles motion and camera sweeps.
- **Recommended Authorial Rewrite**:  
  Preserve labels `"Quiet reading"` (asserted in `memory-chamber.spec.ts` L25) and `"Ambient sound"` (asserted in `ambient-sound.spec.ts` L23).  
  Add `title="Rest camera motion and still ambient particles"` to Quiet Reading button.
- **Test Impact**: **HIGH**. Tested in Playwright.

---

### Category O: Backend Companion Catalog & Scenarios

#### 38. `backend/app/demo/catalog.py` & `backend/app/demo/scenarios.py`
- **Current Text**:  
  `catalog.py`:  
  - `"An original reading companion"`  
  - `"Test the archive’s limits"`  
  - `"Original companion prose written for this demonstration; not an excerpt or page reference from the novels."`  
  `scenarios.py`:  
  - `"This demonstration has no prepared, supported answer for that question."`  
  - `"Try one of the suggested questions, or consult a different collection."`
- **Tonal Diagnosis**:  
  The backend fiction (`The Lantern Ledger`, `The Mirror of Erised`) is already written with restrained, elegant authorial prose ("The archive values an honest silence more than a beautifully invented answer").  
  However, the fallback scenario in `scenarios.py` L127–129 reverts to IT helpdesk phrasing.
- **Recommended Authorial Rewrite**:  
  Title: `"A Question Left Open"`  
  Intro: *"This collection holds no grounded leaf that answers this inquiry."*  
  Conclusion: *"The keeper leaves unsupported questions in silence rather than inventing an untraceable response. Consult an exemplar query above."*
- **Test Impact**: None.

---

## 4. Internationalization (i18n) & Codebase Architecture Analysis

### Current Status
- **i18n Libraries**: **None**. Neither Next.js native routing nor `next-intl`/`react-intl` are configured.
- **Strings Architecture**: Complete fragmentation. Every string is directly embedded as an inline string literal within JSX tags, callbacks, or Zustand actions.
- **Risk Assessment**:
  1. Any attempt to introduce translations currently requires modifying 18 individual TypeScript and Python files.
  2. Inconsistent terminology develops naturally because identical concepts (e.g., "corpus" vs "chronicle" vs "volume", "chunk" vs "passage" vs "folio") have no single source of truth.

### Architectural Recommendation: Centralized Copy Dictionary (`copy.ts`)
Rather than pulling in heavyweight i18n runtimes for a single-language English portfolio, the recommended path is creating a typed constants module:
`frontend/src/features/archive/copy.ts`
This dictionary should centralize:
- Threshold headers, brand, and subheadings
- Desk instructions and stage notes
- Method descriptions and labels
- Dive stage captions
- Tome and folio descriptors
- Measurement scale and readout labels
- Error fallbacks and uncatalogued inquiry templates

This guarantees vocal unity across all components and enables instant review of the site's authorial tone in a single file.

---

## 5. Test String Coupling Matrix (Crucial for CI Stability)

To ensure the downstream implementation agent does NOT break automated verification (`npm run test:e2e` and `node tests/inquiry-unit.mjs`), here is the authoritative registry of strings that must either remain unchanged in accessibility properties or be updated simultaneously in the corresponding test files:

| Test File | Line | Assertion Type | Target String | Recommendation |
|---|---|---|---|---|
| `tests/a11y.spec.ts` | 7, 30 | `heading` | `"Pensieve"` | Retain exact heading. |
| `tests/a11y.spec.ts` | 18 | `button` | `"Ask the Archive"` | Retain exact button name or aria-label. |
| `tests/a11y.spec.ts` | 31 | `button` | `"Enter the Archive"` | Retain exact button name or aria-label. |
| `tests/a11y.spec.ts` | 32 | `text` | `"Active Corpus"` | Update test or retain aria-label / hidden text. |
| `tests/slice.spec.ts` | 40 | `heading` | `"The Bequest of the Four Wanderers"` | **DO NOT RENAME**. Title asserted verbatim. |
| `tests/slice.spec.ts` | 43 | `heading` | `"The Complete Provenance of the Parchment"` | **DO NOT RENAME**. Title asserted verbatim. |
| `tests/slice.spec.ts` | 47 | `button` | `/Inspect citation \[1\]/` | Retain button format: `Inspect citation [N]`. |
| `tests/slice.spec.ts` | 52 | `region` | `/Evidence passage/` | Retain aria-label prefix: `Evidence passage: ...`. |
| `tests/descent.spec.ts` | 38, 53 | `button` | `"Pause journey"`, `"Resume journey"` | Retain exact button text or aria-label. |
| `tests/descent.spec.ts` | 62, 177 | `button` | `"Cancel inquiry"` | Retain exact button text or aria-label. |
| `tests/descent.spec.ts` | 84, 86 | `button` | `"Start preview"`, `"Hide preview controls −"` | Retain descent lab preview controls. |
| `tests/descent.spec.ts` | 131, 138 | `dialog` | `"Memory source"` | Retain `<dialog aria-label="Memory source">`. |
| `tests/descent.spec.ts` | 172 | `region` | `"Memory journey"` | Retain `<div aria-label="Memory journey">`. |
| `tests/descent.spec.ts` | 256 | `button` | `"Skip animation"` | Retain `aria-label="Skip animation"`. |
| `tests/ambient-sound.spec.ts`| 23 | `button` | `/Ambient sound/` | Retain button text containing "Ambient sound". |
| `tests/ambient-sound.spec.ts`| 30, 44 | `slider` | `"Ambient volume"` | Retain `aria-label="Ambient volume"`. |
| `tests/ambient-sound.spec.ts`| 36 | `region` | `"Research desk"` | Retain `aria-label="Research desk"`. |
| `tests/memory-chamber.spec.ts`| 25 | `button` | `"Quiet reading"` | Retain exact button text. |
| `tests/memory-chamber.spec.ts`| 34 | `button` | `"Stir the Pensieve"` | Retain `aria-label="Stir the Pensieve"`. |
| `tests/inquiry-unit.mjs` | 52 | `unit assert` | `fragment.label.startsWith("PREPARED PARAPHRASE")` | **DO NOT CHANGE PREFIX** in `memoryWalk.ts` line 36. |

---

## 6. Implementation Plan for Next Agents

1. **Step 1: Extract & Centralize Copy**  
   Create `frontend/src/features/archive/copy.ts` holding structured dictionary constants with the approved authorial prose.
2. **Step 2: Component Refactor with Test Preservation**  
   Replace hardcoded inline strings in UI components (`MidnightArchive.tsx`, `ThresholdTitle.tsx`, `DiveOverlay.tsx`, `QuestionLeaf.tsx`, `Tome.tsx`, etc.) with dictionary references. Where user-facing display copy diverges from test selectors, apply the display copy visually while keeping the test-contract text in `aria-label` or accessible names.
3. **Step 3: Eliminate Synthetic Tropes in Data Fixtures**  
   Edit `frontend/src/features/archive/mock/marauders-map.ts` to remove AI connective adverbs (*"Crucially,"*) and formulaic conclusion templates while preserving the asserted titles.
4. **Step 4: Update E2E Specs & Unit Tests**  
   Run `npm run typecheck`, `npm run build`, and `npm run test:e2e` to verify zero regressions.
