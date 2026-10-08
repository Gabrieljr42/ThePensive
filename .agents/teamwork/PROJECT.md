# Project: Pensieve Portfolio Audit & Overhaul

## Architecture
- **Application Structure**: Next.js 15 (React 19, Three.js / React Three Fiber, Tailwind CSS) in `frontend/`, FastAPI / Python backend in `backend/`.
- **Primary Experience**:
  - `Threshold`: Landing chamber with ambient lighting, titles, and entrance interactions.
  - `Descent`: 3D Pensieve basin journey into memory depths with liquid fluid shaders, billboarding mist, and passage particles.
  - `Research Desk`: Twin Tomes interface comparing Focused Retrieval (RAG) vs Whole Corpus Attention (Full Context), with evidence leaves, astrolabe filters, and gutter divergence metrics.
- **Data Flow**: `demoInquiryTransport` / `mockArchiveAdapter` provides asynchronous progressive inquiry responses and stream fragments.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | F1. Build & Process Stability | Resolve Windows EBUSY file-locking during standalone Next.js build/run | M1 | Explorer 1 |
| 2 | F2. Console 404 & Cleanliness | Supply favicon.ico and address Three.js Clock deprecation to guarantee zero console errors | M1 | Explorer 1 |
| 3 | F3. Suggestion Pill Scenarios | Add mock scenarios for "The Mirror of Erised" and "The Philosopher's Stone" in adapter.ts | M1 | Explorer 1 |
| 4 | F4. Corpus Contract & Persistence | Synchronize corpus ID contract (harry-potter-archive) and persist run status in backend | M1 | Explorer 1 |
| 5 | F5. Responsive Layout & Touch Targets | Fix 48px GutterScale desktop overflow, remove empty mobile gutter, expand touch targets | M1 | Explorer 1 |
| 6 | F6. Centralized Copy Architecture | Create centralized copy module frontend/src/features/archive/copy.ts | M2 | Explorer 2 |
| 7 | F7. De-AI Tone Transformation | Overhaul 62 user-facing copy items across components, modals, and mock chronicle passages | M2 | Explorer 2 |
| 8 | F8. Test String Preservation | Maintain exact match or aria-label compatibility for all 22 test-asserted strings | M2 | Explorer 2 |
| 9 | F9. Liquid Silver / Mercury Shaders | Rework PensieveBasin.tsx GLSL to eliminate cyber cyan in favor of physical mercury Fresnel ($F_0=0.72$) | M3 | Explorer 3 |
| 10 | F10. Harmonized Archival Codices | Unify Tome.tsx and GutterScale.tsx on warm illuminated vellum with gold and burnished silver leaf | M3 | Explorer 3 |
| 11 | F11. Tactile Ink & Spun Filaments | Implement capillary ink seepage in InkText.tsx and dual-stroke gossamer threads in ThreadLayer.tsx | M3 | Explorer 3 |
| 12 | F12. Atmospheric Chamber & Lighting | Warm illuminated vellum in MemoryFolios.tsx, candlelit ambient warmth in MemoryInterior.tsx & Dust.tsx | M3 | Explorer 3 |
| 13 | F13. GPU Texture Leak Fix | Add proper disposal cleanup in NoisyStandardMaterial.tsx for cloned noise textures | M3 | Explorer 3 |
| 14 | F14. E2E Verification & Audit Gate | Verify full build, typecheck, lint, pytest, e2e Playwright suite, console, and forensic audit | M4 | All / Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Architecture & Bug Remediation | Features F1, F2, F3, F4, F5 | none | IN_PROGRESS (Worker: 3870f66e-6e94-4b2e-93dc-ae372f96828a) |
| M2 | De-AI Tone & Copy Overhaul | Features F6, F7, F8 | M1 (interface compatibility) | PLANNED |
| M3 | Organic Visual & Material Shaders | Features F9, F10, F11, F12, F13 | M1 (layout compatibility) | PLANNED |
| M4 | Comprehensive Verification & Final Gate | Feature F14 (All automated and visual acceptance checks) | M1, M2, M3 | PLANNED |

## Interface Contracts
### M1 ↔ M2 (Layout & Data)
- `mock/adapter.ts`: Preserves query canonicalization and schema contracts (`InquiryResponse`, `StreamFragment`).
- All interactive controls (`QuestionLeaf`, `DiveOverlay`, `TwinTomes`) maintain ARIA roles and labels expected by test suites.

### M1/M2 ↔ M3 (Styling & Shaders)
- `Tome.tsx` and `GutterScale.tsx`: CSS class names and container dimensions (`.tome-gutter`) remain aligned with responsive grid constraints.
- Shader color tokens use semantic CSS / Three.js uniforms: warm vellum, mercury silver, iron-gall ink, antique gold, and burnished silver leaf.

## Code Layout
- Frontend Root: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\frontend`
- Backend Root: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\backend`
- Coordination Workspace: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve\.agents\teamwork`
