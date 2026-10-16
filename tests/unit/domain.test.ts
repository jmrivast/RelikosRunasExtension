import { describe, expect, it } from 'vitest';
import {
  assertGM,
  canRead,
  DEFAULT_SETTINGS,
  INSCRIPTION_KEY,
  inscriptionId,
  inscriptionSchema,
  inscriptionPresentation,
  LANGUAGE_PREFIX,
  PROFILE_PREFIX,
  readConfig,
  readInscription,
  reading,
  readingMode,
  partialReading,
  validPartial,
  runes,
  SAMPLE,
  SETTINGS_KEY,
  TELIKARI,
  type Identity,
  type Inscription,
  type MapItem,
} from '../../src/domain';
const gm: Identity = { id: 'dm', name: 'DM', role: 'GM' };
const basili: Identity = { id: 'b', name: 'Basili', role: 'PLAYER' };
const other: Identity = { id: 'c', name: 'Basili', role: 'PLAYER' };
const inscription: Inscription = {
  ...SAMPLE,
  id: inscriptionId('rune'),
  objectId: 'rune',
  version: 1,
};
const room = {
  [LANGUAGE_PREFIX + TELIKARI.id]: TELIKARI,
  [PROFILE_PREFIX + 'b']: {
    version: 1,
    playerId: 'b',
    displayName: 'Usuario B',
    character: 'Basili',
    languageIds: [TELIKARI.id],
  },
};
describe('identidad y permisos', () => {
  it('revela una inscripción al ID elegido sin conceder el idioma ni otras inscripciones', () => {
    const config = readConfig(room);
    const revealed: Inscription = {
      ...inscription,
      revelations: [{ playerId: other.id, displayName: 'Otro', mode: 'full' }],
    };
    expect(reading(other, revealed, config)).toBe(SAMPLE.text);
    expect(canRead(other, inscription, config)).toBe(false);
    expect(canRead({ ...other, id: 'otra-cuenta' }, revealed, config)).toBe(false);
    expect(readingMode({ ...other, name: 'Nombre nuevo' }, revealed, config)).toBe('full');
    expect(readingMode(other, { ...revealed, revelations: [] }, config)).toBe('runes');
  });
  it('muestra únicamente las pistas parciales al jugador elegido y conserva la lectura por idioma', () => {
    const partial: Inscription = {
      ...inscription,
      partialText: '[[El rey]] regresa [[al norte]]',
      revelations: [
        { playerId: other.id, displayName: 'Otro', mode: 'partial' },
        { playerId: basili.id, displayName: 'Basili', mode: 'partial' },
      ],
    };
    const result = reading(other, partial, readConfig(room));
    expect(result).toContain('regresa');
    expect(result).not.toMatch(/El rey|al norte|\[|\]/u);
    expect(readingMode(other, partial, readConfig(room))).toBe('partial');
    expect(reading(basili, partial, readConfig(room))).toBe(SAMPLE.text);
    expect(reading(gm, partial, readConfig(room))).toBe(SAMPLE.text);
    expect(readingMode({ ...other, id: 'x' }, partial, readConfig(room))).toBe('runes');
    expect(readingMode(other, { ...partial, partialText: '' }, readConfig(room))).toBe('runes');
  });
  it('una plantilla parcial mal formada nunca filtra fragmentos ocultos', () => {
    for (const text of ['[[secreto', 'secreto]]', '[[exterior [[interior]]]]', '[[]]']) {
      expect(validPartial(text)).toBe(false);
      expect(partialReading(text, 'id')).not.toMatch(/[a-z]/u);
      expect(
        readingMode(
          other,
          {
            ...inscription,
            partialText: text,
            revelations: [{ playerId: other.id, displayName: '', mode: 'partial' }],
          },
          readConfig(room),
        ),
      ).toBe('runes');
    }
    expect(validPartial('[[oculto\n😀]] pista [[otro]]')).toBe(true);
    expect(partialReading('[[oculto\n😀]] pista [[otro]]', 'id')).toContain('\n');
    expect(partialReading('[[oculto]] pista', 'id')).toBe(partialReading('[[oculto]] pista', 'id'));
  });
  it('autoriza por ID persistente, nunca por el nombre visible', () => {
    expect(canRead(basili, inscription, readConfig(room))).toBe(true);
    expect(canRead(other, inscription, readConfig(room))).toBe(false);
  });
  it('el DM lee siempre, incluso si falta el idioma', () =>
    expect(canRead(gm, { ...inscription, languageId: 'missing' }, readConfig({}))).toBe(true));
  it('recupera la asignación de personaje y lenguas', () =>
    expect(readConfig(room).profiles[0]).toMatchObject({
      playerId: 'b',
      character: 'Basili',
      languageIds: [TELIKARI.id],
    }));
  it('conserva permisos de un usuario desconectado entre sesiones', () => {
    const recovered = readConfig(JSON.parse(JSON.stringify(room)));
    expect(canRead({ ...basili, name: 'Nuevo nombre' }, inscription, recovered)).toBe(true);
  });
  it('revocar permisos retira la lectura', () =>
    expect(
      canRead(
        basili,
        inscription,
        readConfig({
          ...room,
          [PROFILE_PREFIX + 'b']: { ...room[PROFILE_PREFIX + 'b'], languageIds: [] },
        }),
      ),
    ).toBe(false));
  it('restringe administración al DM', () => {
    expect(() => assertGM(gm)).not.toThrow();
    expect(() => assertGM(basili)).toThrow(/Dungeon Master/);
  });
  it('un perfil cuyo ID no coincide con la clave nunca concede acceso', () => {
    expect(
      canRead(
        other,
        inscription,
        readConfig({ [PROFILE_PREFIX + 'c']: room[PROFILE_PREFIX + 'b'] }),
      ),
    ).toBe(false);
  });
  it('un idioma inválido falla cerrado', () => {
    expect(
      canRead(
        basili,
        inscription,
        readConfig({ ...room, [LANGUAGE_PREFIX + TELIKARI.id]: { bad: true } }),
      ),
    ).toBe(false);
  });
});
describe('escritura rúnica', () => {
  it('es determinista y sensible a la identidad de la inscripción', () => {
    expect(runes(SAMPLE.text, 'a')).toBe(runes(SAMPLE.text, 'a'));
    expect(runes(SAMPLE.text, 'a')).not.toBe(runes(SAMPLE.text, 'b'));
  });
  it('mantiene longitud y separación de párrafos sin palabras legibles', () => {
    const text = 'Hola, Basili!\n\nSegunda línea 123.';
    const result = runes(text, 'id');
    expect(Array.from(result)).toHaveLength(Array.from(text).length);
    expect(result.match(/\s+/g)).toEqual(text.match(/\s+/g));
    expect(result).not.toMatch(/[A-Za-z0-9]/);
    expect(result.replace(/\s/g, '')).toMatch(/^[\u16a0-\u16ff]+$/u);
  });
  it('usa la versión manual si el DM la proporciona', () =>
    expect(reading(other, { ...inscription, unreadable: 'ᚨᚱᚾᛟ' }, readConfig(room))).toBe('ᚨᚱᚾᛟ'));
  it('lector autorizado ve el original aunque haya versión manual', () =>
    expect(reading(basili, { ...inscription, unreadable: 'ᚨ' }, readConfig(room))).toBe(
      SAMPLE.text,
    ));
});
describe('validación y persistencia', () => {
  it('conserva la presentación de inscripciones antiguas sin opciones de ocultación', () => {
    const legacy = inscriptionSchema.parse(inscription);
    expect(inscriptionPresentation(other, legacy)).toEqual({
      title: SAMPLE.title,
      hideTitle: false,
      hideLanguage: false,
    });
    expect(
      inscriptionSchema.safeParse({ ...inscription, hideTitleFromPlayers: 'sí' }).success,
    ).toBe(false);
  });
  it('rechaza registros incompletos y versiones desconocidas', () => {
    for (const bad of [
      null,
      {},
      { ...inscription, version: 2 },
      { ...inscription, text: '' },
      { ...inscription, text: 'x'.repeat(12001) },
    ])
      expect(inscriptionSchema.safeParse(bad).success).toBe(false);
  });
  it('no interpreta metadatos ajenos como inscripción', () =>
    expect(
      readInscription({ id: 'x', name: 'x', visible: true, metadata: { foreign: inscription } }),
    ).toBeNull());
  it('las copias reciben su propia identidad y objeto asociado', () => {
    const a: MapItem = {
      id: 'a',
      name: 'a',
      visible: true,
      metadata: { [INSCRIPTION_KEY]: inscription },
    };
    const b = { ...a, id: 'b' };
    expect(readInscription(a)?.id).not.toBe(readInscription(b)?.id);
    expect(readInscription(b)?.objectId).toBe('b');
  });
  it('recupera configuración visual persistida', () =>
    expect(
      readConfig({ [SETTINGS_KEY]: { version: 1, fontSize: 24, animate: false } }).settings,
    ).toEqual({ version: 1, fontSize: 24, animate: false }));
  it('maneja configuración corrupta sin fallar y sin conceder permisos', () => {
    const c = readConfig({
      [SETTINGS_KEY]: { fontSize: 99 },
      [PROFILE_PREFIX + 'x']: { languageIds: [TELIKARI.id] },
    });
    expect(c.settings).toEqual(DEFAULT_SETTINGS);
    expect(c.profiles).toEqual([]);
    expect(c.warnings).toHaveLength(2);
  });
  it('ofrece Telikari antiguo al comenzar una sala', () =>
    expect(readConfig({}).languages).toContainEqual(TELIKARI));
});
