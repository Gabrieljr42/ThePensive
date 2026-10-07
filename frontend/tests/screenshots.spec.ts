import { test, expect } from "@playwright/test";
import path from "node:path";

const screenshotsDir = path.resolve(__dirname, "../../docs/screenshots");

test.describe("Pensieve Screenshot Capture", () => {
  test.afterEach(async ({ page }) => {
    const status = await page.locator("main").getAttribute("data-scene-status");
    expect(status).not.toBe("fallback");
  });
  test.beforeEach(({}, testInfo) => {
    testInfo.setTimeout(60000);
  });

  test("1. entrance desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Pensieve" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("main")).toHaveAttribute(
      "data-scene-status",
      "ready",
      { timeout: 15000 },
    );
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "entrance-desktop.png"),
    });
  });

  test("2. reading desk twin tomes desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/?at=desk");

    const askBtn = page.getByRole("button", { name: "Ask the Archive" });
    await expect(askBtn).toBeVisible();
    await askBtn.click();

    const tomeHeading = page.getByRole("heading", {
      name: "The Bequest of the Four Wanderers",
    });
    await expect(tomeHeading).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "ask-desktop.png"),
    });
  });

  test("3. evidence inspection desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/?at=desk");

    const askBtn = page.getByRole("button", { name: "Ask the Archive" });
    await expect(askBtn).toBeVisible();
    await askBtn.click();

    const tomeHeading = page.getByRole("heading", {
      name: "The Bequest of the Four Wanderers",
    });
    await expect(tomeHeading).toBeVisible({ timeout: 25000 });

    const cit1 = page
      .getByRole("button", { name: /Inspect citation \[1\]/i })
      .first();
    await expect(cit1).toBeVisible();
    await cit1.click();

    const evidenceRegion = page.getByRole("region", {
      name: /Evidence passage/i,
    });
    await expect(evidenceRegion).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "evidence-desktop.png"),
    });
  });

  test("4. mobile desk", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?at=desk");

    const askBtn = page.getByRole("button", { name: "Ask the Archive" });
    await expect(askBtn).toBeVisible();
    await askBtn.click();

    const tomeHeading = page.getByRole("heading", {
      name: "The Bequest of the Four Wanderers",
    });
    await expect(tomeHeading).toBeVisible({ timeout: 25000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "ask-mobile.png"),
    });
  });

  test("5. mobile evidence", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?at=desk");

    const askBtn = page.getByRole("button", { name: "Ask the Archive" });
    await expect(askBtn).toBeVisible();
    await askBtn.click();

    const tomeHeading = page.getByRole("heading", {
      name: "The Bequest of the Four Wanderers",
    });
    await expect(tomeHeading).toBeVisible({ timeout: 25000 });

    const cit1 = page
      .getByRole("button", { name: /Inspect citation \[1\]/i })
      .first();
    await expect(cit1).toBeVisible();
    await cit1.click();

    const evidenceRegion = page.getByRole("region", {
      name: /Evidence passage/i,
    });
    await expect(evidenceRegion).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(screenshotsDir, "evidence-mobile.png"),
    });
  });
});
