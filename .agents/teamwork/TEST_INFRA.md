# Dual Track Test Infrastructure & Suite Specification

## 1. Test Architecture & Runner Instructions

### 1.1 Architecture Overview
The Pensieve test suite employs a multi-tiered, opaque-box testing strategy designed to validate functional correctness, responsive layout integrity, console cleanliness, accessibility compliance, and literary tone authenticity.

```
Pensieve Test Infrastructure
├── Tier 1: Smoke & Runtime Integrity (Environment, Build, Console, Zero 404s)
│   ├── tests/archive-scene.spec.ts (Chamber render, Canvas draw calls, WebGL lifecycle)
│   └── tests/acceptance-audit.spec.ts § Tier 1 (Console purity, /favicon.ico 200, WebGL fallback)
├── Tier 2: Functional Inquiry & Contract Flows (Multi-scenario Inquiry, Citations, Branches)
│   ├── tests/inquiry-unit.mjs (Deterministic store & adapter lifecycle)
│   ├── tests/descent.spec.ts (Crossing, 3D memory walk, pause/resume, early exit)
│   ├── tests/memory-chamber.spec.ts (Desk interaction, citation inspector, method tabs)
│   └── tests/acceptance-audit.spec.ts § Tier 2 (3 suggestion pills: Map, Mirror, Stone)
├── Tier 3: Responsive Geometry & Physical Boundaries (Mobile <=480px, Desktop >=1280px)
│   ├── tests/responsive-audit.spec.ts (Viewport bounds, zero horizontal overflow, touch targets >=24px)
│   └── tests/slice.spec.ts (Cross-device slice verification)
└── Tier 4: Aesthetic Voice, Anti-Cliché & Forensic Audit Gate (Copy, Shaders, A11y, Performance)
    ├── tests/a11y.spec.ts (WCAG 2.1 AA via axe-core)
    ├── tests/performance.spec.ts (Frame rates, GPU budgets)
    ├── tests/screenshots.spec.ts (Visual snapshot baselines)
    └── tests/acceptance-audit.spec.ts § Tier 4 (Anti-cliché copy audit, ARIA contract preservation)
```

### 1.2 Test Runner Stack
- **E2E & Integration Framework**: Playwright Test (`@playwright/test` v1.58.2) running in Chrome channel.
- **Accessibility Engine**: `@axe-core/playwright` v4.13.0 running WCAG 2.0 / 2.1 Level A & AA scans.
- **In-Memory Logic Runner**: Node.js ES Module runner executing `frontend/tests/inquiry-unit.mjs` with TypeScript on-the-fly transpilation.
- **Procedural Shader Math Runner**: Node.js native TypeScript runner executing `frontend/tests/noise-unit.mts`.
- **Backend Test Runner**: Pytest (`backend/.venv/Scripts/pytest`) covering FastAPI catalog, experiment run service, and repository persistence.

### 1.3 Test Runner Instructions & Commands

#### Standard Execution (Pre-requisite: Production Server Running on port 3000)
```powershell
# 1. Start Pensieve Production Server
cd frontend
node scripts/start-production.mjs

# 2. In a separate shell, execute the full Playwright E2E suite:
cd frontend
npm run test:e2e

# 3. Execute targeted test suites:
# Acceptance & Functional Audit (Tiers 1, 2, 4):
npx playwright test tests/acceptance-audit.spec.ts

# Responsive & Layout Audit (Tier 3):
npx playwright test tests/responsive-audit.spec.ts

# Fast Unit & Adapter Tests:
node tests/inquiry-unit.mjs
node --experimental-strip-types tests/noise-unit.mts

# Backend Unit Tests:
cd ../backend
.venv\Scripts\pytest
```

#### Windows EBUSY Prevention Protocol
To avoid file-locking errors on Windows when rebuilding (`.next/standalone` locked by running node processes):
```powershell
# Terminate lingering node instances before rebuilding
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Portfolio\Pensieve*" } | Stop-Process -Force
cd frontend
npm run build
```

---

## 2. Feature Inventory Mapped Across Tiers 1–4

