# Comprehensive Bug & Functional Survey Report
**Pensieve Portfolio — Midnight Archive Audit**
**Author**: Explorer Survey 1 (Bug & Functional Survey)
**Date**: 2026-10-07
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve`

---

## 1. Executive Summary

This survey maps and analyzes the bug landscape, functional stability, testing harnesses, and layout responsiveness across the Pensieve portfolio to support Requirement R1 and Automated Quality criteria.

The audit verified all prescribed commands:
- `npm run typecheck` in `frontend/`: **Passed (0 TypeScript errors)**.
- `npm run lint` in `frontend/`: **Passed (0 ESLint errors/warnings)**.
- `node tests/inquiry-unit.mjs` in `frontend/`: **Passed (0 errors)** with a deprecation notice for Three.js CommonJS imports.
- `node --experimental-strip-types tests/noise-unit.mts` in `frontend/`: **Passed (0 errors)**.
- `pytest` in `backend/`: **Passed (13/13 tests passed)** with 2 pytest-cache / Starlette warnings.
- `npm run build` in `frontend/`: **Passes when unblocked**, but systematically fails with `EBUSY` when a background standalone server instance holds a file lock on `server.js`.
- `npm run test:e2e` in `frontend/`: **28 of 28 Playwright tests pass** when running against a cleanly built production instance.

A total of **15 distinct bugs, fragile logic areas, and layout glitches** have been cataloged below, categorized by severity, with exact file citations and actionable remediation proposals.

---

## 2. Codebase Architecture & Test Harness Map

| Subsystem | Directory / Key Files | Purpose & Tech Stack | Current Status |
|---|---|---|---|
| **Frontend Framework** | `frontend/src/app` | Next.js 16.3.8 (App Router), React 19.2.0, Tailwind CSS 4.3.3 | Typechecks cleanly. Routes: `/` (home/threshold), `/ask` (direct desk), `/lab/descent` (preview harness), `/api/[...path]` (FastAPI proxy). |
| **Archive Feature** | `frontend/src/features/archive` | Zustand 5.0.15 store, Three.js 0.186, React Three Fiber 9.8.1, GSAP 3.15 | Complete 3D room, cinematic descent journey, twin tomes reading layout, and interactive provenance threads. |
| **Backend Service** | `backend/app` | FastAPI, Python 3.12, Pydantic v2 | Mock/prepared demonstration API with runs, evidence extraction, corpus catalog, and OpenAPI contract generator. |
| **Contracts** | `contracts/openapi.json`, `frontend/src/lib/generated/api.ts` | OpenAPI schema contract defining data models | In sync with backend models, but out of sync with frontend mock adapter corpus naming. |
| **E2E Suite** | `frontend/tests/*.spec.ts` | Playwright 1.58.2 (Chrome channel) | 28 automated tests covering accessibility (axe-core), ambient sound, 3D frame stats, descent stages, memory chamber, performance budgets, and screenshots. |
| **Unit Test Scripts**| `frontend/tests/inquiry-unit.mjs`, `noise-unit.mts` | Node.js unit assertions | Fast in-memory tests for store lifecycle, abort handling, and deterministic procedural noise. |

---

## 3. Verification Commands Analysis

### 3.1 Frontend Typecheck (`npm run typecheck`)
- **Command**: `tsc --noEmit`
- **Result**: Exit code 0. Zero TypeScript diagnostic errors.

### 3.2 Frontend Linting (`npm run lint`)
- **Command**: `eslint .`
- **Result**: Exit code 0. ESLint 9 flat config cleanly validated all components without warnings.

### 3.3 Inquiry Store & Transport Unit Test (`node tests/inquiry-unit.mjs`)
- **Command**: `node tests/inquiry-unit.mjs`
- **Result**: Exit code 0. Tested inquiry lifecycle, progressive branch rendering, 90-second timeouts, scoped evidence validation, HTTP reconnection, and server cancellation.
- **Diagnostics**: Triggered `[THREE_CJS_DEPRECATED] DeprecationWarning: require("three") is deprecated and will be removed.` due to commonjs transpile helper in test runner.

### 3.4 Noise & Scene Geometry Unit Test (`node --experimental-strip-types tests/noise-unit.mts`)
- **Command**: `node --experimental-strip-types tests/noise-unit.mts`
- **Result**: Exit code 0. Validated deterministic FBM noise, tier gate start conditions, candle still-light, and shelf layouts.

### 3.5 Backend Pytest (`pytest`)
- **Command**: `.venv\Scripts\pytest`
- **Result**: Exit code 0 (13 passed in 2.18s).
- **Diagnostics**:
  - `StarletteDeprecationWarning: Using httpx with starlette.testclient is deprecated; install httpx2 instead.`
  - `PytestCacheWarning: could not create cache path ...\.pytest_cache\v\cache\nodeids: [WinError 5] Acesso negado.`

### 3.6 Frontend Production Build (`npm run build`)
- **Command**: `next build --webpack`
- **Result**: Exit code 0 when clean.
- **Failure Mode Observed**: When process running `scripts/start-production.mjs` is active, Next.js aborts with `EBUSY: resource busy or locked, rmdir '...frontend\.next\standalone'` after wiping `.next/static`.

### 3.7 Playwright E2E Suite (`npm run test:e2e`)
- **Command**: `playwright test`
- **Result**: **28 passed (3.8m)** when executed against a freshly built production server.

---

## 4. Comprehensive Bug & Functional Issue Catalog

### Bug 1: Windows File-Lock Build Collision & Asset Deletion Corruption (`EBUSY`)
- **Severity**: High (Build / Operational Failure)
- **Location**: `frontend/scripts/start-production.mjs:24`, `frontend/package.json:7-8`
- **Root Cause**: On Windows, running `next build` attempts to remove `.next` recursively. If `node scripts/start-production.mjs` is executing, `node .next\standalone\server.js` holds a file lock on Windows file handles. Next.js deletes `.next/static` before hitting the lock on `standalone`, causing the build to fail with `EBUSY` and leaving the existing server with missing static chunks (404 for all client JS).
- **Impact**: Breaks automated build pipelines and causes cascading timeouts across all Playwright E2E tests.
- **Remediation**:
  1. Add a pre-build hook or termination step that checks if the standalone process is listening on the test port and stops it before running `next build`.
  2. Implement atomic build output directories or graceful server shutdown before build execution.

---

### Bug 2: Missing `/favicon.ico` Triggering Uncaught 404 Console Errors
- **Severity**: Medium (Automated Acceptance Criteria Violation)
- **Location**: `frontend/public/`
- **Root Cause**: Next.js automatically responds to browser `/favicon.ico` probes. No favicon file is present in `frontend/public` or `frontend/src/app`.
- **Observed Log**: `Failed to load resource: the server responded with a status of 404 (Not Found) at http://localhost:3000/favicon.ico`.
- **Impact**: Violates Acceptance Criterion: *"The browser console records zero uncaught errors or unhandled promise rejections during key interactions"*.
- **Remediation**: Place an SVG or ICO favicon at `frontend/src/app/favicon.ico` representing the pensieve brand circle (`◌`).

---

### Bug 3: Deprecated `THREE.Clock` Runtime Console Warning
- **Severity**: Low-Medium (Console Noise / Future Deprecation)
- **Location**: Three.js clock instantiation in client bundle
- **Root Cause**: Three.js version 0.186+ deprecated `THREE.Clock` in favor of `THREE.Timer`.
- **Observed Log**: `warning: THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`
- **Impact**: Logs deprecation warnings into the browser console on every page load (`/`, `/?at=desk`, `/ask`, `/lab/descent`).
- **Remediation**: Replace `THREE.Clock` instances with `THREE.Timer` or rely on React Three Fiber's native `clock` from `useThree()` and delta arguments from `useFrame`.

---

### Bug 4: CommonJS `require("three")` Deprecation in Unit Test Runner
- **Severity**: Low (Test Harness Diagnostic)
- **Location**: `frontend/tests/inquiry-unit.mjs:10-21`
- **Root Cause**: `inquiry-unit.mjs` transpiles TypeScript files on the fly into CommonJS using `ts.ModuleKind.CommonJS`, which generates `require("three")`. Three.js 0.186 issues a runtime warning on CommonJS require.
- **Observed Log**: `(node:23588) [THREE_CJS_DEPRECATED] DeprecationWarning: require("three") is deprecated and will be removed.`
- **Remediation**: Update the test harness transpile options to preserve ESM or transpile to ES2022 modules with dynamic `import()`.

---

### Bug 5: Catalogued Suggestion Pills Failure (2 of 3 Suggestions Fail)
- **Severity**: High (Broken User Interaction)
- **Location**: `frontend/src/features/archive/ui/QuestionLeaf.tsx:47-60`, `frontend/src/features/archive/mock/adapter.ts:45-47`
- **Root Cause**: `QuestionLeaf.tsx` displays three suggestion buttons under "Catalogued Curiosities":
  1. *The Marauder's Map*
  2. *The Mirror of Erised* (`What does the Mirror of Erised reveal, and why is it dangerous?`)
  3. *The Philosopher's Stone* (`Why can Harry retrieve the Philosopher's Stone from the mirror?`)
  However, `mockArchiveAdapter.createRun()` in `adapter.ts` only recognizes `MARAUDERS_MAP_QUESTION`:
  ```ts
  const prepared = canonical(req.question) === canonical(MARAUDERS_MAP_QUESTION) && selectedVolumes.includes("vol-3");
  ```
  When the user clicks suggestions 2 or 3, the adapter produces an "Uncatalogued Inquiry" branch declaring "This question has no prepared answer", even though complete responses exist in `backend/app/demo/scenarios.py`.
- **Impact**: Direct user interaction failure—prominent curated buttons on the desk lead to empty uncatalogued responses.
- **Remediation**: Port the scenario branches for "The Mirror of Erised" and "The Philosopher's Stone" into `frontend/src/features/archive/mock/adapter.ts` so all suggestions render verified evidence and claims.

---

### Bug 6: Contract Desynchronization Between Frontend and Backend Corpora
- **Severity**: High (API Incompatibility)
- **Location**: `frontend/src/features/archive/ui/QuestionLeaf.tsx:40-41`, `backend/app/demo/catalog.py:5-60`, `backend/app/experiments.py:23-27`
- **Root Cause**: When submitting an inquiry, the frontend passes:
  `corpus_id: "harry-potter-archive"`, `corpus_version: "vol-3-poa"`.
  The backend FastAPI service defines:
  `wizarding-notes` (`demo-2026-10-05`) and `lantern-ledger` (`demo-2026-10-05`).
  If the frontend uses `createHttpInquiryTransport` to query `/api/runs`, FastAPI rejects the request with HTTP 422: `The selected collection is not available.`
- **Impact**: Full break in backend API integration.
- **Remediation**: Add `harry-potter-archive` with version `vol-3-poa` to `backend/app/demo/catalog.py` and implement its matching scenarios.

---

### Bug 7: Backend `ExperimentService` Cancellation & Completion Persistence Loss
- **Severity**: High (State Desynchronization)
- **Location**: `backend/app/experiments.py:61-88, 90-103`, `backend/app/repository.py:18-25`
- **Root Cause**: In `experiments.py`, `service.cancel(run_id)` updates `run.status = "cancelled"` on an in-memory deep copy returned by `repository.get(run_id)`, but **never calls `repository.save(run)`**. Similarly, `view()` does not persist the completed status back to `repository`.
- **Impact**: If a client sends `POST /api/runs/{id}/cancel` and subsequently polls `GET /api/runs/{id}`, the backend returns the un-cancelled run from the repository, which is still marked `"running"` or transitions to `"complete"`.
- **Remediation**: Call `self.repository.save(run)` in `ExperimentService.cancel()` and when `view()` finalizes branch completions.

---

### Bug 8: Navigation URL State Desynchronization and Broken History
- **Severity**: Medium (Navigation & Refresh State Loss)
- **Location**: `frontend/src/features/archive/MidnightArchive.tsx:153-160`, `frontend/src/features/archive/director.ts:60-114`, `frontend/src/app/page.tsx:7-12`
- **Root Cause**:
  1. Entering the archive (`archiveDirector.enterArchive()`) transitions the internal Zustand phase to `"approaching"` then `"desk"`, but does not update the browser URL (which remains `/`). Refreshing resets the user to the entrance.
  2. Clicking "Return to the entrance" or the brand logo calls `archiveDirector.resetView()` with `event.preventDefault()`, leaving the browser URL at `/?at=desk`. Refreshing immediately navigates back to the desk.
  3. The browser Back and Forward buttons do not navigate between entrance and reading desk because `window.history.pushState` or Next.js router integration is omitted.
- **Remediation**: Integrate `window.history.pushState` or Next.js `useRouter` within `director.enterArchive()` and `director.resetView()` so that URL search params reflect the current room state.

---

### Bug 9: Stale Snapshot Check in `diveDirector.skip()`
- **Severity**: Medium (Fragile Logic)
- **Location**: `frontend/src/features/archive/diveDirector.ts:231-239`
- **Root Cause**:
  ```ts
  const state = useArchiveStore.getState();
  const id = state.requestId;
  ...
  state.setDivePhase(id, "idle");
  if (state.divePhase !== "idle") focusReading(id);
  ```
  `focusReading(id)` relies on `state.divePhase` being the stale value from before `setDivePhase`. If `state` were refreshed from `useArchiveStore.getState()`, `state.divePhase !== "idle"` would evaluate to `false`, silently breaking focus transfer to `#archive-reading-tomes`.
- **Remediation**: Store the condition explicitly:
  ```ts
  const wasDiving = state.divePhase !== "idle";
  state.setDivePhase(id, "idle");
  if (wasDiving) focusReading(id);
  ```

---

### Bug 10: Desktop Layout Glitch — GutterScale Width Mismatch & Overlap
- **Severity**: Medium (Visual & Layout Defect on Desktop >= 1280px)
- **Location**: `frontend/src/features/archive/ui/TwinTomes.tsx:91-95`, `frontend/src/features/archive/ui/GutterScale.tsx:35`, `frontend/src/app/globals.css:1083-1086`
- **Root Cause**: In `globals.css`, `.tome-gutter` has `width: 64px; flex-shrink: 0;`. Inside it, `GutterScale.tsx` renders `<div className="... w-28 ...">` (`w-28` = 112px). The child card is 48px wider than its container, causing it to overflow by 24px on each side and encroach upon both twin tomes.
- **Remediation**: Update `.tome-gutter` in `globals.css` to match `width: 112px;` (or `width: 7rem;`), matching the card's dimensions.

---

### Bug 11: Mobile Layout Glitch — Residual Empty Gutter Element in Compare View
- **Severity**: Low-Medium (Mobile Layout Spacing)
- **Location**: `frontend/src/features/archive/ui/TwinTomes.tsx:91-95`, `frontend/src/app/globals.css:1162-1165`
- **Root Cause**: On mobile viewports (< 1280px), `TwinTomes.tsx` stacks tomes vertically with `gap-6`. Although `GutterScale` has `hidden xl:flex`, its parent `<div className="tome-gutter">` remains in the DOM with `width: auto`, introducing an unwanted empty flex node and extra vertical spacing.
- **Remediation**: In `TwinTomes.tsx`, add `hidden xl:block` to the `.tome-gutter` container.

---

### Bug 12: Mobile Accessibility — Undersized Touch Targets on Citation Marks and Close Button
- **Severity**: Medium (Mobile Usability & WCAG Target Size)
- **Location**: `frontend/src/features/archive/ui/CitationMark.tsx:66-73`, `frontend/src/features/archive/ui/EvidenceLeaf.tsx:103-106`
- **Root Cause**:
  - Citation mark buttons (`[1]`) have `px-1.5 py-0.5 text-[11px]`, resulting in a tiny hit area (~22px × 18px).
  - The evidence dialog close button (`✕`) has `p-1 text-sm` (~20px × 20px).
  Both violate WCAG 2.5.8 (minimum 24px) and modern mobile usability guidelines (44px touch targets).
- **Remediation**: Use pseudo-elements (`::before`) with `min-width: 44px; min-height: 44px;` or expand touch padding on pointer-coarse screens to guarantee reliable mobile tapping.

---

### Bug 13: Misleading "Light mode" Toggle Operating as Engine Throttler
- **Severity**: Low-Medium (User Expectation & Semantics)
- **Location**: `frontend/src/features/archive/ui/RoomSettings.tsx:115-125`, `frontend/src/features/archive/store.ts:101, 289`
- **Root Cause**: The room settings header offers a "Light mode" toggle. In reality, it does not apply a light parchment color theme to the UI; it only sets the 3D rendering tier to "low", disables shadow mapping, and strips dust particles.
- **Remediation**: Re-label the button to "Low energy" / "Performance mode", or implement an authentic archival light parchment reading theme when active.

---

### Bug 14: Uncleaned Texture Cloning in `NoisyStandardMaterial.tsx` (GPU Leak)
- **Severity**: Medium (Performance & WebGL Memory Leak)
- **Location**: `frontend/src/features/archive/scene/noiseTexture.ts:48-58`, `frontend/src/features/archive/scene/NoisyStandardMaterial.tsx:61-65`
- **Root Cause**: `sharedNoiseMap()` calls `.clone()` on the cached noise texture during `useMemo`. When materials re-render across quality tier or phase transitions, these cloned `THREE.Texture` objects are never disposed via `map.dispose()`.
- **Remediation**: Add a cleanup `useEffect(() => () => map.dispose(), [map])` in `NoisyStandardMaterial.tsx` or share texture transformations via shader uniforms rather than texture cloning.

---

### Bug 15: Overly Saturated Flame Shader (Anti-Cliché & Requirement R3 Violation)
- **Severity**: Medium (Aesthetic & Material Art Direction)
- **Location**: `frontend/src/features/archive/scene/Candle.tsx:34-42`
- **Root Cause**: The candle flame shader blends an intense saturated electric blue (`vec3(0.16, 0.36, 0.95)`) with additive blending. This yields a synthetic high-temperature blowtorch appearance rather than the gentle, organic illumination of a beeswax candle in a scholarly library.
- **Remediation**: Rework flame gradient to warm amber-gold with subtle smoky dissipation, matching Requirement R3.

---

## 5. Verification Matrix Summary

| Test / Command | Scope | Pass / Fail | Root Cause of Any Issue |
|---|---|---|---|
| `npm run typecheck` | Frontend TypeScript | **PASS** | No errors |
| `npm run lint` | Frontend ESLint | **PASS** | No errors |
| `node tests/inquiry-unit.mjs` | Store & Transport logic | **PASS** | Deprecated CJS Three.js warning |
| `node --experimental-strip-types tests/noise-unit.mts` | Noise & Layout math | **PASS** | No errors |
| `pytest` in `backend/` | Backend API & citations | **PASS** | Minor Starlette / cache warnings |
| `npm run build` | Frontend Webpack & SSR | **PASS** (when unblocked) | Failed with `EBUSY` when standalone server was running |
| `npm run test:e2e` | Full Playwright E2E (28 tests) | **PASS (28/28)** | Passed against fresh build |
| Responsive Layout: Mobile (<=480px) | 375px, 390px, 414px, 480px | **PASS (no horizontal overflow)** | Touch targets small; empty gutter spacing |
| Responsive Layout: Desktop (>=1280px) | 1280px, 1440px, 1920px | **PASS (no horizontal overflow)** | 48px GutterScale width overhang into tomes |

---

## 6. Concrete Remediation Action Plan

1. **Build & Process Safety**: Update `package.json` scripts or `scripts/start-production.mjs` to ensure build tasks never crash on locked standalone binaries.
2. **Branded Favicon**: Add an SVG/ICO favicon in `frontend/src/app/favicon.ico` to eliminate the 404 console error on Chrome page load.
3. **Multi-Scenario Mock Alignment**: Populate mock responses for "The Mirror of Erised" and "The Philosopher's Stone" in `frontend/src/features/archive/mock/adapter.ts` so all suggestion pills return rich evidence and citations.
4. **Backend State Persistence**: Update `backend/app/experiments.py` to persist cancellations and completions with `self.repository.save(run)`.
5. **Contract Synchronization**: Align corpus identifiers (`harry-potter-archive` vs `wizarding-notes`) across frontend and backend.
6. **Desktop & Mobile Layout Polishing**:
   - Set `.tome-gutter { width: 112px; }` in `globals.css` to prevent `GutterScale` overlap on desktop.
   - Add `hidden xl:block` to the gutter wrapper in `TwinTomes.tsx` to eliminate mobile residual vertical gap.
   - Enlarge touch target bounding boxes on mobile citation pills and dialog close buttons to >= 44px.
7. **Shader & Material Refinement**: Warm the candle flame color values away from electric blue toward organic amber.
