# Implementation Plan: Feature F5 (Responsive Layout & Touch Targets)

**Target Milestone**: Milestone 1 (Architecture & Bug Remediation)  
**Author**: Explorer M1_3 (Responsive Layout & Touch Targets)  
**Date**: 2026-10-07  
**Working Directory**: `c:\Users\gabri\OneDrive\Documentos\Portfolio\Pensieve`

---

## 1. Problem Statement & Scope

Feature F5 addresses visual layout defects and mobile accessibility constraints identified during the initial project survey:
1. **Desktop GutterScale Overflow (>= 1280px)**:
   In `frontend/src/features/archive/ui/GutterScale.tsx`, the card component has `w-28` (`7rem` = `112px`). In `frontend/src/app/globals.css`, `.tome-gutter` defines `width: 64px; flex-shrink: 0;`. This produces a **48px overflow** (`112px - 64px = 48px`). The overflow card intrudes across the 24px flex gap and bleeds 24px directly over the surface of the adjacent Full Context Tome.
2. **Mobile Empty Gutter Artifact (< 1280px, <= 480px)**:
   In `frontend/src/features/archive/ui/TwinTomes.tsx`, when comparing tomes on viewports narrower than `1280px`, tomes are stacked in a `flex flex-col gap-6` container. Although `GutterScale.tsx` has `hidden xl:flex`, its wrapper `<div className="tome-gutter">` remains present in the DOM without responsive hiding. This empty DOM element participates as a flex child, introducing an unwanted 24px/48px phantom vertical gap below or before the active mobile tab.
3. **Undersized Mobile Touch Targets (WCAG 2.5.8 / Apple HIG Compliance)**:
   - In `CitationMark.tsx`, citation buttons (`[1]`, `[2]`) measure approximately ~22px × 18px (`text-[11px] px-1.5 py-0.5`).
   - In `EvidenceLeaf.tsx`, the dialog dismiss button (`✕`) measures ~20px × 20px (`p-1 text-sm`), and the footer dismiss link lacks touch padding.
   - In `TwinTomes.tsx`, mobile tab buttons have `py-2` (~32px height).
   These violate the minimum 44px hit target standard recommended for mobile viewports.

---

## 2. Technical Analysis & Evidence

### 2.1 Desktop GutterScale Dimensional Mismatch
- **Container Definition**:
  - `frontend/src/app/globals.css:1083-1086`:
    ```css
    .tome-gutter {
      width: 64px;
      flex-shrink: 0;
    }
    ```
- **Child Element Definition**:
  - `frontend/src/features/archive/ui/GutterScale.tsx:35`:
    ```tsx
    <div
      aria-label="Comparative Measurement Scale"
      className="hidden xl:flex flex-col items-center justify-between w-28 py-6 px-2 rounded-xs bg-[#090d14]/90 border border-[#a88235]/30 text-center font-mono text-[10px] tracking-wider text-[#98886e] shrink-0 backdrop-blur-md"
    >
    ```
- **Flex Parent Layout**:
  - `frontend/src/features/archive/ui/TwinTomes.tsx:75`:
    ```tsx
    <div className="flex flex-col xl:flex-row items-stretch gap-6">
    ```
- **Mathematical Overflow**:
  - Container allocated width = `64px`.
  - Child rendered width = `w-28` = `28 * 4px = 112px`.
  - Net overflow = `112px - 64px = 48px`.
  - Since `.tome-gutter` has `overflow: visible` and `gap-6` is `24px`, the child extends `24px` into the gap and `24px` into the right tome, causing visual crowding and text truncation risks.

### 2.2 Mobile Empty Gutter Layout Artifact
- **Component Markup**:
  - `frontend/src/features/archive/ui/TwinTomes.tsx:91-95`:
    ```tsx
    {/* Central Gutter Measurement Scale */}
    {isCompare && (
      <div className="tome-gutter">
        <GutterScale ragBranch={ragBranch} fullBranch={fullBranch} />
      </div>
    )}
    ```
- **Responsive Media Query in CSS**:
  - `frontend/src/app/globals.css:1161-1165`:
    ```css
    @media (max-width: 1279px) {
      .tome-gutter {
        width: auto;
      }
    }
    ```
- **Observed Behavior on Mobile Viewports (< 1280px)**:
  - `GutterScale` evaluates to `display: none` (`hidden xl:flex`).
  - `.tome-gutter` has `display: block` and `width: auto` with zero height.
  - The parent flex container has `gap-6` (`24px`).
  - When `mobileTab === "rag"`, Child 1 (RAG Tome) is rendered, Child 2 (`.tome-gutter`) is rendered as an empty flex item, and Child 3 (Full Context Tome) is `hidden xl:block`.
  - The flex layout applies `gap-6` between Child 1 and Child 2, inserting an unnecessary 24px blank space below the tome.
  - When `mobileTab === "full"`, Child 1 is `hidden xl:block`, Child 2 is rendered empty, and Child 3 is rendered, resulting in a 24px blank space above the tome.

