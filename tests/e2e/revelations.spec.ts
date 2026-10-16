import { expect, test, type Page } from '@playwright/test';
import { SAMPLE, NS } from '../../src/domain';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const entry = '/?demo=1&actor=demo-dm';
const playerEntry = '/?demo=1&actor=demo-other&view=read&item=rune-aurill';
const selectorName = 'Revelación para Otro jugador (demo-other)';
async function edit(page: Page) {
  await page
    .locator('.inscription-row')
    .first()
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await page.getByText('Revelación por jugador', { exact: true }).click();
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Guardar inscripción', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto(entry);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('revelación completa por objeto persiste, no enseña el idioma y se revoca en directo', async ({
  page,
  context,
}) => {
  const player = await context.newPage();
  await player.goto(playerEntry);
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await edit(page);
  await page.getByLabel(selectorName, { exact: true }).selectOption('full');
  await save(page);
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  await page.reload();
  await edit(page);
  await expect(page.getByLabel(selectorName, { exact: true })).toHaveValue('full');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  // A second inscription in the same language remains unreadable to that account.
  await page.getByRole('button', { name: 'Configurar objeto seleccionado' }).click();
  await page.getByLabel('Título', { exact: true }).fill('Otra inscripción');
  await page.getByLabel('Texto verdadero', { exact: true }).fill('Otro secreto independiente.');
  await save(page);
  await player.goto('/?demo=1&actor=demo-other&view=read&item=rune-blank');
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await player.goto(playerEntry);
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  await edit(page);
  await page.getByLabel(selectorName, { exact: true }).selectOption('language');
  await save(page);
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await expect(player.getByTestId('reading')).not.toContainText(SAMPLE.text);
  await player.goto('/?demo=1&actor=demo-other');
  await expect(player.locator('body')).not.toContainText(SAMPLE.title);
  await expect(player.getByText('Este panel está reservado al Dungeon Master.')).toBeVisible();
  await player.close();
});

test('traducción parcial solo para el destinatario, con vista previa, ocultación y restauración', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const player = await context.newPage();
  player.on('pageerror', (e) => errors.push(e.message));
  await player.goto(playerEntry);
  await edit(page);
  await page
    .locator('summary')
    .filter({ hasText: /^Traducción parcial$/ })
    .click();
  await page
    .getByLabel('Texto de traducción parcial', { exact: true })
    .fill('[[El rey]] regresa [[al norte]]');
  await expect(page.getByTestId('partial-preview')).toContainText('regresa');
  await expect(page.getByTestId('partial-preview')).not.toContainText('El rey');
  await page.getByLabel(selectorName, { exact: true }).selectOption('partial');
  await page.getByRole('checkbox', { name: 'Ocultar título a los jugadores' }).check();
  await page.getByRole('checkbox', { name: 'Ocultar idioma a los jugadores' }).check();
  await save(page);
  await expect(player.getByTestId('reading')).toHaveAttribute('aria-label', 'Traducción parcial');
  await expect(player.getByTestId('reading')).toContainText('regresa');
  await expect(player.getByTestId('reading')).not.toContainText('El rey');
  await expect(player.getByTestId('reading')).not.toContainText('al norte');
  await expect(player.getByRole('dialog')).toHaveAccessibleName('Inscripción');
  await expect(player.getByText('Telikari antiguo', { exact: true })).toHaveCount(0);
  await player.reload();
  await expect(player.getByTestId('reading')).toContainText('regresa');
  const dir = process.env.RELIKOS_QA_DIR ?? resolve(tmpdir(), 'relikos-qa');
  await mkdir(dir, { recursive: true });
  await player
    .getByRole('dialog')
    .screenshot({ path: resolve(dir, 'partial-desktop.png'), animations: 'disabled' });
  await player.setViewportSize({ width: 375, height: 740 });
  await player.screenshot({ path: resolve(dir, 'partial-mobile.png'), animations: 'disabled' });
  expect(await player.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true,
  );
  await player.getByRole('button', { name: 'Cerrar inscripción' }).click();
  await expect(player.getByRole('dialog')).toHaveCount(0);
  await player.goto('/?demo=1&actor=demo-basili&view=read&item=rune-aurill');
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  await edit(page);
  await page.getByLabel(selectorName, { exact: true }).selectOption('language');
  await save(page);
  await player.goto(playerEntry);
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  expect(errors).toEqual([]);
  await player.close();
});

