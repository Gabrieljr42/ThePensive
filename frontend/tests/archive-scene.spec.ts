import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { type FrameStats } from "./lab-window";

function assertPaintedFrame(stats: FrameStats) {
  expect(stats.clientWidth).toBeGreaterThan(400);
  expect(stats.clientHeight).toBeGreaterThan(300);
  expect(stats.pixelRatio).toBeGreaterThanOrEqual(1);
  expect(stats.pixelRatio).toBeLessThanOrEqual(1.52);
  expect(
    Math.abs(stats.width - stats.clientWidth * stats.pixelRatio),
  ).toBeLessThan(2);
  expect(
    Math.abs(stats.height - stats.clientHeight * stats.pixelRatio),
  ).toBeLessThan(2);
  expect(stats.maxLum - stats.minLum).toBeGreaterThan(18);
  expect(stats.variance).toBeGreaterThan(12);
  expect(stats.surface).not.toBeNull();
  expect(stats.drawCalls).toBeLessThan(180);
  expect(stats.triangles).toBeLessThan(150000);
  expect(stats.paintedFraction).toBeGreaterThan(0.45);
  expect(stats.bboxCoverage).toBeGreaterThan(0.5);
}

async function readStats(page: Page) {
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-status",
    "ready",
  );
  await page.waitForFunction(() =>
    Boolean(window.__pensieveArchive?.readStats),
  );
  return page.evaluate(() => window.__pensieveArchive!.readStats());
}

for (const launch of [1, 2]) {
  test(`archive launch ${launch} paints a complete memory chamber`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto("/");
    await page.waitForSelector("canvas");
    await expect(
      page.getByRole("button", { name: /Enter the Archive/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pensieve", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("The Midnight Archive").first()).toBeVisible();
    await expect(
      page.getByText("Ask the story. Follow the evidence."),
    ).toBeVisible();
    const enter = page.getByRole("button", { name: "Enter the Archive" });
    await expect(enter).toBeVisible();
    for (const banned of [
      "ARCHIVE ACCESSION NO. 0001",
      "An Experimental Knowledge System",
      "METHODOLOGY: VECTOR RAG VS FULL-ATTENTION",
    ]) {
      await expect(page.getByText(banned)).toHaveCount(0);
    }
    const enterStyle = await enter.evaluate((element) => {
      const style = getComputedStyle(element);
      return { backdrop: style.backdropFilter, shadow: style.boxShadow };
    });
    expect(enterStyle.backdrop === "none" || enterStyle.backdrop === "").toBe(
      true,
    );
    expect(enterStyle.shadow.toLowerCase()).not.toContain("205, 168, 87");

    const before = await readStats(page);
    assertPaintedFrame(before);

    const scratch = process.env.PENSIEVE_SCRATCH;
    const webgl = page.locator("canvas[data-engine]");
    const shot = await webgl.screenshot();
    const thresholdShot = await page.screenshot();
    await enter.click();
    await page.waitForTimeout(2600);
    await expect(
      page.getByRole("button", { name: "Ask the Archive" }),
    ).toBeVisible();
    const after = await readStats(page);
    assertPaintedFrame(after);
    expect(after.hash).not.toBe(before.hash);
    const afterShot = await webgl.screenshot();
    const deskShot = await page.screenshot();

    expect(errors).toEqual([]);

    if (scratch) {
      const dir = path.join(scratch, `launch-${launch}`);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, "before.json"),
        JSON.stringify(before, null, 2),
      );
      writeFileSync(
        path.join(dir, "after.json"),
        JSON.stringify(after, null, 2),
      );
      writeFileSync(path.join(dir, "before.png"), shot);
      writeFileSync(path.join(dir, "after.png"), afterShot);
      if (launch === 1) {
        writeFileSync(
          path.join(scratch, "gl-renderer.txt"),
          `${before.renderer}\n`,
        );
        writeFileSync(path.join(scratch, "threshold.png"), thresholdShot);
        writeFileSync(path.join(scratch, "desk.png"), deskShot);
        const entryTier = await page
          .locator("[data-archive-scene]")
          .getAttribute("data-entry-tier");
        writeFileSync(
          path.join(scratch, "entry-budget.txt"),
          `firstFrameTier=${entryTier}\npixelRatio=${before.pixelRatio}\nfloorReversals=${before.floorReversals}\nshelfReversals=${before.shelfReversals}\n`,
        );
      }
    }
  });
}
