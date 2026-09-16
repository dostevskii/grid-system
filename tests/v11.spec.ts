import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";

async function layoutReady(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("layout-status")).toHaveAttribute(
    "data-ready",
    "true",
  );
}

async function downloadExport(
  page: import("@playwright/test").Page,
  format: "json" | "svg" | "zip",
) {
  await layoutReady(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .locator("button.export-option")
    .filter({ hasText: new RegExp(format, "i") })
    .click();
  const file = await download;
  expect(await file.failure()).toBeNull();
  const contents = new Uint8Array(await readFile((await file.path())!));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  return contents;
}

async function exportedSettings(page: import("@playwright/test").Page) {
  return JSON.parse(strFromU8(await downloadExport(page, "json")));
}

test("v1.1 starts in English and remembers a Korean language choice", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("language-select")).toHaveValue("en");
  await expect(page.getByRole("spinbutton", { name: "Columns", exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rows", exact: true })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Line height", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "20 modules", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "32 modules", exact: true })).toBeVisible();

  await page.getByTestId("language-select").selectOption("ko");
  await expect(page.getByRole("button", { name: /^20\s?분할$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^32\s?분할$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("language-select")).toHaveValue("ko");
});

test("a seed replays the entire randomized freeform settings object", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("seed-input").fill("14");
  await page.getByTestId("apply-seed").click();
  await layoutReady(page);
  const first = await exportedSettings(page);
  expect(first).toMatchObject({ seed: 14, layout: "free" });

  await page.getByTestId("randomize-layout").click();
  const varied = await exportedSettings(page);
  expect(varied).toMatchObject({ layout: "free" });
  expect(varied.seed).not.toBe(14);

  await page.getByTestId("seed-input").fill("14");
  await page.getByTestId("apply-seed").click();
  await layoutReady(page);
  expect(await exportedSettings(page)).toEqual(first);
  await page.reload();
  await layoutReady(page);
  expect(await exportedSettings(page)).toEqual(first);
});

test("freeform seeds place heading and body away from the top and retain 1px leading in SVG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("seed-input").fill("314");
  await page.getByTestId("apply-seed").click();
  await layoutReady(page);
  await page.getByRole("spinbutton", { name: "Columns", exact: true }).fill("4");
  await page.getByRole("spinbutton", { name: "Rows", exact: true }).fill("5");

  const html = strFromU8(unzipSync(await downloadExport(page, "zip"))["index.html"]!);
  const headingRow = html.match(/<h1[^>]*--row:(\d+)/u)?.[1];
  const bodyRows = [...html.matchAll(/<p[^>]*--row:(\d+)/gu)].map((match) => Number(match[1]));
  expect(Number(headingRow)).toBeGreaterThan(1);
  expect(bodyRows.some((row) => row > 1)).toBe(true);

  await page.getByRole("spinbutton", { name: "Line height", exact: true }).fill("1");
  await layoutReady(page);
  await expect(page.locator(".artboard svg text").first()).toBeVisible();
  const onePixelHtml = strFromU8(
    unzipSync(await downloadExport(page, "zip"))["index.html"]!,
  );
  expect(onePixelHtml).toContain("--line-height:1px");
  const hasOnePixelLineGap = [...onePixelHtml.matchAll(
    /<(?:h1|p)\b[^>]*>(.*?)<\/(?:h1|p)>/gsu,
  )].some((block) => {
    const baselines = [...block[1].matchAll(/--line-y:([\d.]+)px/gu)].map(
      (match) => Number(match[1]),
    );
    return baselines.some((baseline, index) =>
      index > 0 && Math.abs(baseline - baselines[index - 1]!) === 1,
    );
  });
  expect(hasOnePixelLineGap).toBe(true);
  const svg = strFromU8(await downloadExport(page, "svg"));
  expect(svg).toContain('<tspan ');
  expect(svg).toMatch(/<tspan x="[^"]+" y="[^"]+">[^<]+<\/tspan>/u);
  const hasOnePixelTspanGap = [...svg.matchAll(/<text\b[^>]*>(.*?)<\/text>/gsu)].some(
    (block) => {
      const baselines = [...block[1].matchAll(/<tspan\b[^>]*\by="([\d.]+)"/gu)].map(
        (match) => Number(match[1]),
      );
      return baselines.some((baseline, index) =>
        index > 0 && Math.abs(baseline - baselines[index - 1]!) === 1,
      );
    },
  );
  expect(hasOnePixelTspanGap).toBe(true);
});
