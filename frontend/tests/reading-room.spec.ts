import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { ExperimentRun } from "../src/lib/contracts";

test.beforeEach(async ({ page }) => {
  await page.goto("/ask");
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("tome-rag")).toBeVisible();
});

test("desktop opens two tomes and source leaves without horizontal overflow", async ({
  page,
}) => {
  const rag = await page.getByTestId("tome-rag").boundingBox();
  const full = await page.getByTestId("tome-full_context").boundingBox();
  expect(rag).not.toBeNull();
  expect(full).not.toBeNull();
  expect(full!.x).toBeGreaterThan(rag!.x + rag!.width);
  await expect(
    page.getByRole("heading", { name: "The source leaves" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../docs/screenshots/ask-desktop.png",
    fullPage: true,
  });
});

test("citation three resolves the exact source and Escape restores focus", async ({
  page,
}) => {
  const citation = page.getByRole("button", { name: /^Citation 3:/ });
  await citation.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByText("Demo folio 45", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    drawer.getByText("Exact passage matched", { exact: true }),
  ).toBeVisible();
  await expect(drawer.locator("mark")).toHaveText(
    "The mirror first exposes a private longing and later tests the intention behind a choice.",
  );
  await expect(
    page.getByRole("button", { name: "Close evidence", exact: true }),
  ).toBeFocused();
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: "../docs/screenshots/evidence-desktop.png" });
  await page.keyboard.press("Escape");
  await expect(drawer).not.toBeVisible();
  await expect(citation).toBeFocused();
});

test("submitted modes call the same contract and render their own branches", async ({
  page,
}) => {
  for (const mode of ["rag", "full_context", "compare"] as const) {
    const radioName =
      mode === "rag"
        ? /^RAG/
        : mode === "full_context"
          ? /^Full Context/
          : /^Compare/;
    await page.getByRole("radio", { name: radioName }).check({ force: true });
    await page
      .getByRole("button", { name: "Ask the archive", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Stop reading", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Ask the archive", exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByTestId(
        mode === "full_context" ? "tome-full_context" : "tome-rag",
      ),
    ).toBeVisible();
    if (mode !== "compare")
      await expect(
        page.getByTestId(mode === "rag" ? "tome-full_context" : "tome-rag"),
      ).toHaveCount(0);
    else await expect(page.getByTestId("tome-full_context")).toBeVisible();
  }
});

test("changing the corpus changes the answer and its original source", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: /^Select The Lantern Ledger collection/ })
    .click();
  await expect(
    page
      .getByTestId("tome-rag")
      .getByRole("heading", { name: "An unfinished connection" }),
  ).toBeVisible();
  await page
    .getByTestId("tome-rag")
    .getByRole("button", { name: /^Citation 1:/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText("The Lantern Ledger", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Exact passage matched", { exact: true }),
  ).toBeVisible();
});

test("unprepared questions produce an honest empty evidence state", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Test the archive’s limits", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ask the archive", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "A question still open", exact: true }),
  ).toHaveCount(2);
  await expect(page.getByRole("button", { name: /^Citation/ })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "The source leaves" }),
  ).toHaveCount(0);
});

