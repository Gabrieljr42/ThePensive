import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import "./lab-window";

const screenshots = resolve(process.cwd(), "../docs/screenshots");
test("the waiting journey glides between readable source folios and can pause without stopping the inquiry", async ({
  page,
}) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await preview(page, 25, 30);
  await expect(page.locator("main")).toHaveAttribute(
    "data-dive-phase",
    "waiting",
  );
  type WalkStats = {
    cameraPose: { z: number };
    writtenFolioCount: number;
    fragmentTexts: string[];
  };
  const read = () =>
    page.evaluate(() =>
      window.__pensieveArchive!.readStats(),
    ) as unknown as Promise<WalkStats>;
  const before = await read();
  expect(before.writtenFolioCount).toBe(6);
  expect(
    before.fragmentTexts.some((text) =>
      text.startsWith("Fred and George pulled Harry"),
    ),
  ).toBe(true);
  await page.waitForTimeout(1600);
  expect((await read()).cameraPose.z).toBeLessThan(before.cameraPose.z - 0.3);
  await page
    .getByRole("button", { name: "Pause journey", exact: true })
    .click();
  await expect(page.locator("[data-archive-scene]")).toHaveAttribute(
    "data-frameloop",
    "demand",
  );
  const paused = await read();
  await page.waitForTimeout(900);
  expect(
    Math.abs((await read()).cameraPose.z - paused.cameraPose.z),
  ).toBeLessThan(0.01);
  await page.screenshot({
    path: resolve(screenshots, "memory-walk-desktop.png"),
  });
  await page
    .getByRole("button", { name: "Resume journey", exact: true })
    .click();
  await page.waitForTimeout(500);
  expect((await read()).cameraPose.z).toBeLessThan(paused.cameraPose.z - 0.1);
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await page.waitForTimeout(120);
  expect((await read()).cameraPose.z).toBeGreaterThan(5);
  await expect(
    page.getByRole("button", { name: "Cancel inquiry", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel inquiry", exact: true })
    .click();
  expect(errors).toEqual([]);
});
async function preview(
  page: import("@playwright/test").Page,
  rag = 8,
  full = 11,
  fail = "none",
) {
  await page.goto("/lab/descent");
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-status",
    "ready",
  );
  await page.getByLabel("RAG delay (seconds)").fill(String(rag));
  await page.getByLabel("Full Context delay (seconds)").fill(String(full));
  await page.getByLabel("Simulated failure").selectOption(fail);
  await page
    .getByRole("button", { name: "Start preview", exact: true })
    .click();
  await page.getByRole("button", { name: "Hide preview controls −" }).click();
}
test("the camera crosses the actual basin into a 3D memory interior and releases the first method", async ({
  page,
}) => {
  test.setTimeout(45000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await preview(page, 9, 13);
  await expect(page.locator("main")).toHaveAttribute(
    "data-dive-phase",
    "waiting",
  );
  const stats = (await page.evaluate(() =>
    window.__pensieveArchive!.readStats(),
  )) as unknown as {
    interiorVisible: boolean;
    drawCalls: number;
    triangles: number;
    cameraPose: { z: number };
  };
  expect(stats.interiorVisible).toBe(true);
  expect(stats.cameraPose.z).toBeLessThan(3.1);
  expect(stats.drawCalls).toBeLessThan(150);
  expect(stats.triangles).toBeLessThan(60000);
  mkdirSync(screenshots, { recursive: true });
  await page.screenshot({
    path: resolve(screenshots, "descent-interior-desktop.png"),
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(
    page.locator('[data-method="full_context"].archive-tome'),
  ).toHaveAttribute("data-branch-status", "generating");
  await page
    .getByRole("button", { name: /Inspect citation \[1\]/ })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Memory source" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-method="full_context"].archive-tome'),
  ).toHaveAttribute("data-branch-status", "complete");
  await expect(page.locator("main")).toHaveAttribute("data-phase", "evidence");
  await expect(
    page.getByRole("dialog", { name: "Memory source" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("an immediate answer abbreviates the journey and Full Context can finish first on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preview(page, 1.5, 0.2);
  await expect(
    page.getByRole("heading", {
      name: "The Complete Provenance of the Parchment",
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(
    page.locator('[data-method="rag"].archive-tome'),
  ).toHaveAttribute("data-branch-status", "complete");
  await expect(
    page.getByRole("heading", {
      name: "The Complete Provenance of the Parchment",
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("Escape skips the presentation while the inquiry keeps working", async ({
  page,
}) => {
  await preview(page, 2, 3);
  await expect(
    page.getByRole("region", { name: "Memory journey" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(
    page.getByRole("button", { name: "Cancel inquiry", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
});
test("cancelling the journey preserves the question and discards delayed responses", async ({
  page,
}) => {
  await preview(page, 2, 3);
  await page
    .getByRole("button", { name: "Cancel inquiry", exact: true })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(page.getByRole("textbox")).toHaveValue(/Marauder/);
  await page.waitForTimeout(3400);
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Ask the Archive/ }),
  ).toBeEnabled();
});
test("motion preferences can interrupt a crossing without cancelling its result", async ({
  page,
}) => {
  await preview(page, 5.2, 6);
  await expect(page.locator("main")).toHaveAttribute(
    "data-dive-phase",
    "crossing",
  );
  await page
    .getByRole("button", { name: "Quiet reading", exact: true })
    .click();
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(page.locator("[data-archive-scene]")).toHaveAttribute(
    "data-frameloop",
    "demand",
  );
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
});
test("a failed method does not erase the successful answer", async ({
  page,
}) => {
  await preview(page, 0.1, 0.2, "full_context");
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-method="full_context"].archive-tome'),
  ).toHaveAttribute("data-branch-status", "failed");
  await expect(
    page.getByText("This method could not complete the inquiry. Try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ask the Archive/ }),
  ).toBeEnabled();
});

test("a 90-second inquiry settles into a long wait and releases each method independently", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.clock.install();
  await preview(page, 90, 120);
  await expect(page.locator("main")).toHaveAttribute(
    "data-dive-phase",
    "waiting",
  );
  await page.clock.fastForward(21000);
  await expect(page.locator(".dive-overlay")).toHaveAttribute(
    "data-long-wait",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Skip animation" }),
  ).toBeVisible();
  await page.clock.fastForward(65000);
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-dive-phase", "idle");
  await expect(
    page.locator('[data-method="full_context"].archive-tome'),
  ).toHaveAttribute("data-branch-status", "generating");
  await page
    .getByRole("button", { name: "Cancel inquiry", exact: true })
    .click();
});
