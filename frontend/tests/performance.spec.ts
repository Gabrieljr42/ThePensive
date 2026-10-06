import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import "./lab-window";

function installLab(page: Page) {
  return page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, longestInteraction: 0, longTasks: [] as number[] };
    window.pensieveLab = metrics;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[]) {
        if (!entry.hadRecentInput) metrics.cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        interactionId: number;
      })[]) {
        if (entry.interactionId) {
          metrics.longestInteraction = Math.max(metrics.longestInteraction, entry.duration);
        }
      }
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) metrics.longTasks.push(entry.duration);
      }).observe({ type: "longtask", buffered: true });
    } catch {
      // Long task timing is required in the lab Chrome this suite runs.
    }
  });
}

async function settle(page: Page) {
  await page.waitForSelector("canvas");
  await page.waitForFunction(() => Boolean(window.__pensieveArchive?.readStats));
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

async function readBudget(page: Page) {
  return page.evaluate(() => {
    const scene = document.querySelector("[data-archive-scene]");
    const stats = window.__pensieveArchive?.readStats();
    const ratio =
      stats && stats.clientWidth > 0 ? stats.width / stats.clientWidth : 0;
    return {
      ...window.pensieveLab,
      tier: scene?.getAttribute("data-quality-tier"),
      entryTier: scene?.getAttribute("data-entry-tier"),
      ratio,
      pixelRatio: stats?.pixelRatio ?? 0,
    };
  });
}

test("archive entry stays inside the long-task and pixel-ratio budget", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await installLab(page);

  const routes: { path: string; control: RegExp }[] = [
    { path: "/", control: /Enter the Archive/i },
    { path: "/?at=desk", control: /Ask the Archive/i },
  ];
  const samples = [];

  for (const route of routes) {
    await page.goto(route.path);
    const control = page.getByRole("button", { name: route.control });
    await expect(control).toBeEnabled();
    await settle(page);
    const beforeClick = await readBudget(page);
    expect(beforeClick.longTasks.every((duration) => duration <= 1000)).toBe(true);
    expect(beforeClick.lcp).toBeGreaterThanOrEqual(0);
    expect(beforeClick.lcp).toBeLessThan(3500);
    expect(beforeClick.cls).toBeLessThanOrEqual(0.1);
    expect(["mid", "low"]).toContain(beforeClick.entryTier);
    expect(beforeClick.ratio).toBeGreaterThanOrEqual(1);
    const cap = beforeClick.tier === "high" ? 1.5 : 1.25;
    expect(beforeClick.ratio).toBeLessThanOrEqual(cap + 0.02);
    expect(beforeClick.pixelRatio).toBeLessThanOrEqual(cap + 0.02);

    await page.evaluate(() => {
      window.pensieveLab.longestInteraction = 0;
    });
    await control.click();
    await page.waitForTimeout(80);
    const clickDuration = await page.evaluate(() => window.pensieveLab.longestInteraction);
    expect(clickDuration).toBeLessThanOrEqual(200);
    samples.push({ route: route.path, ...beforeClick, clickDuration });
  }

  expect(errors).toEqual([]);
  const scratch = process.env.PENSIEVE_SCRATCH;
  if (scratch) {
    mkdirSync(scratch, { recursive: true });
    writeFileSync(
      path.join(scratch, "entry-performance.json"),
      JSON.stringify(
        {
          conditions:
            "Loopback production server, desktop Chrome, 1440x1000, no throttling. Event durations below the reporting threshold may be absent.",
          samples,
        },
        null,
        2,
      ),
    );
  }
});

test("reduced motion leaves the archive canvas still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installLab(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /Enter the Archive/i })).toBeVisible();
  await page.waitForFunction(
    () => document.querySelector("[data-quality-tier]")?.getAttribute("data-quality-tier") === "low",
  );
  await settle(page);
  await page.waitForTimeout(200);
  const first = await page.evaluate(() => window.__pensieveArchive?.readStats().hash ?? null);
  await page.waitForTimeout(500);
  const second = await page.evaluate(() => window.__pensieveArchive?.readStats().hash ?? null);
  expect(first).not.toBeNull();
  expect(second).toBe(first);

  const loop = await page
    .locator("[data-archive-scene]")
    .getAttribute("data-frameloop");
  expect(loop).toBe("demand");
});
