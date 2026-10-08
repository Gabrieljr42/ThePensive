# Handoff Report: Feature F5 (Responsive Layout & Touch Targets)

**Author**: Explorer M1_3 (Responsive Layout & Touch Targets)  
**Date**: 2026-10-07  
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve`  
**Target Milestone**: Milestone 1 (Architecture & Bug Remediation)

---

## 1. Observation

Direct code observations from inspecting the codebase:

1. **GutterScale Desktop Dimensions and Overflow**:
   - `frontend/src/features/archive/ui/GutterScale.tsx:35`:
     ```tsx
     className="hidden xl:flex flex-col items-center justify-between w-28 py-6 px-2 rounded-xs bg-[#090d14]/90 border border-[#a88235]/30 text-center font-mono text-[10px] tracking-wider text-[#98886e] shrink-0 backdrop-blur-md"
     ```
     `w-28` corresponds to `7rem` = `112px` (Tailwind spacing unit 28 × 4px = 112px).
   - `frontend/src/app/globals.css:1083-1086`:
     ```css
     .tome-gutter {
       width: 64px;
       flex-shrink: 0;
     }
     ```
   - Container allocated width is 64px while child component width is 112px, resulting in an exact 48px horizontal overflow (`112px - 64px = 48px`).
   - Flex layout context (`frontend/src/features/archive/ui/TwinTomes.tsx:75`):
     ```tsx
     <div className="flex flex-col xl:flex-row items-stretch gap-6">
     ```
     With `gap-6` (`24px`), the 48px overflow spans across the 24px gutter-to-tome gap and extends 24px into the right tome surface.

2. **Mobile Empty Gutter Artifact**:
   - `frontend/src/features/archive/ui/TwinTomes.tsx:91-95`:
     ```tsx
     {/* Central Gutter Measurement Scale */}
     {isCompare && (
       <div className="tome-gutter">
         <GutterScale ragBranch={ragBranch} fullBranch={fullBranch} />
       </div>
     )}
     ```
   - `frontend/src/app/globals.css:1161-1165`:
     ```css
     @media (max-width: 1279px) {
       .tome-gutter {
         width: auto;
       }
     }
     ```
   - On screens `< 1280px`, `GutterScale` is hidden via `hidden xl:flex` (`display: none`), but its wrapper `<div className="tome-gutter">` remains rendered in the DOM with `display: block` and `width: auto`.
   - In the parent `flex flex-col gap-6` container, this empty element acts as a flex child, introducing an unwanted 24px/48px phantom vertical gap between the tomes and below the active tab.

3. **Undersized Touch Targets**:
   - `frontend/src/features/archive/ui/CitationMark.tsx:66`:
     ```tsx
     className={`inline-flex items-center justify-center mx-1 px-1.5 py-0.5 rounded-xs font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer align-baseline ${...}`}
     ```
     The computed bounding box for `[{citation.number}]` with `text-[11px]` and `px-1.5 py-0.5` is ~22px × 18px.
   - `frontend/src/features/archive/ui/EvidenceLeaf.tsx:103`:
     ```tsx
     className="p-1 rounded-xs hover:bg-[#8a671d]/15 text-[#5e513e] font-mono text-sm leading-none transition-colors"
     ```
     The computed bounding box for the dismiss `✕` button with `p-1 text-sm` is ~20px × 20px.
   - `frontend/src/features/archive/ui/EvidenceLeaf.tsx:141`:
     ```tsx
     className="text-[#8a671d] hover:underline"
     ```
     The footer "Return to tomes (Esc) →" button has no padding, resulting in a ~14px vertical hit area.
   - `frontend/src/features/archive/ui/TwinTomes.tsx:52, 63`:
     ```tsx
     className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ...`}
     ```
     Mobile tab buttons have `py-2` (~32px height), below the standard 44px threshold.

4. **Anchor Registry Integration**:
   - `frontend/src/features/archive/threads/anchors.ts:51-58`:
     ```typescript
     const rect = record.el.getBoundingClientRect();
     let x = rect.left + rect.width / 2;
     let y = rect.top + rect.height / 2;
     if (record.side === "right") x = rect.right;
     ```
     `getBoundingClientRect()` evaluates the DOM element itself. A pseudo-element `::before` positioned absolutely does not alter `record.el.getBoundingClientRect()`, preserving all luminous provenance thread connection coordinates.

---

## 2. Logic Chain

1. **Desktop Overflow Resolution**:
   - From Observation 1, `GutterScale` is 112px (`w-28`) and `.tome-gutter` is 64px.
   - Expanding `.tome-gutter` in `frontend/src/app/globals.css` to `width: 112px;` makes the container exactly match the child's width.
   - Adding `display: flex; justify-content: center;` to `.tome-gutter` guarantees centered placement.
   - Because the container is 112px, the 24px `gap-6` between `.tome-gutter` and each tome is fully respected with zero overflow (`112px - 112px = 0px`).

2. **Mobile Empty Gutter Elimination**:
   - From Observation 2, `<div className="tome-gutter">` renders as an empty block child on `< 1280px` viewports, causing flex gap artifacts.
   - Adding `hidden xl:flex` to `<div className="tome-gutter">` in `frontend/src/features/archive/ui/TwinTomes.tsx` and adding `display: none;` under `@media (max-width: 1279px)` in `frontend/src/app/globals.css` completely removes `.tome-gutter` from the flex layout on viewports below 1280px.
   - With `.tome-gutter` removed from the flow, the flex container contains only the single active tome (`mobileTab === "rag"` or `mobileTab === "full"`), eliminating phantom vertical spacing.

