import { expect, test, type Page } from '@playwright/test';
import { SAMPLE, INSCRIPTION_KEY, PROFILE_PREFIX, NS } from '../../src/domain';
const entry = (actor = 'demo-dm') => `/?demo=1&actor=${actor}`;
async function openReading(page: Page) {
  await page.getByRole('button', { name: 'Leer', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto(entry());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Relikos', exact: true })).toBeVisible();
});
test('DM crea, edita y desvincula una inscripción conservando el objeto', async ({ page }) => {
  await page.getByRole('button', { name: 'Configurar objeto seleccionado' }).click();
  await page.getByLabel('Título', { exact: true }).fill('Inscripción de prueba');
  await page.getByLabel('Texto verdadero', { exact: true }).fill('Texto editable de prueba.');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Inscripción de prueba' })).toBeVisible();
  const row = page.locator('.inscription-row').filter({ hasText: 'Inscripción de prueba' });
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Texto verdadero', { exact: true }).fill('Texto actualizado.');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await row.getByRole('button', { name: 'Leer', exact: true }).click();
  await expect(page.getByTestId('reading')).toHaveText('Texto actualizado.');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await row.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByRole('button', { name: 'Quitar inscripción del objeto' }).click();
  await page.getByRole('button', { name: 'Confirmar eliminación' }).click();
  await expect(page.getByRole('heading', { name: 'Inscripción de prueba' })).toHaveCount(0);
  const preserved = await page.evaluate(
    ({ key, inscriptionKey }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      const item = s.scenes.a.find((i: { id: string }) => i.id === 'rune-blank');
      return (
        !!item &&
        item.metadata['other.extension/value'] === 42 &&
        item.metadata[inscriptionKey] === undefined
      );
    },
    { key: `${NS}/demo-v1`, inscriptionKey: INSCRIPTION_KEY },
  );
  expect(preserved).toBe(true);
});
test('DM siempre ve el texto verdadero y puede reabrir la ventana', async ({ page }) => {
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveText(SAMPLE.text);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveText(SAMPLE.text);
});
test('Basili lee el texto y no tiene controles administrativos', async ({ page }) => {
  await page.goto(entry('demo-basili'));
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveText(SAMPLE.text);
});
test('otro jugador ve solo runas estables, sin el secreto en el DOM', async ({ page }) => {
  await page.goto(entry('demo-other'));
  await openReading(page);
  const text = await page.getByTestId('reading').textContent();
  expect(text).not.toMatch(/[a-zA-Z]/);
  await expect(page.getByText('Espero algún día', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveText(text!);
});
test('los modales son locales y la revocación de permisos se sincroniza en una lectura abierta', async ({
  page,
  context,
}) => {
  const basili = await context.newPage();
  const other = await context.newPage();
  await basili.goto(entry('demo-basili'));
  await other.goto(entry('demo-other'));
  await openReading(basili);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(other.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jugadores', exact: true }).click();
  const profile = page.locator('form.profile').filter({ hasText: 'Jugador de Basili' });
  await profile.getByRole('checkbox', { name: 'Telikari antiguo' }).uncheck();
  await profile.getByRole('button', { name: 'Guardar jugador' }).click();
  await expect(basili.getByTestId('reading')).not.toContainText('Espero algún día');
  await expect(basili.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
  await profile.getByRole('checkbox', { name: 'Telikari antiguo' }).check();
  await profile.getByRole('button', { name: 'Guardar jugador' }).click();
  await expect(basili.getByTestId('reading')).toHaveText(SAMPLE.text);
  await basili.close();
  await other.close();
});
test('personaje y permisos persisten tras recargar y reconectar', async ({ page }) => {
  await page.getByRole('button', { name: 'Jugadores', exact: true }).click();
  const profile = page.locator('form.profile').filter({ hasText: 'Jugador de Basili' });
  await profile.getByLabel('Personaje de Jugador de Basili').fill('Basili');
  await profile.getByRole('button', { name: 'Guardar jugador' }).click();
  await page.getByText('Controles de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Conectar/desconectar Basili' }).click();
  await expect(profile.getByText('Desconectado', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Jugadores', exact: true }).click();
  await expect(profile.getByLabel('Personaje de Jugador de Basili')).toHaveValue('Basili');
  await expect(profile.getByRole('checkbox', { name: 'Telikari antiguo' })).toBeChecked();
});
test('crea y renombra idiomas, asigna lectores y guarda configuración', async ({ page }) => {
  await page.getByRole('button', { name: 'Idiomas', exact: true }).click();
  await page.getByLabel('Nuevo idioma', { exact: true }).fill('Idioma de prueba');
  await page.getByRole('button', { name: 'Crear idioma' }).click();
  const fields = page.getByLabel('Nombre del idioma', { exact: true });
  await expect(fields).toHaveCount(2);
  await fields.nth(1).fill('Idioma renombrado');
  await page.getByRole('button', { name: 'Renombrar', exact: true }).nth(1).click();
  await page.getByRole('button', { name: 'Asignar lectores', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Jugadores e idiomas' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Idioma renombrado' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await page.getByLabel('Tamaño del texto de lectura').selectOption('24');
  await page.getByRole('checkbox', { name: 'Animación de aparición' }).uncheck();
  await page.getByRole('button', { name: 'Guardar configuración' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Configuración', exact: true }).click();
  await expect(page.getByLabel('Tamaño del texto de lectura')).toHaveValue('24');
  await expect(page.getByRole('checkbox', { name: 'Animación de aparición' })).not.toBeChecked();
});
test('no hay escena y varias escenas se manejan sin mezclar inscripciones', async ({ page }) => {
  await page.getByLabel('Escena de prueba').selectOption('none');
  await expect(page.getByText('No hay una escena abierta.', { exact: false })).toBeVisible();
  await page.getByLabel('Escena de prueba').selectOption('b');
  await expect(page.getByRole('heading', { name: SAMPLE.title })).toHaveCount(0);
  await page.getByLabel('Escena de prueba').selectOption('a');
  await expect(page.getByRole('heading', { name: SAMPLE.title })).toBeVisible();
});
test('duplicados se editan independientemente y la eliminación de objeto retira la inscripción', async ({
  page,
}) => {
  await page.getByText('Controles de prueba', { exact: true }).click();
  await page.getByRole('button', { name: 'Duplicar objeto', exact: true }).click();
  await expect(page.locator('.inscription-row')).toHaveCount(2);
  await page
    .locator('.inscription-row')
    .nth(1)
    .getByRole('button', { name: 'Editar', exact: true })
    .click();
  await page.getByLabel('Título', { exact: true }).fill('Copia independiente');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await expect(page.getByRole('heading', { name: SAMPLE.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Copia independiente' })).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar objeto de Aurill' }).click();
  await expect(page.getByRole('heading', { name: SAMPLE.title })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Copia independiente' })).toBeVisible();
});
test('una URL de editor no permite editar a un jugador', async ({ page }) => {
  await page.goto(entry('demo-other') + '&view=edit&item=rune-aurill');
  await expect(page.getByRole('heading', { name: 'Acceso reservado al DM' })).toBeVisible();
  await expect(page.getByLabel('Texto verdadero', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Guardar inscripción' })).toHaveCount(0);
});
test('metadatos dañados no conceden lectura y el DM recibe aviso', async ({ page }) => {
  await page.evaluate(
    ({ key, profileKey }) => {
      const s = JSON.parse(localStorage.getItem(key)!);
      s.room[profileKey] = { version: 99, languageIds: ['telikari-antiguo'] };
      localStorage.setItem(key, JSON.stringify(s));
    },
    { key: `${NS}/demo-v1`, profileKey: PROFILE_PREFIX + 'demo-basili' },
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('permisos inválidos');
  await page.goto(entry('demo-basili'));
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveAttribute(
    'aria-label',
    'Escritura indescifrable',
  );
});
test('escritura personalizada y textos extensos funcionan en móvil con movimiento reducido', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page
    .getByLabel('Texto verdadero', { exact: true })
    .fill('Texto de prueba para desplazamiento.\n\n'.repeat(100));
  await page
    .getByLabel('Escritura indescifrable personalizada', { exact: false })
    .fill('ᚨᚱᚾᛟ ᚷᚦᛖᛚ');
  await page.getByRole('button', { name: 'Guardar inscripción' }).click();
  await openReading(page);
  await expect(page.getByRole('button', { name: 'Cerrar inscripción' })).toBeVisible();
  expect(
    await page.locator('.reader').evaluate((node) => getComputedStyle(node).animationName),
  ).toBe('none');
  expect(
    await page.getByRole('dialog').evaluate((node) => node.scrollHeight > node.clientHeight),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Cerrar inscripción' }).click();
  await page.goto(entry('demo-other'));
  await openReading(page);
  await expect(page.getByTestId('reading')).toHaveText('ᚨᚱᚾᛟ ᚷᚦᛖᛚ');
});
test('carga con identidad correcta, sin página vacía, overlay ni errores de consola', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.reload();
  await expect(page).toHaveTitle('Relikos — Runas Antiguas');
  await expect(page.getByRole('heading', { name: 'Relikos', exact: true })).toBeVisible();
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await openReading(page);
  await page.getByRole('button', { name: 'Cerrar inscripción' }).click();
  expect(errors).toEqual([]);
});
