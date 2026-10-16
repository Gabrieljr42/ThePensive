import { test, expect } from "@playwright/test";

test("live HTTP inquiries preserve scope, progressive methods, and exact PDF evidence", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const source = {
    id: "pdf-browser:page-1", corpus_id: "harry-potter-archive", corpus_version: "pdf-browser",
    book: "The Lantern Ledger", book_short: "Ledger", edition: "Original browser test edition",
    chapter: "The keeper", chapter_number: 1, page_label: "1", page_kind: "pdf",
    text: "😀 Mara keeps the blue lantern. The observatory opens at midnight.",
    attribution: "Pensieve original fixture", book_id: "vol-1", chapter_id: "vol-1-ch-1",
    pdf_page_index: 0,
  };
  const excerpt = "Mara keeps the blue lantern.";
  const branches = ["rag", "full_context"].map((method) => ({
    id: "browser-run:" + method, method, status: "complete",
    answer_title: method === "rag" ? "The keeper of the lantern" : "The complete selected memory",
    introduction: "", conclusion: "", insufficient_evidence: false,
    claims: [{ id: method + ":claim", text: "Mara keeps the blue lantern.", citations: [{
      id: method + ":citation", number: 1, source_id: source.id, excerpt,
      start_offset: 2, end_offset: 2 + excerpt.length,
      structural_status: "verified", support_status: "not_assessed",
    }] }],
    context: { source_ids: [source.id], selected_source_count: 1, supplied_source_count: 1,
      strategy: method === "rag" ? "retrieved_passages" : "complete_scope", is_simulated: false },
    metrics: { basis: "provider_reported", usage_status: "reported", input_tokens: 100,
      output_tokens: 25, latency_ms: 1200, estimated_cost_usd: 0.0001 },
  }));
  const run = { schema_version: "2.0", id: "browser-run", question: "Who keeps the blue lantern?",
    mode: "compare", data_mode: "live", is_preview: false, created_at: new Date().toISOString(),
    status: "complete", branches, sources: [source], configuration: {
      corpus_id: source.corpus_id, corpus_version: source.corpus_version,
      scope_label: "One selected chapter", model: "fixture-provider", prompt_version: "test",
      output_limit: 2048, book_ids: ["vol-1"], chapter_ids: ["vol-1-ch-1"],
    } };
  let polls = 0;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let body: unknown;
    if (url.pathname.endsWith("/status")) {
      body = { schema_version: "2.0", live_enabled: true, public_mode: true, public_chapter_limit: 3 };
    } else if (url.pathname.endsWith("/corpora")) {
      body = [{ id: source.corpus_id, version: source.corpus_version, title: source.book,
        subtitle: "Original fixture", edition: source.edition, source_kind: "original_fiction",
        book_count: 1, source_count: 1, examples: [], language: "en", indexed: true,
        books: [{ id: "vol-1", ordinal: 1, title: source.book, chapters: [{
          id: "vol-1-ch-1", number: 1, title: source.chapter, page_start: 1, page_end: 1,
          source_count: 1, chunk_count: 1, estimated_tokens: 100, indexed: true,
        }] }] }];
    } else if (url.pathname.endsWith("/estimate")) {
      const request = route.request().postDataJSON();
      expect(request.book_ids).toEqual(["vol-1"]);
      expect(request.chapter_ids).toEqual(["vol-1-ch-1"]);
      expect(request.idempotency_key).toBeTruthy();
      body = { schema_version: "2.0", branches: [{ method: "rag", eligible: true },
        { method: "full_context", eligible: true }], maximum_cost_usd: 0.01,
        available_budget_usd: 5, live_available: true };
    } else if (route.request().method() === "POST") {
      body = { ...run, status: "running", sources: [], branches: branches.map((branch) => ({
        ...branch, status: "queued", claims: [],
      })) };
    } else {
      polls++;
      body = polls === 1 ? { ...run, status: "running", branches: [branches[0], {
        ...branches[1], status: "generating", claims: [],
      }] } : run;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/ask");
  await expect(page.getByText(/Live inquiry · supplied English PDF/)).toBeVisible();
  await page.locator("#archive-inquiry-input").fill("Who keeps the blue lantern?");
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(page.getByRole("heading", { name: "The keeper of the lantern" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The complete selected memory" })).toBeVisible();
  await page.getByRole("button", { name: /Inspect citation \[1\]/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Memory source" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("mark")).toHaveText(excerpt);
  await expect(dialog.getByText(/Page 1 \(PDF\)/)).toBeVisible();
  await expect(dialog.getByText("Exact quote verified")).toBeVisible();
});

test("live corpus examples preserve chapters and books without sources stay disabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ schema_version: "2.0", live_enabled: true, public_mode: true, public_chapter_limit: 3, full_context_token_limit: 30000 }),
  }));
  await page.route("**/api/corpora", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{
      id: "harry-potter-archive", version: "pdf-live-fixture", title: "Fixture", subtitle: "",
      edition: "Test", source_kind: "ingested_edition", book_count: 3, source_count: 2,
      examples: [{ id: "fixture-q", label: "Ask about the lantern", question: "Who keeps the lantern?" }],
      language: "en", indexed: true,
      books: [
        { id: "vol-1", ordinal: 1, title: "The Keeper", chapters: [
          { id: "vol-1-ch-1", number: 1, title: "The keeper", page_start: 1, page_end: 1,
            source_count: 1, chunk_count: 1, estimated_tokens: 100, indexed: true },
        ] },
        { id: "vol-2", ordinal: 2, title: "The Empty Ledger", chapters: [
          { id: "vol-2-ch-1", number: 1, title: "Not ingested", page_start: 1, page_end: 1,
            source_count: 0, chunk_count: 0, estimated_tokens: 0, indexed: false },
        ] },
        { id: "vol-3", ordinal: 3, title: "The Unindexed Draft", chapters: [
          { id: "vol-3-ch-1", number: 1, title: "Extracted, not embedded", page_start: 1, page_end: 1,
            source_count: 1, chunk_count: 0, estimated_tokens: 100, indexed: false },
        ] },
      ],
    }]),
  }));
  await page.goto("/ask");
  await expect(page.getByText(/Live inquiry · supplied English PDF/)).toBeVisible();
  const chapters = page.locator('input[type="checkbox"]');
  await expect(chapters).toHaveCount(1);
  const chapter = chapters.first();
  await page.locator("details summary").click();
  await expect(chapter).toBeChecked();
  const emptyBook = page.getByRole("button", { name: /The Empty Ledger/i });
  const unindexedBook = page.getByRole("button", { name: /The Unindexed Draft/i });
  await expect(emptyBook).toBeDisabled();
  await expect(unindexedBook).toBeDisabled();
  await page.getByRole("radio", { name: "FULL CONTEXT" }).click();
  await expect(unindexedBook).toBeEnabled();
  await expect(page.getByText(/Full Context is configured for up to 30,000 provider-counted input tokens/)).toBeVisible();
  await unindexedBook.click();
  await page.getByRole("button", { name: "Use first three chapters" }).click();
  await expect(chapter).toBeChecked();
  await page.getByRole("button", { name: "Ask about the lantern" }).click();
  await expect(page.locator("#archive-inquiry-input")).toHaveValue("Who keeps the lantern?");
  await expect(chapter).toBeChecked();
  await page.getByRole("button", { name: "Select all chapters for RAG" }).click();
  await expect(page.getByRole("radio", { name: "RAG" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(page.getByRole("button", { name: /Ask the Archive/i })).toBeDisabled();
  await expect(page.getByRole("status").filter({ hasText: /will not expand an empty scope/ })).toBeVisible();
});

test("a live API failure blocks the prepared demo transport", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/status", (route) => route.fulfill({
    status: 503, contentType: "application/json",
    body: JSON.stringify({ code: "archive_unavailable", message: "offline" }),
  }));
  await page.goto("/ask");
  await expect(page.getByRole("alert").filter({ hasText: /temporarily unavailable/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ask the Archive/i })).toBeDisabled();
  await expect(page.getByText(/Recorded demonstration/)).toHaveCount(0);
});

