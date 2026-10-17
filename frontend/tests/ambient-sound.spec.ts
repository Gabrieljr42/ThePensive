import { test, expect } from "@playwright/test";
import "./lab-window";

test("ambient audio starts only on request, persists across entering, and remembers volume", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Base = window.AudioContext;
    window.pensieveAudioCreations = 0;
    window.AudioContext = class extends Base {
      constructor(options?: AudioContextOptions) {
        super(options);
        window.pensieveAudioCreations =
          (window.pensieveAudioCreations ?? 0) + 1;
      }
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Enter the Archive" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.pensieveAudioCreations)).toBe(0);
  const sound = page.getByRole("button", {
    name: "Ambient sound",
    exact: true,
  });
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.pensieveAudioCreations)).toBe(1);
  const volume = page.getByRole("slider", { name: "Ambient volume" });
  await volume.focus();
  await volume.press("Home");
  for (let step = 0; step < 35; step++) await volume.press("ArrowRight");
  await page.getByRole("button", { name: "Enter the Archive" }).click();
  await expect(
    page.getByRole("region", { name: "Research desk" }),
  ).toBeVisible();
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => window.pensieveAudioCreations)).toBe(0);
  await sound.click();
  await expect(
    page.getByRole("slider", { name: "Ambient volume" }),
  ).toHaveValue("35");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
});
