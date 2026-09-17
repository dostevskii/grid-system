import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { DEFAULT_SETTINGS } from "../src/core";

async function ready(page: Page) {
  await expect(page.getByTestId("layout-status")).toHaveAttribute("data-ready", "true");
}
async function download(page: Page, kind: "json" | "svg" | "zip") {
  await ready(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("dialog").locator("button.export-option").filter({ hasText: new RegExp(kind, "i") }).click();
  const file = await pending;
  expect(await file.failure()).toBeNull();
  const bytes = new Uint8Array(await readFile((await file.path())!));
  await page.keyboard.press("Escape");
  return bytes;
}
async function settings(page: Page) { return JSON.parse(strFromU8(await download(page, "json"))); }

test("v1.1 starts English, localizes module presets, and remembers Korean", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("language-select")).toHaveValue("en");
  for (const name of ["Columns", "Rows", "Line height"])
    await expect(page.getByRole("spinbutton", { name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "20 modules", exact: true })).toBeVisible();
  await page.getByTestId("language-select").selectOption("ko");
  await expect(page.getByRole("button", { name: "20분할", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("language-select")).toHaveValue("ko");
});

test("grid seed is deterministic, starts empty, and typography waits for a grid lock", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("grid-seed-input").fill("14");
  await page.getByTestId("apply-grid-seed").click();
  await ready(page);
  const grid = await settings(page);
  expect(grid.workflow).toMatchObject({ gridSeed: 14, gridLocked: false, mode: "empty" });
  await expect(page.getByTestId("randomize-typography")).toBeDisabled();
  await expect(page.locator(".grid-empty-hint")).toBeVisible();
  await page.getByTestId("toggle-grid-lock").click();
  await expect(page.getByTestId("randomize-typography")).toBeEnabled();
  await expect(page.getByRole("spinbutton", { name: "Columns", exact: true })).toBeDisabled();
  await page.getByTestId("randomize-typography").click();
  await ready(page);
  const typed = await settings(page);
  expect(typed.workflow).toMatchObject({ gridSeed: 14, gridLocked: true, mode: "typography" });
  expect(typed.columns).toBe(grid.columns);
  expect(typed.rows).toBe(grid.rows);
  await page.getByTestId("toggle-grid-lock").click();
  await page.getByTestId("grid-seed-input").fill("14");
  await page.getByTestId("apply-grid-seed").click();
  await ready(page);
  const replayed = await settings(page);
  expect(replayed.workflow).toMatchObject({ gridSeed: 14, gridLocked: false, mode: "empty" });
  for (const key of ["columns", "rows", "margin", "gutter"] as const)
    expect(replayed[key]).toEqual(grid[key]);
  for (const key of ["fontId", "fontWeight", "fontSize", "lineHeight", "letterSpacing", "seed"] as const)
    expect(replayed[key]).toEqual(typed[key]);
});

test("locks disable manual geometry and composition fields, and unlocking grid releases composition", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("randomize-grid").click();
  await ready(page);
  await expect(page.getByTestId("toggle-grid-lock")).toHaveAttribute("aria-label", "Lock grid");
  await page.getByTestId("toggle-grid-lock").click();
  await expect(page.getByTestId("toggle-grid-lock")).toHaveAttribute("aria-label", "Unlock grid");
  for (const name of ["Columns", "Rows", "Top margin", "Horizontal gutter"])
    await expect(page.getByRole("spinbutton", { name, exact: true })).toBeDisabled();
  await page.getByTestId("randomize-typography").click();
  await ready(page);
  await page.getByTestId("toggle-composition-lock").click();
  for (const name of ["Font size", "Font weight", "Line height", "Letter spacing", "Paragraph fill", "Text color"])
    await expect(page.getByLabel(name, { exact: true })).toBeDisabled();
  await page.getByTestId("toggle-grid-lock").click();
  await expect(page.getByTestId("toggle-composition-lock")).toHaveAttribute("aria-label", "Lock composition");
});

