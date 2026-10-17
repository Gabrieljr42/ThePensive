# Original User Request

## 2026-10-07T18:08:54Z

Audit and eliminate functional and visual bugs across the Pensieve portfolio, while overhauling the site's text and visual art direction to strip away generic AI tropes and instill a tactile, human, and authorial atmosphere.

Working directory: c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve
Integrity mode: development

## Requirements

### R1. Comprehensive Bug Audit and Remediation
Identify and fix runtime errors, broken interactions, shader/canvas rendering failures, state desynchronizations, and layout glitches across desktop and mobile viewports.

### R2. De-AI Tone and Copy Overhaul
Audit and rewrite all user-facing microcopy, introductory texts, labels, and explanations to eliminate synthetic AI patterns (formulaic superlatives, robotic jargon, generic filler) in favor of authentic, grounded, and engaging authorial writing.

### R3. Organic Visual & Material Art Direction
Rework visual effects, shaders, and styling away from generic AI/cyber aesthetics (overused neon glows, generic bloom halos, standard dark-theme clichés) toward tactile, atmospheric, and cohesive materials fitting an archival pensieve (parchment, ink dispersion, liquid silver, realistic ambient illumination).

## Verification Resources

- Typecheck: `npm run typecheck` in `frontend/`
- Production Build: `npm run build` in `frontend/`
- E2E & Visual Regression Tests: `npm run test:e2e` in `frontend/` and `node tests/inquiry-unit.mjs`
- Linting: `npm run lint` in `frontend/`
- Backend Tests (if impacted): `pytest` in `backend/`

## Acceptance Criteria

### Automated Quality & Stability
- [ ] `npm run typecheck` passes with zero TypeScript errors.
- [ ] `npm run build` completes successfully with exit code 0.
- [ ] Automated tests in `frontend/tests/` pass with zero failures.
- [ ] The browser console records zero uncaught errors or unhandled promise rejections during key interactions (navigation, descent, archive inquiry).

### Aesthetic & Voice Transformation
- [ ] All user-facing text passes an anti-cliché review, replacing generic placeholder copy with distinct, intentional prose.
- [ ] Shader and lighting parameters exhibit subtle, physical, tactile qualities rather than synthetic high-frequency neon bloom.
- [ ] Responsive layouts maintain balanced typographic hierarchy without overlapping or truncated content on both mobile (<=480px) and desktop (>=1280px).
