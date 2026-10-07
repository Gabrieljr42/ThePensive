import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("../docs/verification/descent");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error" && !message.text().includes("404 (Not Found)"))
    errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
await page.goto(
  (process.env.BASE_URL ?? "http://127.0.0.1:3001") + "/lab/descent",
);
await page.locator('main[data-scene-status="ready"]').waitFor();
await page.getByLabel("RAG delay (seconds)").fill("30");
await page.getByLabel("Full Context delay (seconds)").fill("40");
await page.getByRole("button", { name: "Start preview", exact: true }).click();
await page.getByRole("button", { name: "Hide preview controls −" }).click();
const stats = [];
for (const phase of ["approaching", "crossing", "within", "waiting"]) {
  await page.locator(`main[data-dive-phase="${phase}"]`).waitFor();
  await page.screenshot({ path: resolve(output, `${phase}.png`) });
  stats.push({
    phase,
    ...(await page.evaluate(() => window.__pensieveArchive.readStats())),
  });
}
await page.waitForTimeout(800);
await page.screenshot({
  path: resolve("../docs/screenshots/descent-interior-desktop.png"),
});
await writeFile(
  resolve(output, "frames.json"),
  JSON.stringify(
    {
      conditions:
        "Desktop Chrome, local loopback, no CPU throttling; not a mobile GPU measurement.",
      stats,
      errors,
    },
    null,
    2,
  ),
);
await page.getByRole("button", { name: "Cancel inquiry", exact: true }).click();
await browser.close();
console.log(
  JSON.stringify({
    output,
    errors,
    firstMemoryPage: stats.at(-1).firstMemoryPage,
    calls: stats.at(-1).drawCalls,
    triangles: stats.at(-1).triangles,
  }),
);
