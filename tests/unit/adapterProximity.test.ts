import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Item } from '@owlbear-rodeo/sdk';
import { INSCRIPTION_KEY, TOKEN_PLAYER_KEY, SAMPLE, type Inscription } from '../../src/domain';
const state = vi.hoisted(() => ({
  items: [] as Item[],
  role: 'GM' as 'GM' | 'PLAYER',
  unit: 'ft',
  multiplier: 5,
  onScene: () => {},
  open: vi.fn(),
  change: vi.fn(),
}));
vi.mock('@owlbear-rodeo/sdk', () => ({
  default: {
    isReady: true,
    player: {
      getId: async () => 'p1',
      getName: async () => 'Uno',
      getRole: async () => state.role,
      getSelection: async () => [],
      onChange: () => () => {},
    },
    party: { getPlayers: async () => [], onChange: () => () => {} },
    room: { id: 'room', getMetadata: async () => ({}), onMetadataChange: () => () => {} },
    viewport: { getHeight: async () => 900 },
    modal: { open: state.open, close: vi.fn() },
    scene: {
      isReady: async () => true,
      onReadyChange: (fn: () => void) => {
        state.onScene = fn;
        return () => {};
      },
      grid: {
        getDpi: async () => 100,
        getScale: async () => ({ parsed: { unit: state.unit, multiplier: state.multiplier } }),
        onChange: () => () => {},
      },
      items: {
        getItems: async (ids?: string[]) =>
          structuredClone(state.items.filter((item) => !ids || ids.includes(item.id))),
        getItemBounds: async (ids: string[]) => ({
          center: state.items.find((item) => ids.includes(item.id))!.position,
        }),
        updateItems: async (ids: string[], fn: (items: Item[]) => void) => {
          state.change(ids);
          fn(state.items.filter((item) => ids.includes(item.id)));
        },
        onChange: () => () => {},
      },
    },
  },
}));
import { OwlbearAdapter } from '../../src/owlbear';
import { RelikosService } from '../../src/service';
function item(id: string, layer = 'PROP'): Item {
  return {
    id,
    type: 'IMAGE',
    name: id,
    layer,
    visible: true,
    position: { x: 0, y: 0 },
    metadata: { foreign: 42 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    locked: false,
    zIndex: 0,
    createdUserId: 'dm',
    lastModified: '',
    lastModifiedUserId: 'dm',
  } as Item;
}
beforeEach(() => {
  state.items = [item('rune'), item('token', 'CHARACTER'), item('token2', 'CHARACTER')];
  state.role = 'GM';
  state.unit = 'ft';
  state.multiplier = 5;
  vi.clearAllMocks();
});
describe('proximidad en el adaptador del SDK (transporte simulado)', () => {
  it('restaura la visibilidad original al cambiar entre destinatarios y proximidad y deniega abrir a excluidos', async () => {
    const adapter = new OwlbearAdapter();
    const service = new RelikosService(adapter);
    const visibility = { players: [{ playerId: 'p1', displayName: 'Uno' }], restoreVisible: false };
    await service.saveInscription('rune', { ...SAMPLE, visibility }, '0');
    expect((state.items[0].metadata[INSCRIPTION_KEY] as Inscription).version).toBe(2);
    expect(state.items[0].visible).toBe(false);
    expect(
      (state.items[0].metadata[INSCRIPTION_KEY] as Inscription).visibility?.restoreVisible,
    ).toBe(true);
    state.role = 'PLAYER';
    await adapter.open({ view: 'read', itemId: 'rune' });
    expect(state.open).toHaveBeenCalledOnce();
    (state.items[0].metadata[INSCRIPTION_KEY] as Inscription).visibility!.players = [];
    await expect(adapter.open({ view: 'read', itemId: 'rune' })).rejects.toThrow(/posición/);
    state.role = 'GM';
    await service.saveInscription(
      'rune',
      { ...SAMPLE, proximity: { radiusFeet: 35, restoreVisible: false } },
      '0',
    );
    expect(
      (state.items[0].metadata[INSCRIPTION_KEY] as Inscription).proximity?.restoreVisible,
    ).toBe(true);
    await service.saveInscription('rune', { ...SAMPLE, visibility }, '0');
    await service.saveInscription('rune', SAMPLE, '0');
    expect(state.items[0].visible).toBe(true);
    state.items[0].visible = false;
    await service.saveInscription('rune', { ...SAMPLE, visibility }, '0');
    await service.removeInscription('rune', '0');
    expect(state.items[0].visible).toBe(false);
    expect(state.items[0].metadata).toEqual({ foreign: 42 });
    await expect(
      service.saveInscription(
        'rune',
        {
          ...SAMPLE,
          visibility: { ...visibility, players: [...visibility.players, ...visibility.players] },
        },
        '0',
      ),
    ).rejects.toThrow(/dos veces/);
  });

  it('oculta el original atómicamente y restaura su visibilidad al desactivar o quitar la inscripción', async () => {
    const adapter = new OwlbearAdapter();
    const service = new RelikosService(adapter);
    const data = { ...SAMPLE, proximity: { radiusFeet: 10 as const, restoreVisible: false } };
    await service.saveInscription('rune', data, '0');
    expect(state.items[0].visible).toBe(false);
    expect(
      (state.items[0].metadata[INSCRIPTION_KEY] as Inscription).proximity?.restoreVisible,
    ).toBe(true);
    await service.saveInscription('rune', { ...data, text: 'Editado' }, '0');
    expect(
      (state.items[0].metadata[INSCRIPTION_KEY] as Inscription).proximity?.restoreVisible,
    ).toBe(true);
    await service.saveInscription('rune', SAMPLE, '0');
    expect(state.items[0].visible).toBe(true);
    state.items[0].visible = false;
    await service.saveInscription('rune', data, '0');
    await service.removeInscription('rune', '0');
    expect(state.items[0].visible).toBe(false);
    expect(state.items[0].metadata).toEqual({ foreign: 42 });
    state.items[0].visible = true;
    await service.saveInscription('rune', data, '0');
    await service.removeInscription('rune', '0');
    expect(state.items[0].visible).toBe(true);
  });
  it('asigna un token de esta escena, conserva otros datos y no permite apropiarse del de otra cuenta', async () => {
    const adapter = new OwlbearAdapter();
    await adapter.ready();
    await adapter.assignToken('p1', 'token', '0');
    expect(state.items[1].metadata).toEqual({ foreign: 42, [TOKEN_PLAYER_KEY]: 'p1' });
    await adapter.assignToken('p1', 'token2', '0');
    expect(state.items[1].metadata).toEqual({ foreign: 42 });
    expect(state.items[2].metadata[TOKEN_PLAYER_KEY]).toBe('p1');
    await expect(adapter.assignToken('p2', 'token2', '0')).rejects.toThrow(/otro jugador/);
    await expect(adapter.assignToken('p1', 'rune', '0')).rejects.toThrow(/personaje/);
    state.onScene();
    await expect(adapter.assignToken('p1', 'token', '0')).rejects.toThrow(/escena/);
    state.role = 'PLAYER';
    await expect(adapter.assignToken('p1', 'token', '1')).rejects.toThrow(/Dungeon Master/);
    adapter.dispose();
  });
  it('bloquea abrir desde lejos y permite la copia local al acercarse al original oculto', async () => {
    const adapter = new OwlbearAdapter();
    const service = new RelikosService(adapter);
    await service.saveInscription(
      'rune',
      { ...SAMPLE, proximity: { radiusFeet: 10, restoreVisible: true } },
      '0',
    );
    state.items[1].metadata[TOKEN_PLAYER_KEY] = 'p1';
    state.items[1].position.x = 200;
    state.role = 'PLAYER';
    await expect(adapter.open({ view: 'read', itemId: 'rune' })).rejects.toThrow(/posición/);
    expect(state.open).not.toHaveBeenCalled();
    state.items[1].position.x = 199;
    await adapter.open({ view: 'read', itemId: 'rune' });
    expect(state.open).toHaveBeenCalledOnce();
    state.unit = 'desconocida';
    await expect(adapter.open({ view: 'read', itemId: 'rune' })).rejects.toThrow(/posición/);
    state.role = 'GM';
    await adapter.open({ view: 'read', itemId: 'rune' });
    expect(state.open).toHaveBeenCalledTimes(2);
  });
  it('convierte escalas métricas a pies y recupera los centros del mapa', async () => {
    const adapter = new OwlbearAdapter();
    const service = new RelikosService(adapter);
    await service.saveInscription(
      'rune',
      { ...SAMPLE, proximity: { radiusFeet: 10, restoreVisible: true } },
      '0',
    );
    state.unit = 'm';
    state.multiplier = 1.524;
    const snapshot = await adapter.snapshot();
    expect(snapshot.grid?.feetPerCell).toBeCloseTo(5);
    expect(snapshot.items[0].center).toEqual({ x: 0, y: 0 });
  });
});
