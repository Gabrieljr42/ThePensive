# Handoff Report — Explorer Survey 1 (Bug & Functional Survey)

## 1. Observation

1. **Verification Command Executions**:
   - `npm run typecheck` in `frontend/`: Exited with code 0. Zero TypeScript diagnostic errors.
   - `npm run lint` in `frontend/`: Exited with code 0. Zero ESLint violations across 38 files.
   - `node tests/inquiry-unit.mjs` in `frontend/`: Exited with code 0:
     ```
     Inquiry lifecycle, progressive branches, stale responses, 90-second cancellation, scoped evidence, HTTP reconnection and server cancellation: passed.
     (node:23588) [THREE_CJS_DEPRECATED] DeprecationWarning: `require("three")` is deprecated and will be removed.
     ```
   - `node --experimental-strip-types tests/noise-unit.mts` in `frontend/`: Exited with code 0. All deterministic FBM assertions passed.
   - `pytest` in `backend/`: Exited with code 0 (`13 passed, 2 warnings in 2.18s`).
   - `npm run build` in `frontend/`: Initially failed with code 1 when background server was running:
     ```
     Error: EBUSY: resource busy or locked, rmdir 'C:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend\.next\standalone'
     ```
     After terminating PID 27944 / 12528, `npm run build` completed successfully in 7.2s with exit code 0.
   - `npm run test:e2e` in `frontend/`: **28 passed (3.8m)** against a freshly built server.

2. **Console Error on Initial Load**:
   - Launching Playwright against `http://localhost:3000/` captures:
     ```
     ERROR: Failed to load resource: the server responded with a status of 404 (Not Found) at {"url":"http://localhost:3000/favicon.ico"}
     warning: THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
     ```
     Confirmed that no `favicon.ico` exists in `frontend/public/` or `frontend/src/app/`.

3. **Suggestion Pills Interaction Mismatch**:
   - In `frontend/src/features/archive/ui/QuestionLeaf.tsx:47-60`:
     Suggestions include "The Marauder's Map", "The Mirror of Erised" (`What does the Mirror of Erised reveal, and why is it dangerous?`), and "The Philosopher's Stone" (`Why can Harry retrieve the Philosopher's Stone from the mirror?`).
   - In `frontend/src/features/archive/mock/adapter.ts:45-47`:
     ```ts
     const prepared =
       canonical(req.question) === canonical(MARAUDERS_MAP_QUESTION) &&
       selectedVolumes.includes("vol-3");
     ```
     Clicking suggestions 2 and 3 produces `answer_title: "Uncatalogued Inquiry"` with zero evidence.

4. **Corpus Contract Discrepancy**:
   - `frontend/src/features/archive/ui/QuestionLeaf.tsx:40-41`: Submits `corpus_id: "harry-potter-archive"`, `corpus_version: "vol-3-poa"`.
   - `backend/app/demo/catalog.py:6-60`: Defines `wizarding-notes` and `lantern-ledger` (`demo-2026-10-05`).
   - `backend/app/experiments.py:23-27`: Throws `ValueError("The selected collection is not available.")` for `harry-potter-archive`.

5. **Backend State Loss on Cancel & Completion**:
   - In `backend/app/experiments.py:90-103`: `cancel(run_id)` updates `run.status = "cancelled"` in memory on a copy from `repository.get(run_id)`, but never calls `self.repository.save(run)`. A subsequent `GET /api/runs/{run_id}` retrieves the un-cancelled run.

6. **Desktop & Mobile Layout Quirks**:
   - In `frontend/src/app/globals.css:1083-1086`: `.tome-gutter { width: 64px; flex-shrink: 0; }`.
   - In `frontend/src/features/archive/ui/GutterScale.tsx:35`: Container has `w-28` (112px wide), creating a 48px visual overflow on desktop (>=1280px).
   - In `frontend/src/features/archive/ui/TwinTomes.tsx:91-95`: Mobile layout retains an empty `.tome-gutter` div with `gap-6` (24px) below the active tome tab.
   - In `frontend/src/features/archive/ui/CitationMark.tsx:66` and `EvidenceLeaf.tsx:103`: Touch targets are ~22px × 18px and ~20px × 20px, below WCAG 24px/44px minimums.

---

## 2. Logic Chain

1. **Build & Test Pipeline Reliability**:
   - Observation 1 demonstrates that all codebases (`frontend/` and `backend/`) currently pass typechecking, linting, unit tests, and all 28 Playwright E2E tests once the locked background process is cleared.
   - However, because `scripts/start-production.mjs` executes `node .next\standalone\server.js`, running `next build` while production is running produces an unhandled `EBUSY` error that corrupts the static files of the running server.
   - Therefore, a process management or pre-build step is required to guarantee reliable automated quality checks.

