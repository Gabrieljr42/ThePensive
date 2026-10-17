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