test("an explicitly disabled live API keeps the recorded demo available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ schema_version: "2.0", live_enabled: false, public_mode: false, public_chapter_limit: 3 }),
  }));
  await page.goto("/ask");
  await expect(page.getByText(/Recorded demonstration · prepared answers/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Ask the Archive/i })).toBeEnabled();
});

test("a live budget rejection preserves the question and scope", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ schema_version: "2.0", live_enabled: true, public_mode: false, public_chapter_limit: 3 }),
  }));
  await page.route("**/api/corpora", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{
      id: "harry-potter-archive", version: "pdf-budget-fixture", title: "Fixture", subtitle: "",
      edition: "Test", source_kind: "ingested_edition", book_count: 1, source_count: 1,
      examples: [], language: "en", indexed: true,
      books: [{ id: "vol-1", ordinal: 1, title: "The Keeper", chapters: [
        { id: "vol-1-ch-1", number: 1, title: "The keeper", page_start: 1, page_end: 1,
          source_count: 1, chunk_count: 1, estimated_tokens: 100, indexed: true },
      ] }],
    }]),
  }));
  let created = false;
  await page.route("**/api/runs/estimate", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ schema_version: "2.0", branches: [
      { method: "rag", eligible: true }, { method: "full_context", eligible: true },
    ], maximum_cost_usd: 0.02, available_budget_usd: 0.01, live_available: true }),
  }));
  await page.route("**/api/runs", async (route) => {
    created = true;
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await page.goto("/ask");
  await expect(page.getByText(/Live inquiry · supplied English PDF/)).toBeVisible();
  await page.locator("#archive-inquiry-input").fill("Who keeps the lantern?");
  await page.getByRole("button", { name: /Ask the Archive/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: /remaining API budget is insufficient/ })).toBeVisible();
  await expect(page.locator("#archive-inquiry-input")).toHaveValue("Who keeps the lantern?");
  expect(created).toBe(false);
});

