## 2026-10-07T19:01:13Z
You are Worker M1_1 (Architecture & Bug Remediation Worker).
Your working directory is:
c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\worker_m1_1

MANDATORY: You MUST read the authoritative user request at:
c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\ORIGINAL_REQUEST.md
before beginning your work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You must read the project specification and the implementation plans prepared by the Explorers:
- c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\PROJECT.md
- c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_1\plan.md (F1 & F2: build lock, favicon.ico, deprecations)
- c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_2\plan.md (F3 & F4: mock scenarios, corpus contracts, backend persistence)
- c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\explorer_m1_3\plan.md (F5: GutterScale desktop overflow, mobile gutter hiding, touch targets)

Your Mission:
Implement all features of Milestone 1 (F1, F2, F3, F4, F5) according to the explorer plans:
1. F1: Create `frontend/scripts/prebuild.mjs` and wire `"prebuild"` in `frontend/package.json` to safely clear stale processes/locks; harden `scripts/start-production.mjs` with process tracking and graceful tree-kill.
2. F2: Generate and place `favicon.ico` in `frontend/public/` and `frontend/src/app/`; configure metadata in `layout.tsx`; address Three.js Clock deprecation warnings in tests and canvas.
3. F3: Implement rich mock scenarios for "The Mirror of Erised" (`mirror-of-erised.ts`) and "The Philosopher's Stone" (`philosophers-stone.ts`) with authentic claims, citations, metrics, and stream fragments in `frontend/src/features/archive/mock/`; update `adapter.ts` and ensure clicking suggestion pills activates the corresponding volume.
4. F4: Align corpus identifiers in `backend/app/demo/catalog.py` and `scenarios.py` to support `harry-potter-archive` without breaking existing tests; fix run cancellation & completion persistence in `backend/app/experiments.py` by calling `self.repository.save(run)`.
5. F5: Update `.tome-gutter` in `globals.css` to 112px on desktop and hide on mobile; update `TwinTomes.tsx` to hide gutter artifact on small screens; add `.touch-target-44` and expand touch targets on CitationMark and dialog close buttons.

Verification Requirements:
Run and verify:
- `npm run typecheck` in frontend/ (must pass with 0 errors)
- `npm run lint` in frontend/ (must pass with 0 errors)
- `node tests/inquiry-unit.mjs` in frontend/ (must pass with 0 errors)
- `pytest` in backend/ (must pass with 0 failures)
- `npm run build` in frontend/ (must complete with exit code 0)

Document all changes, file paths, and exact verification test outputs in:
c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork\worker_m1_1\handoff.md
Update progress.md in your directory as you work.
