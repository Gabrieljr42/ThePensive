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