test("workflow is retained across reload and a settings JSON round-trip", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("grid-seed-input").fill("2026");
  await page.getByTestId("apply-grid-seed").click();
  await page.getByTestId("toggle-grid-lock").click();
  await page.getByTestId("randomize-typography").click();
  await ready(page);
  const saved = await settings(page);
  expect(saved.workflow).toMatchObject({ gridSeed: 2026, gridLocked: true, mode: "typography" });
  await page.reload(); await ready(page);
  expect(await settings(page)).toEqual(saved);
  await page.locator('input[type="file"]').setInputFiles({ name: "workflow.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(saved)) });
  await ready(page);
  expect(await settings(page)).toEqual(saved);
});

test("legacy freeform seed 314 imports without workflow and retains 1px leading in exports", async ({ page }) => {
  await page.goto("/");
  const { workflow: _workflow, ...legacy } = DEFAULT_SETTINGS as typeof DEFAULT_SETTINGS & { workflow?: unknown };
  await page.locator('input[type="file"]').setInputFiles({
    name: "legacy-freeform.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...legacy, columns: 4, rows: 5, layout: "free", seed: 314 })),
  });
  await ready(page);
  const imported = await settings(page);
  expect(imported.workflow).toMatchObject({ mode: "legacy", gridLocked: false, compositionLocked: false });
  await page.getByRole("spinbutton", { name: "Line height", exact: true }).fill("1");
  await ready(page);
  const svg = strFromU8(await download(page, "svg"));
  const hasOnePixelGap = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/gsu)].some((block) => {
    const ys = [...block[1].matchAll(/<tspan\b[^>]*\by="([\d.]+)"/gu)].map((match) => Number(match[1]));
    return ys.some((value, index) => index > 0 && Math.abs(value - ys[index - 1]!) === 1);
  });
  expect(hasOnePixelGap).toBe(true);
});

test("image composition exports bounded exact-ratio placeholders without photographs", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("randomize-grid").click();
  await page.getByTestId("toggle-grid-lock").click();
  const ratioInputs = page.locator('input[type="checkbox"][aria-label^="Image ratio"]');
  for (let index = 0; index < await ratioInputs.count(); index++) {
    const input = ratioInputs.nth(index);
    if (await input.getAttribute("aria-label") !== "Image ratio 16:9") await input.uncheck();
  }
  await page.getByTestId("image-ratio-16-9").check();
  await page.getByTestId("randomize-typography-image").click();
  await ready(page);
  expect((await settings(page)).workflow).toMatchObject({ gridLocked: true, mode: "typography-image" });
  await expect(page.locator("[data-image-block]").first()).toBeVisible();
  const svg = strFromU8(await download(page, "svg"));
  expect(svg).toContain("data-image-block");
  expect(svg).toContain('data-image-ratio="16:9"');
  expect(svg).not.toMatch(/<image\b|https?:\/\/(?!www\.w3\.org)/iu);
  const packageFiles = unzipSync(await download(page, "zip"));
  const html = strFromU8(packageFiles["index.html"]!);
  const css = strFromU8(packageFiles["styles.css"]!);
  expect(html).toContain("data-image-block");
  expect(html).toContain("--image-aspect:16 / 9");
  expect(css).toMatch(/aspect-ratio:\s*var\(--image-aspect\)/u);
});

