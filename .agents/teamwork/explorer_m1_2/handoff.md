# Handoff Report: Features F3 & F4 (Mock Scenarios & Backend Contracts)

**Agent**: Explorer M1_2  
**Date**: 2026-10-07  
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_2`  
**Milestone**: M1 (Architecture & Bug Remediation)  
**Deliverables**: `plan.md`, `handoff.md`, `progress.md`

---

## 1. Observation

### 1.1 Suggestion Pill Scenarios (Feature F3)
- In `frontend/src/features/archive/ui/QuestionLeaf.tsx:47-60`, three suggestion buttons are rendered under "Catalogued Curiosities":
  1. `"The Marauder's Map"` (`q: MARAUDERS_MAP_QUESTION`)
  2. `"The Mirror of Erised"` (`q: "What does the Mirror of Erised reveal, and why is it dangerous?"`)
  3. `"The Philosopher's Stone"` (`q: "Why can Harry retrieve the Philosopher's Stone from the mirror?"`)
- In `frontend/src/features/archive/mock/adapter.ts:45-47`, `mockArchiveAdapter.createRun()` only tests:
  ```typescript
  const prepared =
    canonical(req.question) === canonical(MARAUDERS_MAP_QUESTION) &&
    selectedVolumes.includes("vol-3");
  ```
  When questions 2 or 3 are submitted, `adapter.ts:83-110` generates an `"Uncatalogued Inquiry"` branch with `"insufficient_evidence: true"`, `"claims: []"`, and `"introduction: This archive demonstration contains a prepared investigation of the Marauder's Map. This question has no prepared answer."`.
- In `QuestionLeaf.tsx:107-109`, clicking suggestion pills only calls `setQuestion(item.q)`. `selectedVolumeIds` defaults to `["vol-3"]` (`frontend/src/features/archive/store.ts:85`). Since questions 2 and 3 belong to Volume I (`"vol-1"`), users also experience an unselected volume condition unless manually toggling Volume I on the shelf.
- In `frontend/src/features/archive/memoryWalk.ts:14-40`, `memoryFragments(run, question)` extracts floating fragments from `run.sources` and `branch.context.source_ids`. For uncatalogued runs, `sources` is empty (`sources: []`), leaving the 3D descent canvas without floating folio citations.

### 1.2 Corpus Identifier Contracts & Backend Persistence (Feature F4)
- In `frontend/src/features/archive/ui/QuestionLeaf.tsx:40-41` and `frontend/tests/inquiry-unit.mjs:37-38`, inquiry requests submit:
  ```typescript
  corpus_id: "harry-potter-archive",
  corpus_version: "vol-3-poa"
  ```
- In `backend/app/demo/catalog.py:5-60`, `CORPORA` only defines:
  - `id: "wizarding-notes"`, `version: "demo-2026-10-05"`
  - `id: "lantern-ledger"`, `version: "demo-2026-10-05"`
- In `backend/app/experiments.py:23-27`:
  ```python
  corpus = get_corpus(request.corpus_id)
  if corpus is None:
      raise ValueError("The selected collection is not available.")
  if corpus.version != request.corpus_version:
      raise ValueError("The collection version has changed. Select the collection again.")
  ```
  If frontend transport connects via HTTP (`createHttpInquiryTransport`), `POST /api/runs` fails with HTTP 422: `"The selected collection is not available."`.
- In `backend/app/experiments.py:60-88`, `ExperimentService.view(run_id)` loads `run = self.repository.get(run_id)`, mutates branch and run status to `"complete"`, but **never calls `self.repository.save(run)`**. As verified in `backend/app/repository.py:23-25`, `MemoryRunRepository.get()` returns a `model_copy(deep=True)`. Mutations on that copy are lost in repository storage.
- In `backend/app/experiments.py:90-103`, `ExperimentService.cancel(run_id)` executes `run = self.view(run_id)`. If `elapsed >= 2.8`, `view()` marks `run.status = "complete"`. `cancel()` returns without calling `self.repository.save(run)`. Since `view()` never saved completion, the repository copy remains permanently stuck in `"running"`.

---

## 2. Logic Chain

1. **User Experience Continuity (F3)**:
   - When a reader encounters prominent suggestion pills on the archival desk, clicking any pill should display a fully supported inquiry.
   - Volume I contains the canonical passages for the Mirror of Erised and the Philosopher's Stone.
   - Creating `mirror-of-erised.ts` and `philosophers-stone.ts` with verified source passages, retrieval traces, RAG branches, and Full Context branches provides complete symmetry with `marauders-map.ts`.
   - Modifying `adapter.ts:createRun` to recognize both Volume I questions and mapping citation start/end offsets via `source.text.indexOf(citation.excerpt)` guarantees structural integrity and zero 404 evidence lookups.
   - Updating `QuestionLeaf.tsx` suggestion button handlers to call `selectSingleVolume(item.volumeId)` ensures the UI shelf proxy immediately aligns with the question's scope.

2. **API & Contract Synchronization (F4)**:
   - To make the frontend and backend interoperable without breaking existing backend tests, `backend/app/demo/catalog.py` must register `harry-potter-archive` with version `"vol-3-poa"`.
   - Adding `src-poa-ch10-gift`, `src-poa-ch10-creators`, `src-poa-ch18-identities`, and `src-poa-ch22-return` to `SOURCES` in `catalog.py` under `harry-potter-archive` allows `make_branch()` in `scenarios.py` to construct valid branches for `key == "marauder"`.
   - Keeping `wizarding-notes` as `CORPORA[0]` ensures that all 13 existing backend pytest assertions (which reference `CORPORA[0]`) continue to execute with zero test failures.
   - Allowing `"vol-1-ps"`, `"vol-3-poa"`, and `"1997-2007-chronicles"` in `experiments.py:create()` ensures that requests from both test harnesses and interactive UI are accepted cleanly without version mismatches.

3. **State Persistence Guarantees (F4)**:
   - In `experiments.py:view()`, invoking `self.repository.save(run)` whenever `run.status == "complete"` guarantees that completed states are persisted to both `MemoryRunRepository` and `PostgresRunRepository`.
   - Checking `if run.status in ("complete", "cancelled"): return run` at the beginning of `view()` prevents redundant elapsed-time simulation and guarantees idempotent reads.

---

## 3. Caveats

- **Scope Multi-Selection**: If a reader selects *both* `vol-1` and `vol-3`, the mock adapter currently selects the scenario matching the canonical question and scopes the run to that volume. Cross-volume inquiries remain uncatalogued demonstrations.
- **OpenAPI Schema Default**: `contracts/openapi.json` defines `/api/demo` with `default: "wizarding-notes"`. Retaining `wizarding-notes` in backend `CORPORA` ensures full backward compatibility with the OpenAPI specification and any existing clients.
- **Tone Alignment**: Mock prose drafted in `plan.md` utilizes authentic, grounded archival English, but will undergo further fine-tuning by Explorer M2 during the Milestone 2 De-AI pass.

---

## 4. Conclusion

1. Feature F3 is fully designed with complete data models for suggestions 2 and 3 ("The Mirror of Erised" and "The Philosopher's Stone") across Volume I, including exact citation offsets, 3D retrieval coordinates, realistic metrics, and floating memory fragments.
2. Feature F4 establishes full contract synchronization by introducing `harry-potter-archive` (`vol-3-poa`) to the backend catalog with exact source passages and scenario branches, while resolving persistence leakage in `experiments.py` via `self.repository.save(run)`.
3. The complete implementation blueprints, exact code diffs, and test suites are codified in `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_2\plan.md`.

---

## 5. Verification Method

### 5.1 Automated Backend Verification
Run pytest from the backend root directory:
```powershell
cd c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\backend
.venv\Scripts\pytest -v
```
**Verification Conditions**:
- All existing 13 tests pass.
- New tests `test_completed_run_persists_to_repository` and `test_cancel_persists_to_repository` pass.
- Parametrized test `test_every_prepared_answer_has_exact_supplied_source_spans` passes for `harry-potter-archive` as well as `wizarding-notes` and `lantern-ledger`.

### 5.2 Automated Frontend Verification
Run the unit test runner and typecheck from the frontend root directory:
```powershell
cd c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend
node tests/inquiry-unit.mjs
npm run typecheck
```
**Verification Conditions**:
- `inquiry-unit.mjs` exits with code 0, verifying:
  - Marauder's Map (`vol-3`), Mirror of Erised (`vol-1`), and Philosopher's Stone (`vol-1`) runs return complete branches with verified citations.
  - Verbatim excerpt checks: `source.text.slice(start_offset, end_offset) === excerpt`.
  - Evidence retrieval succeeds for all citation IDs across all three runs.
  - Mismatched volume scopes return 0 sources and helpful guidance messages.
- `tsc --noEmit` exits with code 0 (zero diagnostic errors).
