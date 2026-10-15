import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

test('evidencias visuales de administración, lectura y móvil', async ({ page }) => {
  const dir = process.env.RELIKOS_QA_DIR ?? resolve(tmpdir(), 'relikos-qa');
  await mkdir(dir, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { name: 'Relikos', exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await page.locator('.shell').screenshot({ path: resolve(dir, 'admin.png') });
  await page.getByRole('button', { name: 'Leer', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page
    .getByRole('dialog')
    .screenshot({ path: resolve(dir, 'reader.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Cerrar inscripción' }).click();
  await page.goto('/?demo=1&actor=demo-other&view=read&item=rune-aurill');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page
    .getByRole('dialog')
    .screenshot({ path: resolve(dir, 'runes.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 375, height: 740 });
  await page.screenshot({ path: resolve(dir, 'mobile.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