test("stop reading cancels pending branches and retains the question", async ({
  page,
}) => {
  let createdRuns = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/runs"))
      createdRuns += 1;
  });
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/runs") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Ask the archive", exact: true })
    .click();
  const created = (await (await createdResponse).json()) as ExperimentRun;
  await expect(page.getByTestId("tome-full_context")).toBeVisible();
  const cancelledResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/runs/${created.id}/cancel`),
  );
  await page.getByRole("button", { name: "Stop reading", exact: true }).click();
  const cancelled = (await (await cancelledResponse).json()) as ExperimentRun;
  expect(cancelled.status).toBe("cancelled");
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
  for (const branch of cancelled.branches) {
    await expect(page.getByTestId(`tome-${branch.method}`)).toContainText(
      branch.status === "cancelled" ? "Reading stopped" : branch.answer_title,
    );
  }
  expect(createdRuns).toBe(1);
  await expect(page.getByRole("textbox")).toHaveValue(
    "What does the Mirror of Erised reveal, and why is it dangerous?",
  );
});

test("request errors are actionable and a failed branch leaves its partner readable", async ({
  page,
  request,
}) => {
  await page.route("**/api/runs", async (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        code: "unavailable",
        message: "The archive could not be reached. Please try again.",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Ask the archive", exact: true })
    .click();
  await expect(
    page.getByRole("alert", { name: "Archive request error" }),
  ).toContainText("The archive could not be reached.");
  await page.unroute("**/api/runs");
  const preview = (await (
    await request.get("/api/demo")
  ).json()) as ExperimentRun;
  preview.status = "failed";
  preview.is_preview = false;
  preview.branches[1].status = "failed";
  preview.branches[1].claims = [];
  preview.branches[1].error = "The second tome could not finish reading.";
  await page.route("**/api/runs", async (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(preview),
    }),
  );
  await page
    .getByRole("button", { name: "Ask the archive", exact: true })
    .click();
  await expect(page.getByTestId("tome-rag")).toContainText(
    "A reflection of desire",
  );
  await expect(page.getByTestId("tome-full_context")).toContainText(
    "The second tome could not finish reading.",
  );
});

test("mobile tabs, stacking, full-height evidence, and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByTestId("tome-rag")).toBeVisible();
  await expect(page.getByTestId("tome-full_context")).not.toBeVisible();
  await page.getByRole("tab", { name: "RAG", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Full Context", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("tome-full_context")).toBeVisible();
  await page
    .getByRole("button", { name: "Stack answers", exact: true })
    .click();
  await expect(page.getByTestId("tome-rag")).toBeVisible();
  await expect(page.getByTestId("tome-full_context")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../docs/screenshots/ask-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Citation 3:/ }).click();
  await expect(
    page.getByText("Exact passage matched", { exact: true }),
  ).toBeVisible();
  const dialog = await page.getByRole("dialog").boundingBox();
  expect(dialog!.height).toBe(844);
  expect(dialog!.width).toBe(390);
  await page.screenshot({ path: "../docs/screenshots/evidence-mobile.png" });
});

test("tablet and narrow mobile preserve reflow and accessible controls", async ({
  page,
}) => {
  for (const width of [820, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width === 820)
      await expect(page.getByTestId("tome-full_context")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("the threshold has a cinematic entrance and an immediate desk path", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Pensieve", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Go directly to the desk" }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({ path: "../docs/screenshots/entrance-desktop.png" });
  await page
    .getByRole("link", { name: "Enter the archive", exact: true })
    .click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
});

test("book objects select the corpus and the constellation uses real citation links", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: /^Select Harry Potter/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Explore the constellation", exact: true })
    .click();
  await expect(
    page.getByLabel("Evidence constellation", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".constellation-claim-node")).toHaveCount(5);
  await expect(page.locator(".constellation-source-node")).toHaveCount(3);
  await expect(page.locator(".source-orbit")).toHaveCount(5);
  await page.locator(".constellation-source-node").last().focus();
  await expect(page.locator(".source-orbit.orbit-lit")).toHaveCount(1);
  await page.locator(".constellation-source-node").last().click();
  await expect(
    page.getByText("Exact passage matched", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("mark")).toHaveText(
    "The mirror first exposes a private longing and later tests the intention behind a choice.",
  );
});

test("searching illuminates only the sources selected for RAG", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Ask the archive", exact: true })
    .click();
  await expect(
    page.getByLabel("Prepared source selection trace", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ritual-source")).toHaveCount(4);
  await expect(page.locator(".ritual-held")).toHaveCount(2);
  await expect(page.locator(".ritual-context")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Ask the archive", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByLabel("Prepared source selection trace", { exact: true }),
  ).toHaveCount(0);
});