2. **Automated Quality Criteria Compliance**:
   - Acceptance Criteria state: *"The browser console records zero uncaught errors or unhandled promise rejections during key interactions"*.
   - Observation 2 demonstrates that navigating to `/` logs an uncaught 404 console error for `/favicon.ico`.
   - Therefore, adding `favicon.ico` is mandatory to satisfy the automated quality criteria.

3. **Curated User Experience & Functional Expectations**:
   - Observation 3 shows that curated suggestion pills in `QuestionLeaf.tsx` trigger "Uncatalogued Inquiry" responses because `mockArchiveAdapter` only knows `MARAUDERS_MAP_QUESTION`.
   - Users interacting with the application's prominent suggestion buttons perceive this as a broken feature.
   - Therefore, the mock adapter must be expanded with scenarios for the other two curated questions.

4. **Integration & API Cohesion**:
   - Observation 4 shows that frontend requests and backend catalog entries use differing corpus identifiers (`harry-potter-archive` vs `wizarding-notes`).
   - If the frontend connects to the backend API via HTTP proxy, inquiries fail with HTTP 422.
   - Observation 5 shows that server cancellation is lost between requests because `ExperimentService` mutates run snapshots without saving.
   - Therefore, backend persistence and contract synchronization are required before enabling HTTP transport.

5. **Responsive Typography & Layout Quality**:
   - Observation 6 shows that on desktop (>=1280px), `GutterScale` is 112px inside a 64px wrapper, overlapping tomes.
   - On mobile, an empty gutter creates redundant vertical gaps, and touch targets fall below recommended touch sizes.
   - Therefore, layout styles and touch padding must be calibrated to ensure balanced responsive hierarchy without overlap.

---

## 3. Caveats

1. The backend API is not currently wired as the default frontend transport (`demoInquiryTransport` is active by default). Backend investigation was conducted directly on source and pytest.
2. No live database was configured (`DATABASE_URL` was unset); backend tests ran against `MemoryRunRepository`.
3. High-load stress testing (e.g. dozens of simultaneous users) was not tested.

---

## 4. Conclusion

The Pensieve portfolio codebase has strong architectural fundamentals: TypeScript typecheck, ESLint, Python pytest, unit test scripts, and all 28 Playwright E2E tests pass cleanly under correct runtime conditions.

To satisfy Requirement R1 and Automated Quality criteria, 7 primary remediations must be enacted:
1. Provide `favicon.ico` to eliminate the 404 console error.
2. Update build/start scripts to prevent Windows `EBUSY` standalone collisions.
3. Align `mock/adapter.ts` with all three suggestion pills on the desk.
4. Align frontend and backend corpus naming contracts (`harry-potter-archive`).
5. Persist run cancellations and completions in `backend/app/experiments.py`.
6. Fix the 48px `GutterScale` desktop overlap (`width: 112px`) and remove empty mobile gutter spacing.
7. Increase touch targets on citation marks and dialog dismiss buttons for mobile viewports.

---

## 5. Verification Method

To independently verify these findings:

1. **Typecheck**:
   ```powershell
   cd frontend
   npm run typecheck
   ```
   *Expected*: Code 0, zero diagnostic errors.

2. **Lint**:
   ```powershell
   cd frontend
   npm run lint
   ```
   *Expected*: Code 0, zero lint errors.

3. **Unit Tests**:
   ```powershell
   cd frontend
   node tests/inquiry-unit.mjs
   node --experimental-strip-types tests/noise-unit.mts
   ```
   *Expected*: Code 0, all assertions pass.

4. **Backend Tests**:
   ```powershell
   cd backend
   .venv\Scripts\pytest
   ```
   *Expected*: Code 0, 13 passed.

5. **Full Production Build & E2E**:
   ```powershell
   # Ensure no stale node server holds port 3000 / .next
   Stop-Process -Name node -ErrorAction SilentlyContinue
   cd frontend
   npm run build
   # Start server and run Playwright suite
   $server = Start-Process node -ArgumentList "scripts\start-production.mjs" -PassThru
   npm run test:e2e
   Stop-Process -Id $server.Id
   ```
   *Expected*: Code 0, 28 passed.

6. **Console Error Check**:
   Inspect Chrome DevTools on `http://localhost:3000/` to confirm `/favicon.ico` 404.
