import { expect, test, type Page } from '@playwright/test';
import { SAMPLE } from '../../src/domain';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const entry = (actor = 'demo-dm') => `/?demo=1&proximityDemo=1&actor=${actor}`;
const rune = 'Abrir inscripción del mapa rune-aurill';
async function edit(page: Page) {
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('button', { name: /^Inscripciones/ })
    .click();
  await page
    .locator('.inscription-row')
    .first()
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
test.beforeEach(async ({ page }) => {
  await page.goto(entry());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('visibilidad individual sin distancia persiste, revoca una lectura abierta y conserva idiomas y acceso del DM', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await edit(page);
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).selectOption('selected');
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).check();
  await save(page);
  const basili = await context.newPage();
  const other = await context.newPage();
  await basili.goto(entry('demo-basili'));
  await other.goto(entry('demo-other'));
  await expect(basili.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
  await basili.getByRole('button', { name: rune, exact: true }).click();
  await expect(basili.getByTestId('reading')).toHaveText(SAMPLE.text);
  await edit(page);
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Puede ver: Otro jugador', exact: true }).check();
  await save(page);
  await expect(basili.getByRole('dialog')).toHaveCount(0);
  await expect(basili.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
  await other.getByRole('button', { name: rune, exact: true }).click();
  await expect(other.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await expect(other.locator('body')).not.toContainText(SAMPLE.text);
  await edit(page);
  await page.getByRole('checkbox', { name: 'Puede ver: Otro jugador', exact: true }).uncheck();
  await save(page);
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await page.getByRole('button', { name: rune, exact: true }).click();
  await expect(page.getByTestId('reading')).toHaveText(SAMPLE.text);
  await page.getByRole('button', { name: 'Cerrar inscripción', exact: true }).click();
  await page.reload();
  await edit(page);
  await expect(page.getByLabel('Visibilidad de la inscripción', { exact: true })).toHaveValue(
    'selected',
  );
  await expect(
    page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }),
  ).not.toBeChecked();
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).selectOption('all');
  await save(page);
  await expect(basili.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: rune, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('radio configurable y destinatarios se combinan, se aplican en directo y se conservan al recargar', async ({
  page,
  context,
}) => {
  await edit(page);
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).selectOption('selected');
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).check();
  await page
    .getByRole('checkbox', { name: 'Ocultar y permitir leer por proximidad', exact: true })
    .check();
  await expect(page.getByLabel('Distancia de revelación (pies)', { exact: true })).toHaveValue(
    '10',
  );
  await page.getByLabel('Distancia de revelación (pies)', { exact: true }).fill('20');
  await save(page);
  await page
    .getByRole('navigation', { name: 'Administración' })
    .getByRole('button', { name: /^Jugadores/ })
    .click();
  for (const [name, token] of [
    ['Jugador de Basili', 'token-basili'],
    ['Otro jugador', 'token-other'],
  ]) {
    await page.getByLabel(`Token de ${name}`, { exact: true }).selectOption(token);
    await page.getByRole('button', { name: `Guardar token de ${name}`, exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Token de proximidad guardado.' }),
    ).toBeVisible();
  }
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('15');
  await page.getByLabel('Distancia de Otro personaje', { exact: true }).selectOption('5');
  const basili = await context.newPage();
  const other = await context.newPage();
  await basili.goto(entry('demo-basili'));
  await other.goto(entry('demo-other'));
  await expect(basili.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
  await basili.getByRole('button', { name: rune, exact: true }).click();
  await edit(page);
  await page.getByLabel('Distancia de revelación (pies)', { exact: true }).fill('12.5');
  await save(page);
  await expect(basili.getByRole('dialog')).toHaveCount(0);
  await expect(basili.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('10');
  await expect(basili.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await page.reload();
  await edit(page);
  await expect(page.getByLabel('Distancia de revelación (pies)', { exact: true })).toHaveValue(
    '12.5',
  );
  await expect(
    page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }),
  ).toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Ocultar y permitir leer por proximidad', exact: true })
    .uncheck();
  await save(page);
  await page.getByLabel('Distancia de Basili', { exact: true }).selectOption('30');
  await expect(basili.getByRole('button', { name: rune, exact: true })).toBeVisible();
  await expect(other.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
});

test('editor móvil conserva destinatarios desconectados y muestra los controles sin desbordar', async ({
  page,
}) => {
  await edit(page);
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).selectOption('selected');
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).check();
  await save(page);
  await page.getByText('Controles de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Conectar/desconectar Basili', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await edit(page);
  await expect(
    page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }),
  ).toBeChecked();
  await page
    .getByRole('checkbox', { name: 'Ocultar y permitir leer por proximidad', exact: true })
    .check();
  await page.getByLabel('Distancia de revelación (pies)', { exact: true }).fill('30');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.getByRole('dialog').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  const folder = resolve(tmpdir(), 'relikos-qa');
  await mkdir(folder, { recursive: true });
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve(folder, 'visibility-mobile.png') });
  await save(page);
  await edit(page);
  await expect(
    page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel('Distancia de revelación (pies)', { exact: true })).toHaveValue(
    '30',
  );
});
