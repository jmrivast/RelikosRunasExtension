import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SAMPLE } from '../../src/domain';
const image = 'https://assets.example/inscription.png';
const entry = (actor = 'demo-dm') => `/?demo=1&proximityDemo=1&actor=${actor}`;
const rune = 'Abrir inscripción del mapa rune-aurill';
const artwork =
  '<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600" viewBox="0 0 2400 1600"><rect width="2400" height="1600" fill="#18252e"/><circle cx="1200" cy="800" r="540" fill="none" stroke="#c8ae7d" stroke-width="12"/><path d="M1200 200L1700 800L1200 1400L700 800Z M1200 200V1400" stroke="#93bdc9" stroke-width="22" fill="none"/></svg>';
async function edit(page: Page) {
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
async function media(page: Page, mode: 'text' | 'image') {
  await edit(page);
  await page.getByLabel('Contenido al abrir', { exact: true }).selectOption(mode);
  await page.getByLabel('URL HTTPS de la imagen', { exact: true }).fill(image);
}
test.beforeEach(async ({ page, context }) => {
  await context.route(image, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: artwork }),
  );
  await page.goto(entry());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});
test('imagen complementaria persiste, cambia de posición y amplía el original sin perder el texto', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await media(page, 'text');
  await page.getByLabel('Posición de la imagen', { exact: true }).selectOption('before');
  await save(page);
  await page.reload();
  await edit(page);
  await expect(page.getByLabel('Contenido al abrir', { exact: true })).toHaveValue('text');
  await expect(page.getByLabel('URL HTTPS de la imagen', { exact: true })).toHaveValue(image);
  await page.getByLabel('Posición de la imagen', { exact: true }).selectOption('after');
  await save(page);
  const player = await context.newPage();
  await player.goto(entry('demo-basili'));
  await player.getByRole('button', { name: rune, exact: true }).click();
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  const picture = player.getByRole('img', { name: 'Imagen de la inscripción', exact: true });
  await expect(picture).toHaveJSProperty('naturalWidth', 2400);
  expect(await player.locator('.reading + .inscription-picture').count()).toBe(1);
  await player.getByRole('button', { name: 'Ampliar imagen', exact: true }).click();
  await expect(player.getByTestId('reading')).toHaveCount(0);
  await player.getByRole('button', { name: 'Ver imagen a tamaño original', exact: true }).click();
  expect((await picture.boundingBox())!.width).toBe(2400);
  await player.getByRole('button', { name: 'Ajustar imagen a la pantalla', exact: true }).click();
  expect((await picture.boundingBox())!.width).toBeLessThan(960);
  await player.getByRole('button', { name: 'Volver al texto', exact: true }).click();
  await expect(player.getByTestId('reading')).toHaveText(SAMPLE.text);
  expect(errors).toEqual([]);
});
test('solo imagen permite texto vacío, ocupa el primer plano, respeta permisos y revoca acceso en vivo', async ({
  page,
  context,
}) => {
  await edit(page);
  await page.getByLabel('Texto verdadero', { exact: true }).fill('');
  await page.getByLabel('Contenido al abrir', { exact: true }).selectOption('image');
  await page.getByLabel('URL HTTPS de la imagen', { exact: true }).fill(image);
  await page.getByLabel('Visibilidad de la inscripción', { exact: true }).selectOption('selected');
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).check();
  await save(page);
  const player = await context.newPage();
  await player.goto(entry('demo-basili'));
  const other = await context.newPage();
  await other.goto(entry('demo-other'));
  await expect(other.getByRole('button', { name: rune, exact: true })).toHaveCount(0);
  await player.getByRole('button', { name: rune, exact: true }).click();
  await expect(
    player.getByRole('img', { name: 'Imagen de la inscripción', exact: true }),
  ).toHaveJSProperty('naturalWidth', 2400);
  await expect(player.getByTestId('reading')).toHaveCount(0);
  await expect(player.getByRole('dialog')).not.toContainText(SAMPLE.title);
  await expect(player.getByRole('dialog')).not.toContainText('Telikari');
  await expect(player.locator('.sigil, .ornament, .reader footer')).toHaveCount(0);
  await mkdir(join(tmpdir(), 'relikos-qa'), { recursive: true });
  await player.screenshot({ path: join(tmpdir(), 'relikos-qa', 'image-only-desktop.png') });
  await player.setViewportSize({ width: 390, height: 844 });
  const bounds = (await player
    .getByRole('img', { name: 'Imagen de la inscripción', exact: true })
    .boundingBox())!;
  expect(bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.height).toBeLessThanOrEqual(844);
  await player.screenshot({ path: join(tmpdir(), 'relikos-qa', 'image-only-mobile.png') });
  await edit(page);
  await page.getByRole('checkbox', { name: 'Puede ver: Jugador de Basili', exact: true }).uncheck();
  await save(page);
  await expect(player.getByRole('dialog')).toHaveCount(0);
  await expect(
    player.getByRole('img', { name: 'Imagen de la inscripción', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await edit(page);
  await expect(page.getByLabel('Contenido al abrir', { exact: true })).toHaveValue('image');
  await page.getByLabel('Contenido al abrir', { exact: true }).selectOption('none');
  await page.getByLabel('Texto verdadero', { exact: true }).fill(SAMPLE.text);
  await save(page);
});
test('no solicita imágenes restringidas sin comprensión y retira el visor al revocar el idioma', async ({
  page,
  context,
}) => {
  await media(page, 'image');
  await page.getByLabel('Quién puede ver la imagen', { exact: true }).selectOption('read');
  await save(page);
  const other = await context.newPage();
  let requests = 0;
  other.on('request', (r) => {
    if (r.url() === image) requests++;
  });
  await other.goto(entry('demo-other'));
  await other.getByRole('button', { name: rune, exact: true }).click();
  await expect(other.getByRole('dialog')).toContainText('No puedes comprender esta imagen.');
  expect(requests).toBe(0);
  const player = await context.newPage();
  await player.goto(entry('demo-basili'));
  await player.getByRole('button', { name: rune, exact: true }).click();
  await expect(
    player.getByRole('img', { name: 'Imagen de la inscripción', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /^Jugadores/ }).click();
  const profile = page
    .locator('.profile')
    .filter({ has: page.getByRole('heading', { name: 'Jugador de Basili', exact: true }) });
  await profile.getByRole('checkbox', { name: 'Telikari antiguo', exact: true }).uncheck();
  await profile.getByRole('button', { name: 'Guardar jugador', exact: true }).click();
  await expect(
    player.getByRole('img', { name: 'Imagen de la inscripción', exact: true }),
  ).toHaveCount(0);
  await expect(player.getByRole('dialog')).toContainText('No puedes comprender esta imagen.');
});
test('una imagen no disponible muestra recuperación sin impedir cerrar la inscripción', async ({
  page,
  context,
}) => {
  await media(page, 'image');
  await save(page);
  await context.unroute(image);
  await context.route(image, (route) => route.fulfill({ status: 404, body: 'missing' }));
  const player = await context.newPage();
  await player.goto(entry('demo-basili'));
  await player.getByRole('button', { name: rune, exact: true }).click();
  await expect(player.getByRole('alert')).toContainText('No se pudo cargar la imagen.');
  await context.unroute(image);
  await context.route(image, (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: artwork }),
  );
  await player.getByRole('button', { name: 'Reintentar imagen', exact: true }).click();
  await expect(
    player.getByRole('img', { name: 'Imagen de la inscripción', exact: true }),
  ).toHaveJSProperty('naturalWidth', 2400);
  await player.getByRole('button', { name: 'Cerrar inscripción', exact: true }).click();
  await expect(player.getByRole('dialog')).toHaveCount(0);
});