### 2.3 Undersized Touch Targets
- **Citation Mark**:
  - `frontend/src/features/archive/ui/CitationMark.tsx:66-73`:
    ```tsx
    className={`inline-flex items-center justify-center mx-1 px-1.5 py-0.5 rounded-xs font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer align-baseline ${...}`}
    ```
    Rendered target box: ~22px width × 18px height.
- **Evidence Dialog Dismiss**:
  - `frontend/src/features/archive/ui/EvidenceLeaf.tsx:99-106`:
    ```tsx
    <button
      type="button"
      onClick={handleDismiss}
      aria-label="Dismiss evidence leaf"
      className="p-1 rounded-xs hover:bg-[#8a671d]/15 text-[#5e513e] font-mono text-sm leading-none transition-colors"
    >
      ✕
    </button>
    ```
    Rendered target box: ~20px width × 20px height.
- **Evidence Dialog Footer Return Link**:
  - `frontend/src/features/archive/ui/EvidenceLeaf.tsx:138-144`:
    ```tsx
    <button type="button" onClick={handleDismiss} className="text-[#8a671d] hover:underline">
      Return to tomes (Esc) →
    </button>
    ```
    Rendered height: ~14px.
- **Mobile Tome Tabs**:
  - `frontend/src/features/archive/ui/TwinTomes.tsx:52, 63`:
    ```tsx
    className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ...`}
    ```
    Rendered height: ~32px.

---

## 3. Detailed Proposed Code Changes

### 3.1 Edit 1: `frontend/src/app/globals.css`
Update `.tome-gutter` dimensions and add `.touch-target-44` utility:

```diff
--- a/frontend/src/app/globals.css
+++ b/frontend/src/app/globals.css
@@ -1083,4 +1083,6 @@
 .tome-gutter {
-  width: 64px;
+  width: 112px;
   flex-shrink: 0;
+  display: flex;
+  justify-content: center;
 }
@@ -1161,5 +1163,6 @@
 @media (max-width: 1279px) {
   .tome-gutter {
+    display: none;
     width: auto;
   }
 }
```

Add touch target expansion utility in `globals.css`:
```css
/* Accessible Touch Target Utility (minimum 44px hit area per WCAG 2.5.8 / Apple HIG) */
.touch-target-44 {
  position: relative;
  touch-action: manipulation;
}
.touch-target-44::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  min-width: 44px;
  min-height: 44px;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}
