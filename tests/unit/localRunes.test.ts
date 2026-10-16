import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import {
  INSCRIPTION_KEY,
  LOCAL_RUNE_KEY,
  TOKEN_PLAYER_KEY,
  SAMPLE,
  type Snapshot,
} from '../../src/domain';
const mock = vi.hoisted(() => ({
  locals: [] as Item[],
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  sharedWrite: vi.fn(),
}));
vi.mock('@owlbear-rodeo/sdk', () => ({
  default: {
    scene: {
      isReady: async () => true,
      items: { updateItems: mock.sharedWrite },
      local: {
        getItems: async (filter?: (item: Item) => boolean) =>
          structuredClone(mock.locals.filter(filter ?? (() => true))),
        addItems: async (items: Item[]) => {
          mock.add(items);
          mock.locals.push(...structuredClone(items));
        },
        updateItems: async (ids: string[], update: (draft: Item[]) => void) => {
          mock.update(ids);
          update(mock.locals.filter((item) => ids.includes(item.id)));
        },
        deleteItems: async (ids: string[]) => {
          mock.remove(ids);
          mock.locals = mock.locals.filter((item) => !ids.includes(item.id));
        },
        onChange: () => () => {},
      },
    },
  },
}));
import { OwlbearLocalRunes } from '../../src/localRunes';
function snapshot(): Snapshot {
  return {
    roomId: 'room',
    ready: true,
    player: { id: 'one', name: 'Uno', role: 'PLAYER' },
    players: [],
    room: {},
    selection: [],
    sceneToken: '1',
    grid: { dpi: 100, feetPerCell: 5 },
    items: [
      {
        id: 'rune',
        name: 'Título secreto',
        type: 'IMAGE',
        layer: 'PROP',
        visible: false,
        position: { x: 0, y: 0 },
        metadata: {
          foreign: 'preservar',
          [INSCRIPTION_KEY]: {
            ...SAMPLE,
            version: 1,
            id: 'runa:rune',
            objectId: 'rune',
            proximity: { radiusFeet: 10, restoreVisible: true },
          },
        },
      },
      {
        id: 'token',
        name: 'Token',
        type: 'IMAGE',
        layer: 'CHARACTER',
        visible: true,
        position: { x: 100, y: 0 },
        metadata: { [TOKEN_PLAYER_KEY]: 'one' },
      },
    ],
  };
}
beforeEach(() => {
  mock.locals = [];
  vi.clearAllMocks();
});
describe('representación privada mediante el SDK local', () => {
  it('actualiza la copia sin reenviar campos de auditoría de solo lectura al SDK', async () => {
    const s = snapshot();
    const renderer = new OwlbearLocalRunes();
    Object.assign(s.items[0], { lastModified: 'fecha-original', lastModifiedUserId: 'dm' });
    await renderer.reconcile(s, () => true);
    Object.assign(mock.locals[0], { lastModified: 'fecha-local', lastModifiedUserId: 'one' });
    s.items[0].position!.x = 10;
    await renderer.reconcile(s, () => true);
    expect(mock.locals[0].position.x).toBe(10);
    expect(mock.locals[0].lastModified).toBe('fecha-local');
    expect(mock.locals[0].lastModifiedUserId).toBe('one');
  });
  it('añade una copia solo al jugador cercano, estable entre eventos y sin modificar la escena', async () => {
    const s = snapshot();
    const source = structuredClone(s.items[0]);
    const renderer = new OwlbearLocalRunes();
    await renderer.reconcile(s, () => true);
    expect(mock.locals).toHaveLength(1);
    expect(mock.locals[0]).toMatchObject({
      name: 'Inscripción',
      visible: true,
      createdUserId: 'one',
      locked: false,
      metadata: { [LOCAL_RUNE_KEY]: 'rune' },
    });
    expect(mock.locals[0].id).not.toBe('rune');
    expect(mock.locals[0].metadata.foreign).toBeUndefined();
    await renderer.reconcile(s, () => true);
    expect(mock.add).toHaveBeenCalledOnce();
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.sharedWrite).not.toHaveBeenCalled();
    expect(s.items[0]).toEqual(source);
    s.items[1].position!.x = 200;
    await renderer.reconcile(s, () => true);
    expect(mock.locals).toHaveLength(0);
  });
  it('retira copias al cambiar cuenta, rol, asignación, borrar runa y cambiar a una escena vacía', async () => {
    for (const change of [
      (s: Snapshot) => {
        s.player.id = 'two';
      },
      (s: Snapshot) => {
        s.player.role = 'GM';
      },
      (s: Snapshot) => {
        delete s.items[1].metadata[TOKEN_PLAYER_KEY];
      },
      (s: Snapshot) => {
        s.items.shift();
      },
      (s: Snapshot) => {
        s.items = [];
        s.sceneToken = '2';
      },
    ]) {
      const s = snapshot();
      const renderer = new OwlbearLocalRunes();
      await renderer.reconcile(s, () => true);
      expect(mock.locals).toHaveLength(1);
      change(s);
      await renderer.reconcile(s, () => true);
      expect(mock.locals).toHaveLength(0);
    }
  });
  it('repone transformaciones alteradas localmente y elimina duplicados sin tocar otras extensiones', async () => {
    const s = snapshot();
    const renderer = new OwlbearLocalRunes();
    const other = { id: 'foreign', metadata: { foreign: true } } as unknown as Item;
    mock.locals.push(other);
    await renderer.reconcile(s, () => true);
    const copy = mock.locals.find((item) => item.id !== 'foreign')!;
    copy.position = { x: 999, y: 999 };
    mock.locals.push({ ...structuredClone(copy), id: 'duplicate' });
    await renderer.reconcile(s, () => true);
    expect(mock.locals).toHaveLength(2);
    expect(mock.locals.find((item) => item.id === copy.id)?.position).toEqual({ x: 0, y: 0 });
    await renderer.clear();
    expect(mock.locals).toEqual([other]);
  });
  it('una operación invalidada no deja copias en pantalla', async () => {
    const renderer = new OwlbearLocalRunes();
    let valid = true;
    mock.add.mockImplementationOnce(() => {
      valid = false;
    });
    await renderer.reconcile(snapshot(), () => valid);
    expect(mock.locals).toHaveLength(0);
  });
});
