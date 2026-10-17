import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import "./lab-window";

test("the real 3D basin remains visible above the question and supports a quiet interaction", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?at=desk");
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-status",
    "ready",
    { timeout: 15000 },
  );
  const stats = await page.evaluate(() =>
    window.__pensieveArchive!.readStats(),
  );
  const question = await page.locator(".question-manuscript").boundingBox();
  expect(stats.surface).not.toBeNull();
  expect(stats.surface!.bottom).toBeLessThan(question!.y);
  expect(stats.surface!.right - stats.surface!.left).toBeGreaterThan(180);
  expect(stats.drawCalls).toBeLessThan(180);
  await page
    .getByRole("button", { name: "Quiet reading", exact: true })
    .click();
  await expect(page.locator("[data-archive-scene]")).toHaveAttribute(
    "data-frameloop",
    "demand",
  );
  const before = await page.evaluate(
    () => window.__pensieveArchive!.readStats().hash,
  );
  await page.getByRole("button", { name: "Stir the Pensieve" }).click();
  await page.waitForTimeout(120);
  const after = await page.evaluate(
    () => window.__pensieveArchive!.readStats().hash,
  );
  expect(after).not.toBe(before);
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("methods show their own traces and an unprepared full-context question has no fabricated metrics", async ({
  page,
}) => {
  await page.goto("/?at=desk");
  await page.getByRole("radio", { name: "✦ RAG", exact: true }).click();
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  await expect(
    page.getByText("8 candidates → 3 selected passages", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "The Complete Provenance of the Parchment",
    }),
  ).toHaveCount(0);
  await page
    .getByRole("radio", { name: "☾ FULL CONTEXT", exact: true })
    .click();
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(
    page.getByRole("heading", {
      name: "The Complete Provenance of the Parchment",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("8 candidates → 3 selected passages", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox")
    .fill("What is the architecture of this room?");
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(
    page.getByRole("heading", { name: "Uncatalogued Inquiry" }),
  ).toBeVisible();
  await expect(
    page.getByText("No prepared evidence in this scope", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Inspect citation/i }),
  ).toHaveCount(0);
  await expect(page.locator("[data-archive-scene]")).toHaveAttribute(
    "data-memory-count",
    "0",
  );
});

test("the source dialog highlights the exact passage, traps focus, and returns to its citation", async ({
  page,
}) => {
  await page.goto("/?at=desk");
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  const citation = page
    .getByRole("button", { name: /Inspect citation \[1\]/i })
    .first();
  await citation.click();
  const dialog = page.getByRole("dialog", { name: "Memory source" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("mark")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      Boolean(document.activeElement?.closest("dialog")),
    ),
  ).toBe(true);
  const scan = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(citation).toBeFocused();
});

test("mobile keeps the basin and controls usable, including the second comparison tome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?at=desk");
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-status",
    "ready",
    { timeout: 15000 },
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const stats = await page.evaluate(() =>
    window.__pensieveArchive!.readStats(),
  );
  const question = await page.locator(".question-manuscript").boundingBox();
  expect(stats.surface!.bottom).toBeLessThan(question!.y);
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await page
    .getByRole("button", { name: "☾ The Second Tome (Full)", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "The Complete Provenance of the Parchment",
    }),
  ).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("a WebGL failure preserves the complete research and evidence workflow", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith("webgl") || type === "experimental-webgl")
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/?at=desk");
  await expect(page.locator("main")).toHaveAttribute(
    "data-scene-status",
    "fallback",
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(
    page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Inspect citation \[1\]/i })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Memory source" }),
  ).toBeVisible();
});
