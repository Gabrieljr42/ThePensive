import { test, expect } from "@playwright/test";

test.describe("Midnight Archive Vertical Slice", () => {
  test("cinematic entrance reveals the stacks and transitions to desk", async ({ page }) => {
    await page.goto("/");

    // Verify Title & Entrance composition
    await expect(page.getByRole("heading", { name: "Pensieve", exact: true })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("The Midnight Archive").first()).toBeVisible();
    await expect(page.getByText("Ask the story. Follow the evidence.")).toBeVisible();

    const enterBtn = page.getByRole("button", { name: "Enter the Archive" });
    await expect(enterBtn).toBeVisible();

    // Click Enter the Archive to trigger camera approach
    await enterBtn.click();

    // Transition into research desk
    await expect(page.getByText("Active Corpus")).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("button", { name: "Ask the Archive" })).toBeVisible();
  });

  test("direct desk deep-link loads desk and runs inquiry ceremony", async ({ page }) => {
    await page.goto("/?at=desk");

    // Desk is immediately active
    await expect(page.getByText("Active Corpus")).toBeVisible();
    const askButton = page.getByRole("button", { name: "Ask the Archive" });
    await expect(askButton).toBeVisible();

    // Select volume
    const vol3Btn = page.getByRole("button", { name: /VOL\. III/i });
    await expect(vol3Btn).toBeVisible();

    // Submit question to trigger casting and retrieval ceremony
    await askButton.click();

    // Verify Twin Tomes reveal
    await expect(
      page.getByRole("heading", { name: "The Bequest of the Four Wanderers" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: "The Complete Provenance of the Parchment" }),
    ).toBeVisible({ timeout: 15000 });

    // Inspect Citation [1] in RAG tome
    const cit1 = page.getByRole("button", { name: /Inspect citation \[1\]/i }).first();
    await expect(cit1).toBeVisible();
    await cit1.click(); // Pin evidence

    // Verify Evidence Leaf with exact book and chapter provenance
    const evidenceLeaf = page.getByRole("region", { name: /Evidence passage/i });
    await expect(evidenceLeaf).toBeVisible();
    await expect(evidenceLeaf.getByText("The Prisoner of Azkaban")).toBeVisible();
    await expect(evidenceLeaf.getByText(/Chapter 10/i)).toBeVisible();
    await expect(evidenceLeaf.getByText("Exact quote verified")).toBeVisible();

    // Press Escape to dismiss evidence leaf
    await page.keyboard.press("Escape");
    await expect(evidenceLeaf).toBeHidden();
  });
});
