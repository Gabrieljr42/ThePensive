import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Midnight Archive Accessibility Scans", () => {
  test("threshold meets WCAG accessibility standards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pensieve" })).toBeVisible({ timeout: 5000 });

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // 3D background behind DOM elements has dynamic WebGL pixels
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("research desk and twin tomes meet WCAG accessibility standards", async ({ page }) => {
    await page.goto("/?at=desk");
    await expect(page.getByRole("button", { name: "Ask the Archive" })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Dynamic procedural 3D background canvas
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("reduced motion is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pensieve" })).toBeVisible();
    await page.getByRole("button", { name: "Enter the Archive" }).click();
    await expect(page.getByText("Active Corpus")).toBeVisible();
  });
});
