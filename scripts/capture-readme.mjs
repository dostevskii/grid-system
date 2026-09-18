import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.GRID_SYSTEM_BASE_URL ?? 'https://grid-system.pages.dev';
const outputDirectory = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 1440, height: 1024 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function ready() {
  await expect(page.getByTestId('layout-status')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByTestId('layout-status')).toHaveText('Saved locally in this browser');
  await page.evaluate(() => document.fonts.ready);
}

async function capture(name) {
  await page.mouse.move(0, 0);
  await page.screenshot({
    path: `${outputDirectory}/${name}.png`,
    fullPage: false,
    animations: 'disabled',
  });
  console.log(`Captured ${name}.png from ${baseURL}`);
}

try {
  await page.goto('/');
  await ready();
  await expect(page.getByTestId('language-select')).toHaveValue('en');
  await capture('grid-system-desktop');

  await page.getByTestId('toggle-grid-lock').click();
  await ready();
  await page.getByTestId('randomize-typography-image').click();
  await ready();
  await page.getByTestId('seed-input').fill('149');
  await page.getByTestId('apply-seed').click();
  await ready();
  await expect(page.locator('[data-image-block]').first()).toBeVisible();
  await capture('grid-system-composition');
  await page.getByTestId('toggle-grid-lock').click();
  await ready();

  await page.getByRole('button', { name: /artboard preset/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Print', exact: true }).click();
  await page.getByRole('textbox', { name: /search presets/i }).fill('A4');
  await page.getByRole('dialog').getByRole('button', { name: /^A4 / }).click();
  await ready();
  const closeNotice = page.getByRole('button', { name: 'Dismiss notice', exact: true });
  if (await closeNotice.count()) await closeNotice.click();
  await page.getByRole('button', { name: /font/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^Libre Baskerville/ }).click();
  await ready();
  await page.getByTestId('grid-seed-input').fill('71');
  await page.getByTestId('apply-grid-seed').click();
  await ready();
  await page.getByTestId('toggle-grid-lock').click();
  await ready();
  await page.getByTestId('randomize-typography-image').click();
  await ready();
  await page.getByTestId('seed-input').fill('149');
  await page.getByTestId('apply-seed').click();
  await ready();
  await page.getByTestId('toggle-composition-lock').click();
  await ready();
  if (await closeNotice.count()) await closeNotice.click();
  await page.getByRole('button', { name: /artboard preset/i }).scrollIntoViewIfNeeded();
  await expect(page.locator('.artboard svg')).toHaveAttribute('width', '210mm');
  await expect(page.locator('.artboard svg')).toHaveAttribute('height', '297mm');
  await capture('grid-system-print');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('button', { name: /Figma/i })).toBeEnabled();
  await capture('grid-system-export');

  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
} finally {
  await context.close();
  await browser.close();
}
