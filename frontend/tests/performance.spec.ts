import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    pensieveLab: { lcp: number; cls: number; longestInteraction: number };
  }
}

test("production desk keeps layout stable and responds promptly", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { lcp: 0, cls: 0, longestInteraction: 0 };
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
        if (entry.interactionId)
          metrics.longestInteraction = Math.max(
            metrics.longestInteraction,
            entry.duration,
          );
      }
    }).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  });
  await page.goto("/ask");
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Explore the constellation", exact: true })
    .click();
  await expect(
    page.getByLabel("Evidence constellation", { exact: true }),
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const metrics = await page.evaluate(() => window.pensieveLab);
  await testInfo.attach("local-performance-sample", {
    body: JSON.stringify({
      conditions:
        "Loopback production server, desktop Chrome, 1440x1000, no throttling, one laboratory sample. Event durations below the reporting threshold may be absent.",
      ...metrics,
    }),
    contentType: "application/json",
  });
  expect(metrics.lcp).toBeGreaterThan(0);
  expect(metrics.lcp).toBeLessThan(2500);
  expect(metrics.cls).toBeLessThanOrEqual(0.1);
  expect(metrics.longestInteraction).toBeLessThanOrEqual(200);
});