| Tier | Feature ID | Feature Name | Test Specification File | Verification Target |
|:---|:---|:---|:---|:---|
| **Tier 1** | **F1** | Build & Process Stability | `scripts/start-production.mjs` | Standalone server launches cleanly without EBUSY crash; Next.js webpack build completes with code 0. |
| **Tier 1** | **F2** | Console 404 & Cleanliness | `tests/acceptance-audit.spec.ts` | Page load captures 0 uncaught errors, 0 unhandled promise rejections, 0 404s (`/favicon.ico` returns 200/304). |
| **Tier 1** | **F2** | Three.js Deprecation Cleanliness | `tests/acceptance-audit.spec.ts` | Console logs contain zero `THREE.Clock` deprecation warnings. |
| **Tier 2** | **F3** | Suggestion Pill 1: Marauder's Map | `tests/acceptance-audit.spec.ts` | Clicking pill populates prompt, submits query, renders RAG and Full Context claims, opens citation dialogue. |
| **Tier 2** | **F3** | Suggestion Pill 2: Mirror of Erised | `tests/acceptance-audit.spec.ts` | Clicking pill populates prompt, submits query, returns valid claims and non-empty evidence citations. |
| **Tier 2** | **F3** | Suggestion Pill 3: Philosopher's Stone | `tests/acceptance-audit.spec.ts` | Clicking pill populates prompt, submits query, returns valid claims and non-empty evidence citations. |
| **Tier 2** | **F4** | Corpus Contract & Persistence | `tests/inquiry-unit.mjs`, `backend/tests/` | Canonical corpus ID `harry-potter-archive` accepted; backend `cancel(run_id)` and completion persist state. |
| **Tier 3** | **F5** | Responsive Viewport <=480px | `tests/responsive-audit.spec.ts` | Mobile viewports (360px, 390px, 480px) exhibit `scrollWidth <= innerWidth` (zero horizontal overflow). |
| **Tier 3** | **F5** | Mobile Gutter & Tab Layout | `tests/responsive-audit.spec.ts` | Mobile Twin Tomes omits empty desktop gutter; tome tabs switch cleanly between RAG and Full Context. |
| **Tier 3** | **F5** | Desktop Gutter Alignment >=1280px | `tests/responsive-audit.spec.ts` | Desktop viewports (1280px, 1440px, 1920px) show `.tome-gutter` without overlapping bounding boxes with tomes. |
| **Tier 3** | **F5** | Touch Target Sizing | `tests/responsive-audit.spec.ts` | Interactive controls (citations, tabs, dismiss buttons) meet minimum 24×24px touch bounding boxes. |
| **Tier 4** | **F6** | Centralized Copy Architecture | `tests/acceptance-audit.spec.ts` | All displayed texts adhere to centralized copy tokens without inline unmanaged strings. |
| **Tier 4** | **F7** | Anti-Cliché Voice Overhaul | `tests/acceptance-audit.spec.ts` | Zero banned synthetic AI tropes: no `"Crucially,"`, no `"Active Corpus (1/7 Selected)"`, no `"⚔"` swords, no `"chk"`. |
| **Tier 4** | **F8** | Test String Preservation | `tests/acceptance-audit.spec.ts` | All 22 test-asserted strings or ARIA contract labels remain accessible (`aria-label` / `role`). |
| **Tier 4** | **F9-F13**| Visual & Material Shaders | `tests/archive-scene.spec.ts` | Canvas painted frame statistics satisfy luminosity delta >18, variance >12, triangles <150000, draw calls <180. |
| **Tier 4** | **F14** | Comprehensive Verification Gate | `TEST_READY.md` | Full automated suite passes 100% with exit code 0 across typecheck, lint, pytest, and playwright. |

---

## 3. Coverage Threshold Verification

### 3.1 Console Cleanliness Threshold
- **Uncaught Page Errors**: Strictly **0**. Any unhandled JavaScript error causes immediate test failure.
- **Unhandled Promise Rejections**: Strictly **0**.
- **Failed HTTP Network Requests (4xx / 5xx)**: Strictly **0** (specifically auditing `/favicon.ico`, static chunks, and font files).
- **Console Warning Threshold**: Zero deprecated Three.js warnings (`THREE.Clock`).

### 3.2 Responsive & Layout Integrity Threshold
- **Horizontal Overflow Ratio**: `document.documentElement.scrollWidth <= window.innerWidth` across all tested viewports:
  - Mobile Small: 360 × 640
  - Mobile Standard: 390 × 844
  - Mobile Large: 480 × 854
  - Tablet Portrait: 768 × 1024
  - Desktop Standard: 1280 × 800
  - Desktop Large: 1440 × 900
  - Desktop Ultra-wide: 1920 × 1080
- **Touch Target Threshold**: Interactive elements must provide a minimum clickable area of 24 × 24 physical CSS pixels (WCAG 2.5.8 Target Size Minimum).
- **Text Clipping Threshold**: Tome claim paragraphs and headings must have non-zero height, visible opacity, and bounding box heights proportional to text length.

### 3.3 Functional Suggestion Scenario Threshold
- **Executed Scenarios**: All 3 catalogued curiosity pills:
  1. *The Marauder's Map* (`MARAUDERS_MAP_QUESTION`)
  2. *The Mirror of Erised* (`What does the Mirror of Erised reveal, and why is it dangerous?`)
  3. *The Philosopher's Stone* (`Why can Harry retrieve the Philosopher's Stone from the mirror?`)
- **Required Outcomes for Each Scenario**:
  - `status === "complete"` on at least one research tome.
  - Heading does NOT display `"Uncatalogued Inquiry"`.
  - At least 1 claim paragraph rendered.
  - At least 1 citation mark rendered (`[1]`).
  - Clicking citation opens the modal dialog (`role="dialog"`) with excerpt text highlighted in `<mark>`.

### 3.4 Literary Voice & Anti-Cliché Copy Threshold
- **Forbidden Substrings Count**: **0** occurrences across all user-visible text in DOM:
  - `"Crucially,"` (synthetic generative transition)
  - `"Active Corpus (1/7 Selected)"` (developer jargon)
  - `"⚔"` (gaming combat metaphor)
  - `"chk"` (developer abbreviation)
  - `"top-k reranked"` (raw algorithmic jargon)
  - `"The room preview is resting"` (helpdesk trope)
- **Contract Preservation**: All legacy test selectors (`"Ask the Archive"`, `"Enter the Archive"`, `"Quiet reading"`, `"Stir the Pensieve"`, `"Skip animation"`, `"The Bequest of the Four Wanderers"`) must resolve either via visible text or exact `aria-label`.

### 3.5 Accessibility (WCAG 2.1 AA) Threshold
- **Violations Allowed**: Strictly **0** violations detected by AxeBuilder (excluding ambient 3D dark-chamber canvas contrast exceptions where explicitly documented).
- **Focus Management**: Dialog trap must retain focus within the open modal on `Tab` and return focus to triggering citation on `Escape`.