test("offline image placeholders preserve SVG/HTML bounds, print geometry, responsiveness, and grid-only hiding", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("grid-seed-input").fill("808");
  await page.getByTestId("apply-grid-seed").click();
  await page.getByTestId("toggle-grid-lock").click();
  const ratios = page.locator('input[type="checkbox"][aria-label^="Image ratio"]');
  for (let index = 0; index < await ratios.count(); index++) {
    const input = ratios.nth(index);
    if (await input.getAttribute("aria-label") !== "Image ratio 16:9") await input.uncheck();
  }
  await page.getByTestId("image-ratio-16-9").check();
  await page.getByTestId("randomize-typography-image").click();
  await ready(page);
  const svg = strFromU8(await download(page, "svg"));
  const zip = unzipSync(await download(page, "zip"));
  const context = page.context();
  await context.route("http://image-export.test/**", async (route) => {
    const key = new URL(route.request().url()).pathname.slice(1) || "index.html";
    const body = key === "svg.html"
      ? Buffer.from(`<!doctype html><meta charset="utf-8">${svg.replace(/^<\?xml[^>]*>\s*/u, "")}`)
      : zip[key];
    if (!body) return route.fulfill({ status: 404, body: key });
    return route.fulfill({ status: 200, contentType: key.endsWith(".css") ? "text/css" : key.endsWith(".woff2") ? "font/woff2" : "text/html", body: Buffer.from(body) });
  });
  const html = await context.newPage();
  const svgPage = await context.newPage();
  await html.setViewportSize({ width: 1440, height: 1024 });
  await svgPage.setViewportSize({ width: 1440, height: 1024 });
  await html.goto("http://image-export.test/index.html");
  await svgPage.goto("http://image-export.test/svg.html");
  const htmlBoxes = await html.locator("figure[data-image-block]").evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    const pageBox = document.querySelector(".page")!.getBoundingClientRect();
    return { id: node.getAttribute("data-image-block"), ratio: node.getAttribute("data-image-ratio"), x: box.left - pageBox.left, y: box.top - pageBox.top, width: box.width, height: box.height, pageWidth: pageBox.width, pageHeight: pageBox.height };
  }));
  const svgBoxes = await svgPage.locator("g[data-image-block] > rect").evaluateAll((nodes) => nodes.map((node) => {
    const rect = node as SVGRectElement;
    const group = rect.parentElement!;
    return { id: group.getAttribute("data-image-block"), ratio: group.getAttribute("data-image-ratio"), x: Number(rect.getAttribute("x")), y: Number(rect.getAttribute("y")), width: Number(rect.getAttribute("width")), height: Number(rect.getAttribute("height")) };
  }));
  expect(htmlBoxes.length).toBeGreaterThan(0);
  expect(htmlBoxes).toHaveLength(svgBoxes.length);
  for (const htmlBox of htmlBoxes) {
    const svgBox = svgBoxes.find((candidate) => candidate.id === htmlBox.id)!;
    expect(htmlBox.ratio).toBe("16:9");
    expect(htmlBox.width / htmlBox.height).toBeCloseTo(16 / 9, 2);
    expect(htmlBox.x).toBeGreaterThanOrEqual(0);
    expect(htmlBox.y).toBeGreaterThanOrEqual(0);
    expect(htmlBox.x + htmlBox.width).toBeLessThanOrEqual(htmlBox.pageWidth + 0.5);
    expect(htmlBox.y + htmlBox.height).toBeLessThanOrEqual(htmlBox.pageHeight + 0.5);
    expect(htmlBox.x).toBeCloseTo(svgBox.x, 0);
    expect(htmlBox.y).toBeCloseTo(svgBox.y, 0);
    expect(htmlBox.width).toBeCloseTo(svgBox.width, 0);
    expect(htmlBox.height).toBeCloseTo(svgBox.height, 0);
  }
  await html.emulateMedia({ media: "print" });
  const printBoxes = await html.locator("figure[data-image-block]").evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect(); const pageBox = document.querySelector(".page")!.getBoundingClientRect();
    return { x: box.left - pageBox.left, y: box.top - pageBox.top, width: box.width, height: box.height };
  }));
  expect(printBoxes).toEqual(expect.arrayContaining(htmlBoxes.map(({ x, y, width, height }) => ({ x, y, width, height }))));
  await html.emulateMedia({ media: "screen" });
  await html.setViewportSize({ width: 390, height: 844 });
  expect(await html.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  for (const ratio of await html.locator("figure[data-image-block]").evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return box.width / box.height; })))
    expect(ratio).toBeCloseTo(16 / 9, 2);
  await html.close(); await svgPage.close();

  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await ready(page);
  expect(strFromU8(await download(page, "svg"))).not.toContain("data-image-block");
  const gridOnly = unzipSync(await download(page, "zip"));
  expect(strFromU8(gridOnly["index.html"]!)).not.toContain("data-image-block");
});

test("generated typography remains substantial at desktop and mobile widths", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId("grid-seed-input").fill(viewport.width === 1440 ? "71" : "72");
    await page.getByTestId("apply-grid-seed").click();
    await page.getByTestId("toggle-grid-lock").click();
    await page.getByTestId("randomize-typography").click();
    await ready(page);
    const textLines = page.locator(".artboard svg text tspan");
    await expect(textLines.first()).toBeVisible();
    expect(await textLines.count()).toBeGreaterThanOrEqual(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  }
});

test("stage controls fit at 320 and 390 pixels", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("randomize-grid")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
