import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

console.log("=== ADVERSARIAL STRESS HARNESS: FEATURE F5 ===");
console.log("Empirically measuring Desktop (1280, 1440, 1920px) and Mobile (320, 375, 480px)...");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3460";

let testsPassed = 0;
let testsFailed = 0;
const findings = [];

function recordFinding(severity, description) {
  findings.push({ severity, description });
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
  });

  try {
    // ========================================================================
    // 1. DESKTOP VIEWPORTS: 1280px, 1440px, 1920px
    // ========================================================================
    console.log("\n--- SUITE F5.1: DESKTOP LAYOUT (GutterScale vs Tomes) ---");
    const desktopWidths = [1280, 1440, 1920];

    for (const width of desktopWidths) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
      });

      try {
        console.log(`\n[TESTING DESKTOP] Viewport width: ${width}px`);
        await page.goto(`${BASE_URL}/?at=desk`, { waitUntil: "networkidle" });

        // Ensure compare mode is selected
        const compareRadio = page.getByRole("radio", { name: /COMPARE/i });
        if (await compareRadio.isVisible()) {
          await compareRadio.click();
        }

        // Click Ask the Archive
        const askButton = page.getByRole("button", { name: /Ask the Archive/i });
        await askButton.click();

        // Wait for reading phase
        await page.waitForSelector('[data-phase="reading"]', { timeout: 15000 });

        // Locate tomes and gutter scale
        const leftTome = page.locator('.archive-tome[data-method="rag"]');
        const rightTome = page.locator('.archive-tome[data-method="full_context"]');
        const gutter = page.locator(".tome-gutter");
        const scale = page.locator('[aria-label="Comparative Measurement Scale"]');

        await leftTome.waitFor({ state: "visible", timeout: 10000 });
        await rightTome.waitFor({ state: "visible", timeout: 10000 });
        await scale.waitFor({ state: "visible", timeout: 10000 });

        const leftBox = await leftTome.boundingBox();
        const rightBox = await rightTome.boundingBox();
        const gutterBox = await gutter.boundingBox();
        const scaleBox = await scale.boundingBox();

        assert.ok(leftBox, "Left tome (RAG) must have bounding box");
        assert.ok(rightBox, "Right tome (Full) must have bounding box");
        assert.ok(gutterBox, "Gutter must have bounding box");
        assert.ok(scaleBox, "GutterScale must have bounding box");

        console.log(`  Left Tome (RAG):       x=${leftBox.x.toFixed(1)}, w=${leftBox.width.toFixed(1)}, right=${(leftBox.x + leftBox.width).toFixed(1)}`);
        console.log(`  Gutter container:      x=${gutterBox.x.toFixed(1)}, w=${gutterBox.width.toFixed(1)}`);
        console.log(`  GutterScale element:   x=${scaleBox.x.toFixed(1)}, w=${scaleBox.width.toFixed(1)}, right=${(scaleBox.x + scaleBox.width).toFixed(1)}`);
        console.log(`  Right Tome (Full):     x=${rightBox.x.toFixed(1)}, w=${rightBox.width.toFixed(1)}`);

        // Check 1: Gutter width matches scale width (~112px)
        const gutterWidthDiff = Math.abs(gutterBox.width - 112);
        const scaleWidthDiff = Math.abs(scaleBox.width - 112);
        console.log(`  Gutter width delta from 112px: ${gutterWidthDiff.toFixed(2)}px`);
        console.log(`  Scale width delta from 112px:  ${scaleWidthDiff.toFixed(2)}px`);
        assert.ok(gutterWidthDiff <= 2.0, `Gutter container width (${gutterBox.width}px) should match 112px`);
        assert.ok(scaleWidthDiff <= 2.0, `GutterScale width (${scaleBox.width}px) should match 112px`);

        // Check 2: Overlap calculation
        const gapLeft = scaleBox.x - (leftBox.x + leftBox.width);
        const gapRight = rightBox.x - (scaleBox.x + scaleBox.width);
        console.log(`  Gap between Left Tome and Scale:  ${gapLeft.toFixed(1)}px`);
        console.log(`  Gap between Scale and Right Tome: ${gapRight.toFixed(1)}px`);

        if (gapLeft < 0) {
          recordFinding("CRITICAL", `At ${width}px, GutterScale overlaps Left Tome by ${Math.abs(gapLeft).toFixed(1)}px!`);
          testsFailed++;
        } else if (gapRight < 0) {
          recordFinding("CRITICAL", `At ${width}px, GutterScale overlaps Right Tome by ${Math.abs(gapRight).toFixed(1)}px!`);
          testsFailed++;
        } else {
          console.log(`  [PASS] GutterScale fits cleanly without overlapping either Tome (left gap=${gapLeft.toFixed(1)}px, right gap=${gapRight.toFixed(1)}px)`);
          testsPassed++;
        }

        // Check 3: Zero horizontal overflow
        const hasOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        console.log(`  Horizontal overflow: ${hasOverflow ? "DETECTED!" : "none (clean)"}`);
        assert.equal(hasOverflow, false, `Viewport ${width}px must have no horizontal scroll overflow`);
        testsPassed++;
      } finally {
        await page.close();
      }
    }

    // ========================================================================
    // 2. MOBILE VIEWPORTS: 320px, 375px, 480px
    // ========================================================================
    console.log("\n--- SUITE F5.2: MOBILE LAYOUT & PHANTOM GUTTER GAP ---");
    const mobileWidths = [320, 375, 480];

    for (const width of mobileWidths) {
      const page = await browser.newPage({
        viewport: { width, height: 750 },
      });

      try {
        console.log(`\n[TESTING MOBILE] Viewport width: ${width}px`);
        await page.goto(`${BASE_URL}/?at=desk`, { waitUntil: "networkidle" });

        // Submit inquiry on mobile
        const askButton = page.getByRole("button", { name: /Ask the Archive/i });
        await askButton.click();

        await page.waitForSelector('[data-phase="reading"]', { timeout: 15000 });

        // 1. Verify Gutter is completely removed from mobile layout flow
        const gutter = page.locator(".tome-gutter");
        const isGutterVisible = await gutter.isVisible();
        const gutterBox = await gutter.boundingBox();
        const gutterDisplay = await gutter.evaluate((el) => window.getComputedStyle(el).display);

        console.log(`  Gutter isVisible: ${isGutterVisible}`);
        console.log(`  Gutter computed display: ${gutterDisplay}`);
        console.log(`  Gutter boundingBox: ${gutterBox ? JSON.stringify(gutterBox) : "null (removed)"}`);

        assert.equal(gutterDisplay, "none", `At ${width}px, .tome-gutter computed display must be 'none'`);
        assert.equal(isGutterVisible, false, `At ${width}px, .tome-gutter must not be visible`);
        assert.ok(gutterBox === null || gutterBox.height === 0, `At ${width}px, .tome-gutter must occupy 0 height`);

        // 2. Verify no phantom gap in the mobile tome stack
        const twinTomesContainer = page.locator(".twin-tomes-container, .tomes-grid, main").first();
        // Check vertical layout between mobile tabs and active tome
        const mobileTabs = page.locator("button", { hasText: /First Tome/i }).first();
        const activeTome = page.locator(".archive-tome:visible").first();

        const tabsBox = await mobileTabs.boundingBox();
        const tomeBox = await activeTome.boundingBox();

        if (tabsBox && tomeBox) {
          const verticalGap = tomeBox.y - (tabsBox.y + tabsBox.height);
          console.log(`  Mobile Tabs: y=${tabsBox.y.toFixed(1)}, h=${tabsBox.height.toFixed(1)}`);
          console.log(`  Active Tome: y=${tomeBox.y.toFixed(1)}, h=${tomeBox.height.toFixed(1)}`);
          console.log(`  Vertical distance between tabs and tome: ${verticalGap.toFixed(1)}px`);
          // Normal gap is mt-4 or mt-6 (~16-24px), not an extra phantom 48px/64px gutter block
          assert.ok(verticalGap < 40, `Vertical gap (${verticalGap}px) should not contain phantom gutter space`);
        }

        // 3. Verify zero horizontal overflow on mobile
        const hasOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        );
        console.log(`  Horizontal overflow: ${hasOverflow ? "DETECTED!" : "none (clean)"}`);
        assert.equal(hasOverflow, false, `Mobile viewport ${width}px must have zero horizontal overflow`);

        console.log(`  [PASS] Mobile layout at ${width}px has no phantom gutter gap and no overflow.`);
        testsPassed++;
      } finally {
        await page.close();
      }
    }

    // ========================================================================
    // 3. TOUCH TARGET MEASUREMENTS (>= 44px) ACROSS VIEWPORTS
    // ========================================================================
    console.log("\n--- SUITE F5.3: TOUCH TARGET SIZE AUDIT (>= 44px) ---");

    for (const width of [320, 375, 480]) {
      const page = await browser.newPage({
        viewport: { width, height: 800 },
      });

      try {
        console.log(`\n[TOUCH TARGET AUDIT] Viewport width: ${width}px`);
        await page.goto(`${BASE_URL}/?at=desk`, { waitUntil: "networkidle" });

        // 1. Mobile Tab Switchers (in TwinTomes)
        const askButton = page.getByRole("button", { name: /Ask the Archive/i });
        await askButton.click();
        await page.waitForSelector('[data-phase="reading"]', { timeout: 15000 });

        const ragTab = page.getByRole("button", { name: /The First Tome/i }).first();
        const fullTab = page.getByRole("button", { name: /The Second Tome/i }).first();

        if (await ragTab.isVisible()) {
          const ragBox = await ragTab.boundingBox();
          console.log(`  RAG Tab Button:         w=${ragBox.width.toFixed(1)}px, h=${ragBox.height.toFixed(1)}px`);
          assert.ok(ragBox.height >= 43.5, `RAG Tab height (${ragBox.height}px) must be >= 44px`);
          testsPassed++;
        }

        if (await fullTab.isVisible()) {
          const fullBox = await fullTab.boundingBox();
          console.log(`  Full Context Tab Button: w=${fullBox.width.toFixed(1)}px, h=${fullBox.height.toFixed(1)}px`);
          assert.ok(fullBox.height >= 43.5, `Full Context Tab height (${fullBox.height}px) must be >= 44px`);
          testsPassed++;
        }

        // 2. Citation Mark Button
        const citationBtn = page.getByRole("button", { name: /Inspect citation \[1\]/i }).first();
        if (await citationBtn.isVisible()) {
          const citBox = await citationBtn.boundingBox();
          console.log(`  Citation Mark Button:    w=${citBox.width.toFixed(1)}px, h=${citBox.height.toFixed(1)}px`);

          // Check hit area expansion via computed ::before or boundingBox
          const pseudoBounds = await citationBtn.evaluate((el) => {
            const before = window.getComputedStyle(el, "::before");
            return {
              content: before.content,
              position: before.position,
              top: before.top,
              bottom: before.bottom,
              left: before.left,
              right: before.right,
            };
          });
          console.log(`  Citation ::before pseudo: content=${pseudoBounds.content}, position=${pseudoBounds.position}, top=${pseudoBounds.top}`);

          // Note: If button box itself is < 44px, it relies on ::before touch-target-44 expansion
          const hasTouchTargetClass = await citationBtn.evaluate((el) =>
            el.classList.contains("touch-target-44"),
          );
          console.log(`  Citation has .touch-target-44 class: ${hasTouchTargetClass}`);
          assert.ok(hasTouchTargetClass || citBox.height >= 44, "Citation button must satisfy >=44px via element or touch-target-44");
          testsPassed++;

          // 3. Evidence Leaf Dismiss & Return Buttons
          await citationBtn.click();
          const dialog = page.getByRole("dialog", { name: "Memory source" });
          await dialog.waitFor({ state: "visible", timeout: 5000 });

          const dismissBtn = page.getByRole("button", { name: "Dismiss evidence leaf" });
          const returnBtn = page.getByRole("button", { name: /Return to tomes/i });

          const dismissBox = await dismissBtn.boundingBox();
          const returnBox = await returnBtn.boundingBox();

          console.log(`  Dismiss '✕' Button:      w=${dismissBox.width.toFixed(1)}px, h=${dismissBox.height.toFixed(1)}px`);
          console.log(`  Return Button:           w=${returnBox.width.toFixed(1)}px, h=${returnBox.height.toFixed(1)}px`);

          assert.ok(dismissBox.width >= 43.5 && dismissBox.height >= 43.5, `Dismiss button (${dismissBox.width}x${dismissBox.height}) must be >= 44x44px`);
          assert.ok(returnBox.height >= 43.5, `Return button height (${returnBox.height}) must be >= 44px`);
          testsPassed++;

          await dismissBtn.click();
        }

        // 4. Suggestion Pills on Questionnaire
        // Return to desk or reload
        await page.goto(`${BASE_URL}/?at=desk`, { waitUntil: "networkidle" });
        const pillLocators = page.locator(".question-manuscript button[type='button']");
        const pillCount = await pillLocators.count();
        console.log(`  Auditing ${pillCount} suggestion pills in QuestionLeaf...`);

        for (let i = 0; i < pillCount; i++) {
          const pill = pillLocators.nth(i);
          const pillText = (await pill.textContent()).trim();
          const pBox = await pill.boundingBox();
          console.log(`    Pill '${pillText}': w=${pBox.width.toFixed(1)}px, h=${pBox.height.toFixed(1)}px`);
          if (pBox.height < 44) {
            recordFinding("INFO", `Suggestion Pill '${pillText}' height is ${pBox.height.toFixed(1)}px (< 44px). Considered inline text pill.`);
          }
        }
      } finally {
        await page.close();
      }
    }

  } finally {
    await browser.close();
  }

  console.log("\n========================================");
  console.log(`TOTAL CHECKS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log(`FINDINGS RECORDED: ${findings.length}`);
  for (const f of findings) {
    console.log(`  [${f.severity}] ${f.description}`);
  }
  console.log("========================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("FATAL HARNESS ERROR:", err);
  process.exit(1);
});