test('impide guardar traducciones incompletas sin cambiar permisos o contenido existentes', async ({
  page,
  context,
}) => {
  const player = await context.newPage();
  await player.goto(playerEntry);
  await edit(page);
  await page.getByLabel(selectorName, { exact: true }).selectOption('partial');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Escribe una traducción parcial',
  );
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await page
    .locator('summary')
    .filter({ hasText: /^Traducción parcial$/ })
    .click();
  await page.getByLabel('Texto de traducción parcial', { exact: true }).fill('[[Texto sin cerrar');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(player.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await edit(page);
  await expect(page.getByLabel(selectorName, { exact: true })).toHaveValue('language');
  await expect(page.getByLabel('Texto verdadero', { exact: true })).toHaveValue(SAMPLE.text);
  await player.close();
});

test('mantiene revelaciones parciales de perfiles desconectados al editar', async ({ page }) => {
  await edit(page);
  await page.getByLabel('Revelación para Jugador de Basili (demo-basili)').selectOption('full');
  await save(page);
  await page.getByText('Controles de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Conectar/desconectar Basili' }).click();
  await edit(page);
  await expect(page.getByText('Jugador de Basili · Desconectado', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Revelación para Jugador de Basili (demo-basili)')).toHaveValue(
    'full',
  );
  await save(page);
  await page.reload();
  await edit(page);
  await expect(page.getByLabel('Revelación para Jugador de Basili (demo-basili)')).toHaveValue(
    'full',
  );
});

test('nota privada persiste separada del mapa y nunca aparece al jugador ni en copias', async ({
  page,
  context,
}) => {
  const note = 'Nota secreta: la pista conduce a la bóveda.';
  await edit(page);
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await page.getByLabel('Nota privada', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Guardar nota privada', exact: true }).click();
  await expect(page.getByText('Nota guardada en este navegador', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.reload();
  await edit(page);
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await expect(page.getByLabel('Nota privada', { exact: true })).toHaveValue(note);
  // The simulated shared transport contains no private note, even after saving the inscription.
  await save(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), `${NS}/demo-v1`)).not.toContain(
    note,
  );
  const player = await context.newPage();
  await player.goto(playerEntry);
  await expect(player.getByText('Notas privadas del DM', { exact: true })).toHaveCount(0);
  await expect(player.locator('body')).not.toContainText(note);
  await player.goto('/?demo=1&actor=demo-other&view=edit&item=rune-aurill');
  await expect(player.getByLabel('Nota privada', { exact: true })).toHaveCount(0);
  await page.getByText('Controles de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Duplicar objeto', exact: true }).click();
  await page
    .locator('.inscription-row')
    .nth(1)
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await expect(page.getByLabel('Nota privada', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await edit(page);
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await expect(page.getByLabel('Nota privada', { exact: true })).toHaveValue(note);
  await page.getByLabel('Nota privada', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Guardar nota privada', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.reload();
  await edit(page);
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await expect(page.getByLabel('Nota privada', { exact: true })).toHaveValue('');
  await player.close();
});

test('editor móvil permite configurar revelación y nota sin desbordamiento', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await edit(page);
  await page.getByLabel(selectorName, { exact: true }).selectOption('full');
  await page.getByText('Notas privadas del DM', { exact: true }).click();
  await page.getByLabel('Nota privada', { exact: true }).fill('Pista privada local');
  await page.getByRole('button', { name: 'Guardar nota privada', exact: true }).click();
  await expect(page.getByText('Nota guardada en este navegador', { exact: true })).toBeVisible();
  expect(
    await page.getByRole('dialog').evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await save(page);
});
