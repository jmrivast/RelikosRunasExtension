import { expect, test, type Page } from '@playwright/test';
import { SAMPLE } from '../../src/domain';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
const entry = (actor = 'demo-dm') => `/?demo=1&proximityDemo=1&actor=${actor}`;
const runeName = 'Abrir inscripción del mapa rune-aurill';
async function enable(page: Page) {
  await page
    .locator('.inscription-row')
    .first()
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Ocultar y permitir leer por proximidad' })
    .check();
  await page.getByRole('checkbox', { name: 'Ocultar título a los jugadores' }).check();
  await page.getByRole('checkbox', { name: 'Ocultar idioma a los jugadores' }).check();
  await page.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function bind(page: Page, player: string, token: string) {
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('button', { name: /^Jugadores/ })
    .click();
  await page.getByLabel(`Token de ${player}`, { exact: true }).selectOption(token);
  await page.getByRole('button', { name: `Guardar token de ${player}`, exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Token de proximidad guardado.' }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto(entry());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test('solo el jugador a menos de 10 pies descubre la runa y puede leer; se cierra al alejarse', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enable(page);
  await bind(page, 'Jugador de Basili', 'token-basili');
  await bind(page, 'Otro jugador', 'token-other');
  const basili = await context.newPage();
  const other = await context.newPage();
  basili.on('pageerror', (e) => errors.push(e.message));
  await basili.goto(entry('demo-basili'));
  await other.goto(entry('demo-other'));
  await expect(basili.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('10');
  await expect(basili.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('9.9');
  await expect(basili.getByRole('button', { name: runeName, exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await expect(basili.getByRole('dialog')).toHaveCount(0);
  await basili.getByRole('button', { name: runeName, exact: true }).click();
  await expect(basili.getByTestId('reading')).toHaveText(SAMPLE.text);
  await expect(basili.getByRole('dialog')).toHaveAccessibleName('Inscripción');
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('15');
  await expect(basili.getByRole('dialog')).toHaveCount(0);
  await expect(basili.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await page.getByLabel('Distancia de Otro personaje', { exact: true }).selectOption('5');
  await other.getByRole('button', { name: runeName, exact: true }).click();
  await expect(other.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await expect(other.locator('body')).not.toContainText(SAMPLE.text);
  await expect(other.getByText('Telikari antiguo', { exact: true })).toHaveCount(0);
  await other.getByRole('button', { name: 'Cerrar inscripción', exact: true }).click();
  await other.reload();
  await expect(other.getByRole('button', { name: runeName, exact: true })).toBeVisible();
  await page.getByLabel('Distancia de Otro personaje', { exact: true }).selectOption('20');
  await expect(other.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  await basili.close();
  await other.close();
});
test('asignar, retirar, cambiar de escena y recargar no revela runas a otra cuenta', async ({
  page,
  context,
}) => {
  await enable(page);
  await bind(page, 'Jugador de Basili', 'token-basili');
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('5');
  const player = await context.newPage();
  await player.goto(entry('demo-basili'));
  await expect(player.getByRole('button', { name: runeName, exact: true })).toBeVisible();
  await player.getByRole('button', { name: runeName, exact: true }).click();
  await bind(page, 'Jugador de Basili', '');
  await expect(player.getByRole('dialog')).toHaveCount(0);
  await expect(player.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await bind(page, 'Otro jugador', 'token-basili');
  await expect(player.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Jugadores', exact: true }).click();
  await expect(page.getByLabel('Token de Otro jugador', { exact: true })).toHaveValue(
    'token-basili',
  );
  await player.getByLabel('Escena de prueba', { exact: true }).selectOption('b');
  await expect(player.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await player.getByLabel('Escena de prueba', { exact: true }).selectOption('a');
  await expect(player.getByRole('button', { name: runeName, exact: true })).toHaveCount(0);
  await player.close();
});
test('el lector por URL falla cerrado fuera del radio, el DM conserva lectura y desactivar restaura la visibilidad', async ({
  page,
  context,
}) => {
  await enable(page);
  const player = await context.newPage();
  await player.goto(entry('demo-basili') + '&view=read&item=rune-aurill');
  await expect(player.getByRole('dialog')).toHaveCount(0);
  await expect(player.locator('body')).not.toContainText(SAMPLE.text);
  await page.getByRole('button', { name: 'Leer', exact: true }).click();
  await expect(page.getByTestId('reading')).toHaveText(SAMPLE.text);
  await page.getByRole('button', { name: 'Cerrar inscripción', exact: true }).click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Ocultar y permitir leer por proximidad' })
    .uncheck();
  await page.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await expect(player.getByRole('button', { name: runeName, exact: true })).toBeVisible();
  await player.getByRole('button', { name: runeName, exact: true }).click();
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  await player.close();
});
test('la configuración de proximidad y token funciona en móvil sin desbordamientos', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await enable(page);
  await bind(page, 'Jugador de Basili', 'token-basili');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const dir = process.env.RELIKOS_QA_DIR ?? resolve(tmpdir(), 'relikos-qa');
  await mkdir(dir, { recursive: true });
  await page.getByLabel('Token de Jugador de Basili', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.screenshot({
    path: resolve(dir, 'proximity-token-mobile.png'),
    animations: 'disabled',
  });
});
