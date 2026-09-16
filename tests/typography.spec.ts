import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { DEFAULT_SETTINGS } from "../src/core";

async function ready(page: Page) {
  await expect(page.getByTestId("layout-status")).toHaveAttribute("data-ready", "true");
}

async function download(page: Page, format: "json" | "svg" | "zip") {
  await ready(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("dialog").locator("button.export-option")
    .filter({ hasText: new RegExp(format, "i") }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const bytes = new Uint8Array(await readFile((await file.path())!));
  await page.keyboard.press("Escape");
  return bytes;
}

test("font size is pt-only and preserves equivalent SVG, HTML and JSON sizes", async ({ page }) => {
  await page.goto("/");
  await ready(page);
  const fontSize = page.getByRole("spinbutton", { name: "Font size", exact: true });
  await expect(fontSize).toHaveValue("12");
  await expect(fontSize.locator("..").locator(".input-unit")).toHaveText("pt");
  await expect(page.getByRole("combobox", { name: "Typography input unit" })).toHaveCount(0);
  await expect(fontSize).toHaveAttribute("min", "4.5");
  await expect(fontSize).toHaveAttribute("max", "90");
  await expect(fontSize).toHaveAttribute("step", "0.25");
  for (const name of ["Line height", "Letter spacing"])
    await expect(page.getByRole("spinbutton", { name, exact: true }).locator("..").locator(".input-unit")).toHaveText("px");

  await fontSize.fill("18");
  await fontSize.press("Tab");
  const saved = JSON.parse(strFromU8(await download(page, "json")));
  expect(saved).toMatchObject({ schemaVersion: 1, fontSize: 24, lineHeight: 24 });
  const svg = strFromU8(await download(page, "svg"));
  expect(svg).toContain('font-size="24"');
  const zip = unzipSync(await download(page, "zip"));
  expect(strFromU8(zip["index.html"]!)).toContain("--font-size:24px");
  expect(JSON.parse(strFromU8(zip["settings.json"]!)).fontSize).toBe(24);
  await page.reload();
  await ready(page);
  await expect(fontSize).toHaveValue("18");

  await page.getByTestId("seed-input").fill("149");
  await page.getByTestId("apply-seed").click();
  const randomized = JSON.parse(strFromU8(await download(page, "json")));
  expect(Number(await fontSize.inputValue())).toBeCloseTo(randomized.fontSize * 72 / 96, 4);
  await expect(fontSize.locator("..").locator(".input-unit")).toHaveText("pt");
});

test("legacy JSON and Korean controls retain pt after import, reset and invalid input", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("language-select").selectOption("ko");
  await ready(page);
  const fontSize = page.getByRole("spinbutton", { name: "글자 크기", exact: true });
  await page.locator('input[type="file"]').setInputFiles({
    name: "v1-settings.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...DEFAULT_SETTINGS, fontSize: 22 })),
  });
  await ready(page);
  await expect(fontSize).toHaveValue("16.5");
  await expect(fontSize.locator("..").locator(".input-unit")).toHaveText("pt");
  await expect(page.getByRole("combobox", { name: "타이포그래피 입력 단위" })).toHaveCount(0);
  await expect(page.locator('.artboard svg text[font-size="22"]').first()).toBeVisible();

  await fontSize.fill("3");
  await expect(fontSize).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByTestId("layout-status")).toHaveAttribute("data-ready", "false");
  await page.getByRole("button", { name: "설정 초기화", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "초기화", exact: true }).click();
  await ready(page);
  await expect(fontSize).toHaveValue("12");
  await expect(fontSize.locator("..").locator(".input-unit")).toHaveText("pt");
  await page.reload();
  await ready(page);
  await expect(fontSize).toHaveValue("12");
});
