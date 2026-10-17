import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
const sdk = vi.hoisted(() => {
  const stop = vi.fn();
  const subscribe = vi.fn(() => stop);
  return {
    stop,
    default: {
      isAvailable: false,
      isReady: true,
      onReady: vi.fn((fn: () => void) => fn()),
      player: {
        getId: vi.fn(async () => 'persistent-id'),
        getName: vi.fn(async () => 'Visible'),
        getRole: vi.fn(async () => 'GM'),
        getSelection: vi.fn(async () => ['obj']),
        onChange: subscribe,
      },
      party: { getPlayers: vi.fn(async () => []), onChange: subscribe },
      room: {
        id: 'room-a',
        getMetadata: vi.fn(async () => ({ foreign: 42 })),
        setMetadata: vi.fn(),
        onMetadataChange: subscribe,
      },
      scene: {
        isReady: vi.fn(async () => true),
        onReadyChange: vi.fn(() => stop),
        items: {
          getItems: vi.fn(async () => [
            {
              id: 'obj',
              name: 'Runa',
              visible: true,
              metadata: {
                foreign: 42,
                'com.relikos.runas-antiguas/inscription': {
                  version: 1,
                  id: 'runa:obj',
                  objectId: 'obj',
                  title: 'Runa',
                  languageId: 'telikari-antiguo',
                  text: 'Texto',
                },
              },
            },
          ]),
          onChange: subscribe,
          updateItems: vi.fn(),
        },
        grid: { onChange: subscribe },
      },
      contextMenu: { create: vi.fn(), remove: vi.fn() },
      tool: { create: vi.fn(), createMode: vi.fn(), remove: vi.fn(), removeMode: vi.fn() },
      assets: {
        downloadImages: vi.fn(async () => [{ image: { url: 'https://assets.example/image.png' } }]),
      },
      viewport: { getHeight: vi.fn(async () => 900), getWidth: vi.fn(async () => 1800) },
      modal: { open: vi.fn(), close: vi.fn() },
      notification: { show: vi.fn() },
    },
  };
});
vi.mock('@owlbear-rodeo/sdk', () => ({ default: sdk.default }));
import { OwlbearAdapter, MODAL_ID } from '../../src/owlbear';
import { registerInteractions } from '../../src/background';
import { INSCRIPTION_KEY, LOCAL_RUNE_KEY, SAMPLE, NS } from '../../src/domain';
beforeEach(() => {
  vi.clearAllMocks();
});
describe('contratos del adaptador SDK real (transporte simulado)', () => {
  it('elige el recurso original de Owlbear y abre imágenes con espacio de primer plano', async () => {
    const adapter = new OwlbearAdapter();
    expect(await adapter.chooseImage()).toBe('https://assets.example/image.png');
    expect(sdk.default.assets.downloadImages).toHaveBeenCalledWith(false);
    const snapshot = await adapter.snapshot();
    const source = snapshot.items[0];
    source.metadata[INSCRIPTION_KEY] = {
      ...SAMPLE,
      version: 3,
      id: 'runa:obj',
      objectId: 'obj',
      media: {
        url: 'https://assets.example/image.png',
        mode: 'image',
        position: 'after',
        audience: 'discover',
      },
    };
    vi.spyOn(adapter, 'snapshot').mockResolvedValue({ ...snapshot, items: [source] });
    await adapter.open({ view: 'read', itemId: 'obj' });
    expect(sdk.default.modal.open).toHaveBeenCalledWith(
      expect.objectContaining({ width: 1600, height: 868, hidePaper: true }),
    );
  });
  it('mantiene Leer inscripción para metadatos v2 y resuelve la copia hacia el original', async () => {
    const adapter = new OwlbearAdapter();
    const open = vi.spyOn(adapter, 'open').mockResolvedValue();
    const stop = await registerInteractions(adapter);
    const menu = sdk.default.contextMenu.create.mock.calls[0][0];
    expect(
      menu.icons.map(
        (icon: { filter: { every: { value: number }[] } }) => icon.filter.every[0].value,
      ),
    ).toEqual([1, 2, 3]);
    menu.onClick({
      items: [
        {
          id: 'local-copy',
          name: 'Inscripción',
          visible: true,
          metadata: {
            [LOCAL_RUNE_KEY]: 'original',
            [INSCRIPTION_KEY]: {
              ...SAMPLE,
              version: 2,
              id: 'runa:original',
              objectId: 'original',
              visibility: {
                players: [{ playerId: 'p1', displayName: 'Uno' }],
                restoreVisible: true,
              },
            },
          },
        },
      ],
    });
    expect(open).toHaveBeenCalledWith({ view: 'read', itemId: 'original' });
    await stop();
  });

  it('usa el ID persistente y las APIs oficiales para el snapshot', async () => {
    const adapter = new OwlbearAdapter();
    await adapter.ready();
    expect((await adapter.snapshot()).player.id).toBe('persistent-id');
    expect(sdk.default.player.getId).toHaveBeenCalledOnce();
    adapter.dispose();
  });
  it('espera onReady sin inventar un retorno de cancelación', async () => {
    sdk.default.isReady = false;
    const adapter = new OwlbearAdapter();
    await adapter.ready();
    expect(sdk.default.onReady).toHaveBeenCalled();
    adapter.dispose();
    sdk.default.isReady = true;
  });
  it('abre y cierra un modal local sin broadcast', async () => {
    vi.stubGlobal('window', { innerHeight: 900 });
    const adapter = new OwlbearAdapter();
    await adapter.open({ view: 'read', itemId: 'obj' });
    expect(sdk.default.modal.open).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MODAL_ID,
        url: '/index.html?view=read&item=obj',
        width: 600,
        hidePaper: true,
      }),
    );
    await adapter.close();
    expect(sdk.default.modal.close).toHaveBeenCalledWith(MODAL_ID);
    vi.unstubAllGlobals();
  });
  it('abre desde el menú del objeto sin registrar herramientas que revelen pistas', async () => {
    vi.stubGlobal('window', { innerHeight: 900 });
    const adapter = new OwlbearAdapter();
    const open = vi.spyOn(adapter, 'open').mockResolvedValue();
    const stop = await registerInteractions(adapter);
    expect(sdk.default.contextMenu.create).toHaveBeenCalledTimes(2);
    const edit = sdk.default.contextMenu.create.mock.calls[1][0];
    expect(edit.icons[0].filter.roles).toEqual(['GM']);
    expect(sdk.default.tool.create).not.toHaveBeenCalled();
    expect(sdk.default.tool.createMode).not.toHaveBeenCalled();
    const read = sdk.default.contextMenu.create.mock.calls[0][0];
    read.onClick({
      items: [
        {
          id: 'obj',
          name: 'Runa',
          visible: true,
          metadata: { [INSCRIPTION_KEY]: { ...SAMPLE, version: 1, id: 'id', objectId: 'obj' } },
        },
      ],
    });
    expect(open).toHaveBeenCalledWith({ view: 'read', itemId: 'obj' });
    await stop();
    expect(sdk.default.contextMenu.remove).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
  it('limpia todas las suscripciones sin duplicar scene.onReadyChange', async () => {
    const adapter = new OwlbearAdapter();
    await adapter.ready();
    const stop = adapter.subscribe(() => {});
    expect(sdk.default.scene.onReadyChange).toHaveBeenCalledOnce();
    stop();
    adapter.dispose();
    expect(sdk.stop).toHaveBeenCalledTimes(6);
  });
  it('filtra lectura por metadatos propios y restringe configuración al GM', async () => {
    const adapter = new OwlbearAdapter();
    const stop = await registerInteractions(adapter);
    const read = sdk.default.contextMenu.create.mock.calls[0][0];
    expect(read.icons[0].filter.every[0].key).toEqual(['metadata', INSCRIPTION_KEY, 'version']);
    expect(read.id).toBe(`${NS}/read`);
    await stop();
  });
});
it('manifiesto válido según los campos oficiales, con recursos existentes', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
  const action = z.object({
    title: z.string(),
    icon: z.string(),
    popover: z.string(),
    width: z.number(),
    height: z.number(),
  });
  expect(
    z
      .object({
        name: z.string().max(45),
        description: z.string().max(128),
        version: z.string(),
        manifest_version: z.literal(1),
        background_url: z.string(),
        icon: z.string(),
        action,
      })
      .safeParse(manifest).success,
  ).toBe(true);
  for (const file of [manifest.icon, manifest.action.icon])
    expect(existsSync(`public${file}`)).toBe(true);
  expect(existsSync(manifest.background_url.slice(1))).toBe(true);
  expect(existsSync(manifest.action.popover.slice(1))).toBe(true);
});
