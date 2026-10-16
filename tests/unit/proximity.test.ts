import { describe, expect, it, vi } from 'vitest';
import {
  INSCRIPTION_KEY,
  LOCAL_RUNE_KEY,
  TOKEN_PLAYER_KEY,
  SAMPLE,
  type Snapshot,
  type Inscription,
  inscriptionSchema,
} from '../../src/domain';
import {
  canAccessItem,
  sourceId,
  startProximity,
  withinReach,
  type LocalRuneRenderer,
} from '../../src/proximity';
import type { Adapter } from '../../src/adapter';

export function spatialSnapshot(): Snapshot {
  return {
    roomId: 'room',
    ready: true,
    player: { id: 'p1', name: 'P', role: 'PLAYER' },
    players: [],
    room: {},
    selection: [],
    sceneToken: '1',
    grid: { dpi: 100, feetPerCell: 5 },
    items: [
      {
        id: 'rune',
        type: 'IMAGE',
        layer: 'PROP',
        name: 'Runa',
        visible: false,
        position: { x: 0, y: 0 },
        metadata: {
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
        type: 'IMAGE',
        layer: 'CHARACTER',
        name: 'Token',
        visible: true,
        position: { x: 180, y: 0 },
        metadata: { [TOKEN_PLAYER_KEY]: 'p1' },
      },
    ],
  };
}
describe('radio de descubrimiento', () => {
  it('combina destinatarios y distancia configurable, sin conceder acceso por idioma o nombre', () => {
    const s = spatialSnapshot();
    const inscription = s.items[0].metadata[INSCRIPTION_KEY] as Inscription;
    inscription.proximity!.radiusFeet = 30;
    inscription.version = 2;
    inscription.visibility = {
      players: [{ playerId: 'p1', displayName: 'P' }],
      restoreVisible: true,
    };
    s.items[1].position!.x = 500;
    expect(canAccessItem(s, s.items[0])).toBe(true);
    s.items[1].position!.x = 600;
    expect(canAccessItem(s, s.items[0])).toBe(false);
    inscription.proximity!.radiusFeet = 40;
    expect(canAccessItem(s, s.items[0])).toBe(true);
    s.player.id = 'excluded';
    s.items[1].metadata[TOKEN_PLAYER_KEY] = 'excluded';
    s.items[1].position!.x = 0;
    expect(canAccessItem(s, s.items[0])).toBe(false);
    s.player.role = 'GM';
    expect(canAccessItem(s, s.items[0])).toBe(true);
  });
  it('permite visibilidad individual sin token ni distancia y solo DM si no hay destinatarios', () => {
    const s = spatialSnapshot();
    const inscription = s.items[0].metadata[INSCRIPTION_KEY] as Inscription;
    delete inscription.proximity;
    inscription.version = 2;
    inscription.visibility = {
      players: [{ playerId: 'p1', displayName: 'P' }],
      restoreVisible: false,
    };
    s.items.splice(1);
    s.grid = undefined;
    expect(canAccessItem(s, s.items[0])).toBe(true);
    inscription.visibility.players = [];
    expect(canAccessItem(s, s.items[0])).toBe(false);
    for (const radiusFeet of [0, -1, Infinity, NaN, 100001]) {
      expect(
        inscriptionSchema.safeParse({
          ...inscription,
          proximity: { radiusFeet, restoreVisible: false },
        }).success,
      ).toBe(false);
    }
    expect(
      inscriptionSchema.safeParse({
        ...inscription,
        proximity: { radiusFeet: 2.5, restoreVisible: false },
      }).success,
    ).toBe(true);
  });

  it('exige menos de 10 pies exactos, usando la escala y no el zoom', () => {
    const s = spatialSnapshot();
    expect(withinReach(s, s.items[0])).toBe(true);
    s.items[1].position!.x = 200;
    expect(withinReach(s, s.items[0])).toBe(false);
    s.items[1].position!.x = 199.99;
    expect(withinReach(s, s.items[0])).toBe(true);
    s.grid!.feetPerCell = 10;
    expect(withinReach(s, s.items[0])).toBe(false);
    s.grid!.dpi = 200;
    expect(withinReach(s, s.items[0])).toBe(true);
  });
  it('usa centros de límites en coordenadas del mundo y considera la distancia diagonal', () => {
    const s = spatialSnapshot();
    s.items[0].center = { x: 500, y: 500 };
    s.items[1].center = { x: 650, y: 650 };
    expect(withinReach(s, s.items[0])).toBe(false);
    s.items[1].center = { x: 600, y: 600 };
    expect(withinReach(s, s.items[0])).toBe(true);
  });
  it('aísla por cuenta, no usa el creador ni el nombre y falla cerrado sin token o escala', () => {
    const s = spatialSnapshot();
    s.player.id = 'otra-cuenta';
    expect(withinReach(s, s.items[0])).toBe(false);
    s.player.id = 'p1';
    for (const change of [
      () => {
        s.items[1].visible = false;
      },
      () => {
        s.items[1].layer = 'PROP';
      },
      () => {
        s.grid!.feetPerCell = NaN;
      },
      () => {
        s.grid!.dpi = 0;
      },
      () => {
        s.ready = false;
      },
    ]) {
      const copy = structuredClone(s);
      change();
      expect(withinReach(s, s.items[0])).toBe(false);
      Object.assign(s, copy);
    }
    s.items.pop();
    expect(withinReach(s, s.items[0])).toBe(false);
  });
  it('mantiene lectura GM y visibilidad habitual cuando la proximidad está desactivada', () => {
    const s = spatialSnapshot();
    expect(canAccessItem(s, s.items[0])).toBe(true);
    s.items[1].position!.x = 500;
    expect(canAccessItem(s, s.items[0])).toBe(false);
    s.player.role = 'GM';
    expect(canAccessItem(s, s.items[0])).toBe(true);
    s.player.role = 'PLAYER';
    delete (s.items[0].metadata[INSCRIPTION_KEY] as { proximity?: unknown }).proximity;
    expect(canAccessItem(s, s.items[0])).toBe(false);
    s.items[0].visible = true;
    expect(canAccessItem(s, s.items[0])).toBe(true);
    expect(sourceId({ ...s.items[0], id: 'local', metadata: { [LOCAL_RUNE_KEY]: 'rune' } })).toBe(
      'rune',
    );
  });
});
describe('ciclo de actualización de proximidad', () => {
  it('los avisos de sus propias copias no invalidan ni borran la actualización en curso', async () => {
    let localChanged = () => {};
    const adapter = {
      snapshot: vi.fn(async () => spatialSnapshot()),
      subscribe: () => () => {},
    } as unknown as Adapter;
    const activeChecks: boolean[] = [];
    const local: LocalRuneRenderer = {
      reconcile: vi.fn(async (_snapshot, current) => {
        if (activeChecks.length === 0) localChanged();
        activeChecks.push(current());
      }),
      clear: vi.fn(async () => {}),
      subscribe: (callback) => {
        localChanged = callback;
        return () => {};
      },
    };
    const errors = vi.fn();
    const stop = startProximity(adapter, local, errors);
    await vi.waitFor(() => expect(local.reconcile).toHaveBeenCalledTimes(2));
    expect(activeChecks).toEqual([true, true]);
    expect(local.clear).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    await stop();
  });
  it('descarta lecturas antiguas, serializa actualizaciones y limpia al detenerse', async () => {
    const s = spatialSnapshot();
    let refresh = () => {};
    let resolve: (s: Snapshot) => void = () => {};
    const stopped = vi.fn();
    const adapter = {
      snapshot: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<Snapshot>((r) => {
              resolve = r;
            }),
        )
        .mockImplementation(async () => structuredClone(s)),
      subscribe: (fn: () => void) => {
        refresh = fn;
        return stopped;
      },
    } as unknown as Adapter;
    const local: LocalRuneRenderer = {
      reconcile: vi.fn(async () => {}),
      clear: vi.fn(async () => {}),
      subscribe: () => stopped,
    };
    const errors = vi.fn();
    const stop = startProximity(adapter, local, errors);
    s.items[1].position!.x = 500;
    refresh();
    resolve(spatialSnapshot());
    await vi.waitFor(() => expect(local.reconcile).toHaveBeenCalledOnce());
    expect(withinReach(vi.mocked(local.reconcile).mock.calls[0][0], s.items[0])).toBe(false);
    await stop();
    expect(stopped).toHaveBeenCalledTimes(2);
    expect(local.clear).toHaveBeenCalledOnce();
    refresh();
    expect(local.reconcile).toHaveBeenCalledOnce();
    expect(errors).not.toHaveBeenCalled();
  });
  it('retira copias y comunica un fallo de lectura sin revelar datos obsoletos', async () => {
    const adapter = {
      snapshot: vi.fn().mockRejectedValue(new Error('Sin conexión')),
      subscribe: () => () => {},
    } as unknown as Adapter;
    const local: LocalRuneRenderer = {
      reconcile: vi.fn(),
      clear: vi.fn(async () => {}),
      subscribe: () => () => {},
    };
    const errors = vi.fn();
    const stop = startProximity(adapter, local, errors);
    await vi.waitFor(() => expect(errors).toHaveBeenCalledOnce());
    expect(local.reconcile).not.toHaveBeenCalled();
    expect(local.clear).toHaveBeenCalledOnce();
    await stop();
  });
});
