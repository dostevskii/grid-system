import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.GRID_SYSTEM_BASE_URL ?? 'https://grid-system.pages.dev';
const outputDirectory = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1600, height: 1100 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function ready() {
  await expect(page.getByTestId('layout-status')).toHaveText('브라우저에 자동 저장됨');
  await page.evaluate(() => document.fonts.ready);
}

async function capture(name) {
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${outputDirectory}/${name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  console.log(`Captured ${name}.png from ${baseURL}`);
}

try {
  await page.goto('/');
  await ready();
  await expect(page.getByTestId('artboard')).toHaveAttribute('aria-label', '4열 5행, Inter 문단 레이아웃');
  await capture('grid-system-desktop');

  await page.getByRole('button', { name: '작업판 프리셋 선택' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '인쇄', exact: true }).click();
  await page.getByRole('textbox', { name: '프리셋 검색' }).fill('A4');
  await page.getByRole('dialog').getByRole('button', { name: /^A4 / }).click();
  await ready();
  await page.getByRole('button', { name: '알림 닫기', exact: true }).click();
  await page.getByRole('button', { name: '폰트 선택', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Libre Baskerville/ }).click();
  await ready();
  await page.getByRole('button', { name: '다른 구성', exact: true }).click();
  await ready();
  await page.getByRole('button', { name: '작업판 프리셋 선택' }).scrollIntoViewIfNeeded();
  await expect(page.locator('.artboard svg')).toHaveAttribute('width', '210mm');
  await expect(page.locator('.artboard svg')).toHaveAttribute('height', '297mm');
  await capture('grid-system-print');

  await page.getByRole('button', { name: '내보내기', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Figma에서 열기/ })).toBeEnabled();
  await capture('grid-system-export');

  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
} finally {
  await context.close();
  await browser.close();
}
