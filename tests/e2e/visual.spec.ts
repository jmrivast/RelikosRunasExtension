import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

for (const surface of ['modal', 'popover'] as const) {
  test(`el iframe ${surface} no pinta franjas fuera del marco`, async ({ page }) => {
    const dir = process.env.RELIKOS_QA_DIR ?? resolve(tmpdir(), 'relikos-qa');
    await mkdir(dir, { recursive: true });
    const view = surface === 'modal' ? '&view=read&item=rune-aurill&actor=demo-basili' : '';
    await page.route('**/frame-check', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html><body style="margin:0;background:repeating-conic-gradient(#487f70 0% 25%,#d1b580 0% 50%) 0 0/40px 40px;min-height:100vh;display:grid;place-items:center">
        <iframe title="Extensión incrustada" src="/?demo=1&embed=${surface}${view}" style="width:min(600px,calc(100vw - 40px));height:min(780px,calc(100vh - 40px));border:0"></iframe>
      </body></html>`,
      }),
    );
    await page.goto('/frame-check');
    const frame = page.frameLocator('iframe');
    for (const [name, width, height] of [
      ['desktop', 960, 900],
      ['mobile', 375, 740],
    ] as const) {
      await page.setViewportSize({ width, height });
      await expect(frame.getByRole(surface === 'modal' ? 'dialog' : 'main')).toBeVisible();
      if (surface === 'modal') await expect(frame.getByTestId('reading')).toBeVisible();
      else await expect(frame.getByRole('navigation', { name: 'Administración' })).toBeVisible();
      await expect(frame.locator('html')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      await expect(frame.locator('html')).toHaveCSS('color-scheme', 'normal');
      await expect(frame.locator('body')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      if (surface === 'modal') {
        expect(
          await frame.locator('dialog').evaluate((node) => ({
            background: getComputedStyle(node, '::backdrop').backgroundColor,
            blur: getComputedStyle(node, '::backdrop').backdropFilter,
          })),
        ).toEqual({ background: 'rgba(0, 0, 0, 0)', blur: 'none' });
        await expect(frame.getByRole('button', { name: 'Cerrar inscripción' })).toBeVisible();
      } else {
        const bounds = await frame.locator('.shell').evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            viewportWidth: document.documentElement.clientWidth,
            viewportHeight: innerHeight,
          };
        });
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(bounds.viewportWidth);
        expect(bounds.height).toBeGreaterThanOrEqual(bounds.viewportHeight);
      }
      await page.screenshot({
        path: resolve(dir, `embedded-${surface}-${name}.png`),
        animations: 'disabled',
      });
    }
  });
}

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