3. **Touch Target Expansion Without Typography Distortion**:
   - From Observation 3, `CitationMark` sits inline inside prose (`Tome.tsx`). Direct padding expansion (e.g., `p-3`) would distort paragraph line-height and line spacing.
   - Implementing a centered pseudo-element `::before` with `min-width: 44px; min-height: 44px;` (`.touch-target-44`) expands the tap boundary to 44px × 44px while leaving inline visual dimensions (`px-1.5 py-0.5 text-[11px]`) unchanged.
   - From Observation 4, `anchors.ts` reads `el.getBoundingClientRect()`, which is unaffected by `position: absolute` pseudo-elements. The 3D provenance threads remain pixel-perfect.
   - In `EvidenceLeaf.tsx`, expanding the dismiss button to `min-w-[44px] min-h-[44px] -mr-2 -mt-2 p-2` satisfies mobile tap accessibility while absorbing dialog corner margins.
   - In `TwinTomes.tsx`, expanding mobile tab buttons to `min-h-[44px] py-2.5 px-3` satisfies the 44px requirement for primary mobile controls.

---

## 3. Caveats

1. **Subpixel Viewport Rounding**:
   On high-DPI displays (e.g. 1.25x or 1.5x scaling on Windows), `112px` may render at fractional pixel offsets (e.g. `111.98px`). Playwright test assertions should use an epsilon tolerance (`Math.abs(box.width - 112) <= 1.5`).
2. **Adjacent Inline Citations**:
   When multiple citation marks appear in immediate succession (e.g., `[1][2]`), their 44px pseudo-element hit areas may slightly overlap. This is standard behavior for inline references and is resolved by click coordinates hitting the foremost layer.
3. **No Code Implementation in Explorer Mode**:
   Per Explorer guidelines, this investigation does not modify source files directly. Concrete patches and test harnesses are documented for implementation agents.

---

## 4. Conclusion

Feature F5 requires 4 targeted source modifications:
1. `frontend/src/app/globals.css`:
   - Set `.tome-gutter { width: 112px; flex-shrink: 0; display: flex; justify-content: center; }`.
   - Set `@media (max-width: 1279px) { .tome-gutter { display: none; width: auto; } }`.
   - Add `.touch-target-44` utility with 44px pseudo-element hit expansion and `touch-action: manipulation`.
   - Update mobile `@media (max-width: 700px)` for settings and radio buttons (`min-height: 44px`).
2. `frontend/src/features/archive/ui/TwinTomes.tsx`:
   - Add `hidden xl:flex justify-center` to `<div className="tome-gutter">`.
   - Add `min-h-[44px] py-2.5 px-3 touch-manipulation` to mobile tab buttons.
3. `frontend/src/features/archive/ui/CitationMark.tsx`:
   - Add `.touch-target-44` and centered `before:` expansion classes with `touch-manipulation`.
4. `frontend/src/features/archive/ui/EvidenceLeaf.tsx`:
   - Set header dismiss button to `min-w-[44px] min-h-[44px] -mr-2 -mt-2 p-2 touch-target-44`.
   - Set footer return button to `min-h-[44px] py-2 px-2 touch-target-44`.

---

## 5. Verification Method

### 5.1 Verification Commands
1. **Typecheck**:
   ```bash
   cd frontend && npm run typecheck
   ```
   *Expected result*: Exit code 0, 0 TypeScript errors.
2. **Lint**:
   ```bash
   cd frontend && npm run lint
   ```
   *Expected result*: Exit code 0, 0 ESLint errors/warnings.
3. **Playwright Layout & E2E Suite**:
   ```bash
   cd frontend && npx playwright test tests/responsive-layout.spec.ts tests/memory-chamber.spec.ts
   ```
   *Expected result*: All desktop and mobile tests pass.

### 5.2 Specific Assertions to Verify
1. **Desktop Containment (1440x900 & 1280x800)**:
   - Query `.tome-gutter` and `[aria-label="Comparative Measurement Scale"]`.
   - `box.width === 112px`.
   - `scaleBox.x >= leftTome.x + leftTome.width + 16`.
   - `scaleBox.x + scaleBox.width <= rightTome.x - 16`.
2. **Mobile Clean Layout (375x812, 390x844, 480x854)**:
   - `.tome-gutter` has `display: none` (`expect(page.locator(".tome-gutter")).not.toBeVisible()`).
   - Zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
3. **Touch Targets**:
   - `page.getByRole("button", { name: "Dismiss evidence leaf" }).boundingBox()` has `width >= 44 && height >= 44`.
   - `page.getByRole("button", { name: /The First Tome/i }).boundingBox()` has `height >= 44`.

### 5.3 Invalidation Conditions
- If changing `.tome-gutter` width to 112px causes `.research-shell` to overflow horizontally at 1280px viewport width (disproven: available width is 1168px vs 160px gutter+gaps, leaving ~504px per tome).
- If pseudo-element touch targets displace inline text flow (disproven: pseudo-elements are positioned absolutely).
- If pseudo-elements distort 3D thread attachment points (disproven: `anchors.ts` reads DOM element `getBoundingClientRect()`).
