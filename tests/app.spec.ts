import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("grid-system.language", "ko"),
  );
});

test("default layout, controls and every font load without browser errors", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 5행, Inter 문단 레이아웃",
  );
  await expect(page.locator(".artboard svg")).toHaveAttribute(
    "viewBox",
    "0 0 1440 1024",
  );
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /^32\s?분할$/ }).click();
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 8행, Inter 문단 레이아웃",
  );
  for (const name of [
    "Libre Baskerville",
    "EB Garamond",
    "Cormorant",
    "Montserrat",
    "Lato",
    "Oswald",
    "Outfit",
    "Pretendard",
    "Wanted Sans",
    "열린명조",
    "열린고딕",
    "Inter",
  ]) {
    await page.getByRole("button", { name: "폰트 선택", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click();
    await expect(page.getByTestId("artboard")).toHaveAttribute(
      "aria-label",
      `4열 8행, ${name} 문단 레이아웃`,
    );
    await expect(page.getByTestId("layout-status")).toHaveText(
      "브라우저에 자동 저장됨",
    );
  }
  await page
    .getByRole("spinbutton", { name: "Columns", exact: true })
    .fill("1");
  await page.getByRole("spinbutton", { name: "Rows", exact: true }).fill("1");
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "1열 1행, Inter 문단 레이아웃",
  );
  await page
    .getByRole("spinbutton", { name: "Columns", exact: true })
    .fill("0");
  await expect(page.locator(".error-message")).toBeVisible();
  await page.getByRole("button", { name: /^20\s?분할$/ }).click();
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await page.reload();
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 5행, Inter 문단 레이아웃",
  );
  expect(errors).toEqual([]);
});

test("print presets preserve physical size and three downloads work offline", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await page.getByRole("button", { name: "작업판 프리셋 선택" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "인쇄", exact: true })
    .click();
  await page.getByRole("textbox", { name: "프리셋 검색" }).fill("A4");
  await page.getByRole("dialog").getByRole("button", { name: /^A4 / }).click();
  await expect(page.locator(".artboard svg")).toHaveAttribute("width", "210mm");
  await expect(page.locator(".artboard svg")).toHaveAttribute(
    "height",
    "297mm",
  );
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  const outputs: Record<string, Uint8Array> = {};
  for (const [button, kind] of [
    ["Figma에서 열기", "svg"],
    ["웹 개발에 사용하기", "zip"],
    ["나중에 이어서 편집하기", "json"],
  ]) {
    const downloading = page.waitForEvent("download");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: new RegExp(button) })
      .click();
    const download = await downloading;
    expect(await download.failure()).toBeNull();
    outputs[kind] = await readFile((await download.path())!);
  }
  expect(strFromU8(outputs.svg)).toContain('width="210mm"');
  const config = JSON.parse(strFromU8(outputs.json));
  expect(config.page.width).toBe(210);
  expect(config.page.height).toBe(297);
  const files = unzipSync(outputs.zip);
  expect(files["index.html"]).toBeTruthy();
  expect(files["styles.css"]).toBeTruthy();
  expect(Object.keys(files).some((name) => name.endsWith(".woff2"))).toBe(true);
  expect(strFromU8(files["FONT-NOTICES.txt"])).toContain(
    "SIL OPEN FONT LICENSE",
  );
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://export.test") return route.abort();
    const key = url.pathname.slice(1) || "index.html";
    const body = files[key];
    if (!body) return route.fulfill({ status: 404, body: key });
    const contentType = key.endsWith(".css")
      ? "text/css"
      : key.endsWith(".woff2")
        ? "font/woff2"
        : "text/html";
    return route.fulfill({ status: 200, contentType, body: Buffer.from(body) });
  });
  await page.goto("http://export.test/index.html");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() => document.fonts.check("400 16px Inter", "äöüß")),
  ).toBe(true);
  await expect(page.locator("h1")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.emulateMedia({ media: "print" });
  expect(
    await page
      .locator(".page")
      .evaluate((element) => element.getBoundingClientRect().width),
  ).toBeCloseTo((210 * 96) / 25.4, 0);
});

test("mobile editor and accessible dialog navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "속성 패널 열기" }).click();
  await expect(
    page.getByRole("heading", { name: "레이아웃 설정" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "폰트 선택", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "속성 패널 닫기", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-export.png"),
    fullPage: true,
  });
});

test("view modes, input errors and invalid imports keep a safe last layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await page.getByRole("button", { name: "그리드", exact: true }).click();
  await expect(page.locator(".artboard svg text")).toHaveCount(0);
  await expect(page.locator(".artboard .grid")).toHaveCount(1);
  await page.getByRole("button", { name: "콘텐츠", exact: true }).click();
  await expect(page.locator(".artboard .grid")).toHaveCount(0);
  await page
    .getByRole("button", { name: "그리드 + 콘텐츠", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "그리드 불투명도" }).fill("0");
  await expect(page.locator(".artboard .grid")).toHaveAttribute(
    "fill-opacity",
    "0",
  );
  await expect(page.locator(".artboard .grid")).toHaveAttribute(
    "stroke-opacity",
    "0",
  );
  await page
    .getByRole("spinbutton", { name: "위 여백", exact: true })
    .fill("5000");
  await expect(page.locator(".error-message")).toContainText("작업 영역");
  await page.getByRole("button", { name: "여백·간격 맞추기" }).click();
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":99}'),
    });
  await expect(page.locator(".toast")).toContainText("불러오기 실패");
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 5행, Inter 문단 레이아웃",
  );
});

test("font download failure is recoverable and does not export a fallback layout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
  await page.route("**/fonts/google/lato/**", (route) => route.abort());
  await page.getByRole("button", { name: "폰트 선택", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^Lato/ }).click();
  await expect(page.locator(".error-message")).toBeVisible();
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 5행, Inter 문단 레이아웃",
  );
  await page.getByRole("button", { name: "내보내기", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Figma에서 열기/ }),
  ).toBeDisabled();
  await page.getByRole("dialog").getByRole("button", { name: "닫기" }).click();
  await page.unroute("**/fonts/google/lato/**");
  await page.getByRole("button", { name: "다시 시도", exact: true }).click();
  await expect(page.getByTestId("artboard")).toHaveAttribute(
    "aria-label",
    "4열 5행, Lato 문단 레이아웃",
  );
  await expect(page.getByTestId("layout-status")).toHaveText(
    "브라우저에 자동 저장됨",
  );
});
