import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync } from "fflate";

const fontNames = ["Inter", "Libre Baskerville", "열린명조"] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("grid-system.language", "ko"),
  );
});

async function download(
  page: import("@playwright/test").Page,
  label: string,
): Promise<Uint8Array> {
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(label) })
    .click();
  const result = await waiting;
  expect(await result.failure()).toBeNull();
  return new Uint8Array(await readFile((await result.path())!));
}

for (const fontName of fontNames) {
  test(`SVG and offline HTML preserve ${fontName} desktop export geometry`, async ({
    page,
    context,
  }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1024 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await expect(page.getByTestId("layout-status")).toHaveText(
      "브라우저에 자동 저장됨",
    );
    await page.getByRole("button", { name: "폰트 선택", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(`^${fontName}`) })
      .click();
    await expect(page.getByTestId("artboard")).toHaveAttribute(
      "aria-label",
      `4열 5행, ${fontName} 문단 레이아웃`,
    );
    await page.getByRole("button", { name: "내보내기", exact: true }).click();
    const svg = new TextDecoder().decode(
      await download(page, "Figma에서 열기"),
    );
    const zip = unzipSync(await download(page, "웹 개발에 사용하기"));
    expect(svg).toContain('viewBox="0 0 1440 1024"');
    expect(svg).toContain('fill-opacity="0.14"');
    expect(Object.keys(zip).some((file) => file.endsWith(".woff2"))).toBe(true);

    await context.route("http://export.test/**", async (route) => {
      const key =
        new URL(route.request().url()).pathname.slice(1) || "index.html";
      const body =
        key === "svg-preview.html"
          ? Buffer.from(
              `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="styles.css"><style>svg{display:block}</style>${svg.replace(/^<\?xml[^>]*>\s*/u, "")}`,
            )
          : zip[key];
      if (!body) return route.fulfill({ status: 404, body: key });
      const contentType = key.endsWith(".css")
        ? "text/css"
        : key.endsWith(".woff2")
          ? "font/woff2"
          : "text/html";
      return route.fulfill({
        status: 200,
        contentType,
        body: Buffer.from(body),
      });
    });
    const html = await context.newPage();
    const svgPage = await context.newPage();
    await html.setViewportSize({ width: 1440, height: 1024 });
    await svgPage.setViewportSize({ width: 1440, height: 1024 });
    await html.goto("http://export.test/index.html");
    await html.evaluate(() => document.fonts.ready);
    await svgPage.goto("http://export.test/svg-preview.html");
    await svgPage.evaluate(() => document.fonts.ready);
    await expect(html.locator(".page")).toHaveCSS("width", "1440px");
    await expect(html.locator(".guide-cell")).toHaveCount(20);
    await expect(html.locator(".guide-cell").first()).toHaveCSS(
      "background-color",
      "rgb(232, 69, 53)",
    );
    expect(
      await html
        .locator(".guides")
        .evaluate((node) => getComputedStyle(node).opacity),
    ).toBe("0.14");

    const svgLines = await svgPage.locator("svg tspan").evaluateAll((nodes) =>
      nodes.slice(0, 8).map((node) => {
        const span = node as SVGTSpanElement;
        const point = span.getStartPositionOfChar(0);
        return {
          text: span.textContent,
          x: point.x,
          baseline: point.y,
          width: span.getComputedTextLength(),
        };
      }),
    );
    const htmlLines = await html.locator(".line").evaluateAll((nodes) =>
      nodes.slice(0, 8).map((node) => {
        const element = node as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        const style = getComputedStyle(element);
        const page = document.querySelector(".page")!.getBoundingClientRect();
        const parent = element.parentElement!.getBoundingClientRect();
        // The zero-height inline formatting context establishes its baseline at
        // the positioned top; Range still verifies the real rendered glyph box.
        return {
          text: element.textContent,
          x: rect.left - page.left,
          baseline: parent.top - page.top + parseFloat(style.top),
          width: rect.width,
          glyphHeight: rect.height,
        };
      }),
    );
    expect(htmlLines.length).toBe(svgLines.length);
    for (let index = 0; index < htmlLines.length; index++) {
      expect(htmlLines[index]!.text).toBe(svgLines[index]!.text);
      expect(htmlLines[index]!.x).toBeCloseTo(svgLines[index]!.x, 0);
      expect(htmlLines[index]!.baseline).toBeCloseTo(
        svgLines[index]!.baseline,
        0,
      );
      expect(htmlLines[index]!.width).toBeCloseTo(svgLines[index]!.width, 0);
      expect(htmlLines[index]!.glyphHeight).toBeGreaterThan(0);
    }
    await html.screenshot({
      path: testInfo.outputPath(`${fontName}-html.png`),
      fullPage: true,
    });
    await svgPage.screenshot({
      path: testInfo.outputPath(`${fontName}-svg.png`),
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
