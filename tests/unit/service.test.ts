import { beforeEach, describe, expect, it } from 'vitest';
import type { Adapter } from '../../src/adapter';
import {
  INSCRIPTION_KEY,
  LANGUAGE_PREFIX,
  PROFILE_PREFIX,
  SAMPLE,
  SETTINGS_KEY,
  TELIKARI,
  readConfig,
  readInscription,
  type Snapshot,
} from '../../src/domain';
import { RelikosService } from '../../src/service';
let snapshot: Snapshot;
let adapter: Adapter;
let service: RelikosService;
beforeEach(() => {
  snapshot = {
    roomId: 'room-a',
    player: { id: 'dm', name: 'DM', role: 'GM' },
    players: [],
    ready: true,
    selection: ['obj'],
    items: [{ id: 'obj', name: 'Runa', visible: true, metadata: { foreign: { keep: true } } }],
    room: { foreign: { keep: true } },
    sceneToken: 'scene-a',
  };
  adapter = {
    demo: false,
    ready: async () => {},
    snapshot: async () => structuredClone(snapshot),
    subscribe: () => () => {},
    patchRoom: async (patch) => {
      Object.assign(snapshot.room, patch);
    },
    putInscription: async (id, value, token) => {
      if (token !== snapshot.sceneToken) throw new Error('La escena cambió');
      const item = snapshot.items.find((i) => i.id === id);
      if (!item) throw new Error('No existe');
      if (value) item.metadata[INSCRIPTION_KEY] = value;
      else delete item.metadata[INSCRIPTION_KEY];
    },
    selected: async () => ['obj'],
    open: async () => {},
    close: async () => {},
  };
  service = new RelikosService(adapter);
});
describe('operaciones autorizadas y persistencia', () => {
  it('guarda revelaciones y rechaza plantillas inválidas, parciales vacías y destinatarios repetidos', async () => {
    const reveal = { playerId: 'b', displayName: 'B', mode: 'partial' as const };
    const data = { ...SAMPLE, partialText: '[[Un secreto]] pista', revelations: [reveal] };
    await service.saveInscription('obj', data, 'scene-a');
    expect(readInscription(snapshot.items[0])).toMatchObject(data);
    for (const input of [
      { ...data, partialText: '[[Abierto' },
      { ...data, partialText: '' },
      { ...data, revelations: [reveal, reveal] },
    ])
      await expect(service.saveInscription('obj', input, 'scene-a')).rejects.toThrow();
    expect(readInscription(snapshot.items[0])).toMatchObject(data);
  });
  it('rechaza guardar notas si cambió la sala, la escena, el rol o se eliminó el objeto', async () => {
    await expect(service.saveNote('obj', 'Privado', 'scene-a', 'otra-sala')).rejects.toThrow(
      /escena/,
    );
    await expect(service.saveNote('obj', 'Privado', 'old-scene', 'room-a')).rejects.toThrow(
      /escena/,
    );
    await expect(service.saveNote('missing', 'Privado', 'scene-a', 'room-a')).rejects.toThrow(
      /objeto/,
    );
    snapshot.player.role = 'PLAYER';
    await expect(service.saveNote('obj', 'Privado', 'scene-a', 'room-a')).rejects.toThrow(
      /Dungeon Master/,
    );
  });
  it('guarda y actualiza sin tocar metadatos de otras extensiones', async () => {
    await service.saveInscription('obj', SAMPLE, 'scene-a');
    await service.saveInscription('obj', { ...SAMPLE, text: 'Nuevo texto' }, 'scene-a');
    expect(readInscription(snapshot.items[0])?.text).toBe('Nuevo texto');
    expect(snapshot.items[0].metadata.foreign).toEqual({ keep: true });
  });
  it('quita la inscripción y conserva la imagen', async () => {
    await service.saveInscription('obj', SAMPLE, 'scene-a');
    await service.removeInscription('obj', 'scene-a');
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].metadata).toEqual({ foreign: { keep: true } });
  });
  it('guarda idiomas, perfiles offline y configuración bajo claves separadas', async () => {
    await service.saveLanguage(TELIKARI);
    await service.saveProfile({
      version: 1,
      playerId: 'offline',
      character: 'Basili',
      displayName: 'Jugador',
      languageIds: [TELIKARI.id],
    });
    await service.saveSettings({ version: 1, fontSize: 22, animate: false });
    expect(readConfig(snapshot.room).profiles[0].character).toBe('Basili');
    expect(snapshot.room[SETTINGS_KEY]).toMatchObject({ fontSize: 22 });
    expect(snapshot.room.foreign).toEqual({ keep: true });
    expect(snapshot.room[LANGUAGE_PREFIX + TELIKARI.id]).toEqual(TELIKARI);
  });
  it('no pierde otros jugadores al guardar un perfil', async () => {
    const p = {
      version: 1 as const,
      playerId: 'one',
      character: 'Uno',
      displayName: 'Uno',
      languageIds: [],
    };
    await service.saveProfile(p);
    await service.saveProfile({ ...p, playerId: 'two' });
    expect(readConfig(snapshot.room).profiles).toHaveLength(2);
  });
  it('deduplica idiomas de un perfil', async () => {
    await service.saveProfile({
      version: 1,
      playerId: 'b',
      character: 'Basili',
      displayName: 'B',
      languageIds: [TELIKARI.id, TELIKARI.id],
    });
    expect(readConfig(snapshot.room).profiles[0].languageIds).toEqual([TELIKARI.id]);
  });
  it('permite quitar perfiles desconectados', async () => {
    await service.removeProfile('b');
    expect(snapshot.room[PROFILE_PREFIX + 'b']).toBeNull();
  });
  it('rechaza todas las escrituras de jugadores incluso si invocan el servicio directamente', async () => {
    snapshot.player.role = 'PLAYER';
    for (const action of [
      () => service.saveInscription('obj', SAMPLE, 'scene-a'),
      () => service.removeInscription('obj', 'scene-a'),
      () => service.saveLanguage(TELIKARI),
      () =>
        service.saveProfile({
          version: 1,
          playerId: 'b',
          character: 'Basili',
          displayName: 'B',
          languageIds: [],
        }),
      () => service.saveSettings({ version: 1, fontSize: 19, animate: true }),
      () => service.removeProfile('b'),
    ])
      await expect(action()).rejects.toThrow(/Dungeon Master/);
  });
  it('rechaza un objeto eliminado', async () => {
    snapshot.items = [];
    await expect(service.saveInscription('obj', SAMPLE, 'scene-a')).rejects.toThrow(/ya no existe/);
  });
  it('rechaza una escena cerrada o cambiada', async () => {
    snapshot.ready = false;
    await expect(service.saveInscription('obj', SAMPLE, 'scene-a')).rejects.toThrow(
      /escena cambió/,
    );
    snapshot.ready = true;
    await expect(service.saveInscription('obj', SAMPLE, 'old-scene')).rejects.toThrow(
      /escena cambió/,
    );
  });
  it('rechaza idiomas inexistentes', async () => {
    await expect(
      service.saveInscription('obj', { ...SAMPLE, languageId: 'missing' }, 'scene-a'),
    ).rejects.toThrow(/idioma válido/);
  });
  it('protege el límite de metadatos de sala', async () => {
    snapshot.room.foreign = 'a'.repeat(16000);
    await expect(service.saveLanguage(TELIKARI)).rejects.toThrow(/16 kB/);
  });
});