```

Update mobile media query (`@media (max-width: 700px)`) in `globals.css` to ensure settings and mode toggles also have 44px minimum height:
```css
@media (max-width: 700px) {
  .room-settings button {
    font-size: 12px;
    padding: 10px 4px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  .inquiry-heading [role="radio"] {
    padding: 10px 14px;
    min-height: 44px;
    font-size: 10px;
    display: inline-flex;
    align-items: center;
  }
}
```

### 3.2 Edit 2: `frontend/src/features/archive/ui/TwinTomes.tsx`
Hide `.tome-gutter` on viewports `< 1280px` (`xl`) and expand mobile tab height:

```diff
--- a/frontend/src/features/archive/ui/TwinTomes.tsx
+++ b/frontend/src/features/archive/ui/TwinTomes.tsx
@@ -52,3 +52,3 @@
-            className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ${
+            className={`flex-1 min-h-[44px] py-2.5 px-3 font-mono text-xs tracking-wider rounded-xs transition-colors touch-manipulation flex items-center justify-center ${
@@ -63,3 +63,3 @@
-            className={`flex-1 py-2 font-mono text-xs tracking-wider rounded-xs transition-colors ${
+            className={`flex-1 min-h-[44px] py-2.5 px-3 font-mono text-xs tracking-wider rounded-xs transition-colors touch-manipulation flex items-center justify-center ${
@@ -91,3 +91,3 @@
         {/* Central Gutter Measurement Scale */}
         {isCompare && (
-          <div className="tome-gutter">
+          <div className="tome-gutter hidden xl:flex justify-center">
             <GutterScale ragBranch={ragBranch} fullBranch={fullBranch} />
           </div>
         )}
```

### 3.3 Edit 3: `frontend/src/features/archive/ui/CitationMark.tsx`
Add pseudo-element touch target expansion to `CitationMark`:

```diff
--- a/frontend/src/features/archive/ui/CitationMark.tsx
+++ b/frontend/src/features/archive/ui/CitationMark.tsx
@@ -66,3 +66,3 @@
-      className={`inline-flex items-center justify-center mx-1 px-1.5 py-0.5 rounded-xs font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer align-baseline ${
+      className={`touch-target-44 relative inline-flex items-center justify-center mx-1 px-1.5 py-0.5 rounded-xs font-mono text-[11px] font-semibold transition-all duration-200 cursor-pointer align-baseline touch-manipulation before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:min-w-[44px] before:min-h-[44px] before:w-full before:h-full ${
```

### 3.4 Edit 4: `frontend/src/features/archive/ui/EvidenceLeaf.tsx`
Enlarge dismiss buttons to at least 44px hit bounds:

```diff
--- a/frontend/src/features/archive/ui/EvidenceLeaf.tsx
+++ b/frontend/src/features/archive/ui/EvidenceLeaf.tsx
@@ -103,3 +103,3 @@
-            className="p-1 rounded-xs hover:bg-[#8a671d]/15 text-[#5e513e] font-mono text-sm leading-none transition-colors"
+            className="touch-target-44 flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 -mt-2 p-2 rounded-xs hover:bg-[#8a671d]/15 text-[#5e513e] font-mono text-base leading-none transition-colors cursor-pointer touch-manipulation"
@@ -140,3 +140,3 @@
-            className="text-[#8a671d] hover:underline"
+            className="touch-target-44 inline-flex items-center min-h-[44px] py-2 px-2 text-[#8a671d] hover:underline cursor-pointer touch-manipulation"
```

---

## 4. Verification Test Specifications

A dedicated Playwright test file should be added at `frontend/tests/responsive-layout.spec.ts` to assert all layout geometry and touch target dimensions:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature F5: Responsive Layout and Touch Target Audit", () => {
  test("desktop >= 1280px: GutterScale fits exactly inside .tome-gutter without overflowing into tomes", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?at=desk");
    await page.getByRole("radio", { name: "⚔ COMPARE", exact: true }).click();
    await page.getByRole("button", { name: /Ask the Archive/i }).click();

    // Wait for tomes and gutter scale to render
    const scale = page.locator('[aria-label="Comparative Measurement Scale"]');
    await expect(scale).toBeVisible({ timeout: 20000 });

    const gutter = page.locator(".tome-gutter");
    const gutterBox = await gutter.boundingBox();
    const scaleBox = await scale.boundingBox();
    expect(gutterBox).not.toBeNull();
    expect(scaleBox).not.toBeNull();

    // Container width matches 112px card width
    expect(Math.abs(gutterBox!.width - 112)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(scaleBox!.width - 112)).toBeLessThanOrEqual(1.5);

    // Verify zero overlap with neighboring tomes
    const leftTome = page.locator(".archive-tome").first();
    const rightTome = page.locator(".archive-tome").nth(1);
    const leftBox = await leftTome.boundingBox();
    const rightBox = await rightTome.boundingBox();

    expect(scaleBox!.x).toBeGreaterThanOrEqual(leftBox!.x + leftBox!.width + 16);
    expect(scaleBox!.x + scaleBox!.width).toBeLessThanOrEqual(rightBox!.x - 16);
  });

  test("mobile <= 480px: .tome-gutter is completely removed from flow and introduces zero phantom gap", async ({
    page,
  }) => {
    for (const width of [375, 390, 480]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/?at=desk");
      await page.getByRole("button", { name: /Ask the Archive/i }).click();

      // Gutter container must be hidden
      const gutter = page.locator(".tome-gutter");
      await expect(gutter).not.toBeVisible();

      // Measurement scale must be hidden
      const scale = page.locator('[aria-label="Comparative Measurement Scale"]');
      await expect(scale).not.toBeVisible();

      // Verify no horizontal overflow
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow).toBe(false);

      // Verify mobile tab heights meet 44px
      const ragTab = page.getByRole("button", { name: /The First Tome/i });
      const tabBox = await ragTab.boundingBox();
      expect(tabBox!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("touch targets: Evidence dismiss button and citation marks satisfy >= 44px accessible bounds", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?at=desk");
    await page.getByRole("button", { name: /Ask the Archive/i }).click();

    const citation = page.getByRole("button", { name: /Inspect citation \[1\]/i }).first();
    await expect(citation).toBeVisible({ timeout: 20000 });

    // Open evidence leaf
    await citation.click();
    const dialog = page.getByRole("dialog", { name: "Memory source" });
    await expect(dialog).toBeVisible();

    // Verify top-right dismiss button has >= 44x44px target
    const dismissBtn = page.getByRole("button", { name: "Dismiss evidence leaf" });
    const dismissBox = await dismissBtn.boundingBox();
    expect(dismissBox!.width).toBeGreaterThanOrEqual(44);
    expect(dismissBox!.height).toBeGreaterThanOrEqual(44);

    // Verify footer return button has >= 44px height
    const returnBtn = page.getByRole("button", { name: /Return to tomes/i });
    const returnBox = await returnBtn.boundingBox();
    expect(returnBox!.height).toBeGreaterThanOrEqual(44);

    // Dismiss dialog
    await dismissBtn.click();
    await expect(dialog).toHaveCount(0);
  });
});
```

---

## 5. Risk Assessment & Dependencies

1. **Test String Preservation**:
   All labels (`"Dismiss evidence leaf"`, `"Return to tomes (Esc) →"`, `"✦ The First Tome (RAG)"`, `"☾ The Second Tome (Full)"`) remain unchanged. Zero impact on existing Playwright test selectors.
2. **Anchor Thread Geometry**:
   In `anchors.ts`, `registerDom` uses `el.getBoundingClientRect()`. Because pseudo-element `::before` is `position: absolute`, it does not expand `el.getBoundingClientRect()`. Therefore, 3D luminous threads attach precisely to the visual edge of the citation badge.
3. **Responsive Breakpoints**:
   The desktop breakpoint uses Tailwind's standard `xl:` (`1280px`). This matches `.research-shell` and `TwinTomes.tsx` compare mode toggle (`xl:hidden`).
