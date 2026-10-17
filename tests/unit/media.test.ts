import { describe, expect, it } from 'vitest';
import {
  canViewImage,
  inscriptionSchema,
  imageUrlSchema,
  readConfig,
  SAMPLE,
  TELIKARI,
  PROFILE_PREFIX,
  type Inscription,
} from '../../src/domain';
const media = {
  url: 'https://assets.example/original.png',
  mode: 'image',
  position: 'after',
  audience: 'read',
} as const;
const base: Inscription = { ...SAMPLE, version: 3, id: 'runa:x', objectId: 'x', media };
describe('imágenes en inscripciones', () => {
  it('acepta solo imagen sin texto y exige texto en modo complementario o antiguo', () => {
    expect(inscriptionSchema.safeParse({ ...base, text: '' }).success).toBe(true);
    expect(
      inscriptionSchema.safeParse({ ...base, text: '', media: { ...media, mode: 'text' } }).success,
    ).toBe(false);
    expect(
      inscriptionSchema.safeParse({ ...base, version: 1, media: undefined, text: '' }).success,
    ).toBe(false);
  });
  it('exige protocolo v3 sin invalidar inscripciones v1 y v2 anteriores', () => {
    expect(inscriptionSchema.safeParse(base).success).toBe(true);
    expect(inscriptionSchema.safeParse({ ...base, version: 2 }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...base, media: undefined }).success).toBe(false);
    expect(inscriptionSchema.safeParse({ ...base, version: 1, media: undefined }).success).toBe(
      true,
    );
    expect(
      inscriptionSchema.safeParse({ ...base, visibility: { players: [], restoreVisible: true } })
        .success,
    ).toBe(true);
  });
  it('rechaza protocolos ejecutables, archivos locales, credenciales y datos embebidos sin lanzar excepciones', () => {
    for (const url of [
      '',
      'no-url',
      'javascript:alert(1)',
      'data:image/png;base64,abc',
      'file:///secret.png',
      'http://example.com/x.png',
      'https://user:pass@example.com/x.png',
    ]) {
      expect(imageUrlSchema.safeParse(url).success).toBe(false);
    }
    expect(imageUrlSchema.safeParse(media.url).success).toBe(true);
  });
  it('la imagen restringida requiere comprensión completa; la parcial no basta y el DM conserva acceso', () => {
    const player = { id: 'p', name: 'P', role: 'PLAYER' } as const;
    const config = readConfig({
      [PROFILE_PREFIX + 'p']: {
        version: 1,
        playerId: 'p',
        displayName: 'P',
        character: 'P',
        languageIds: [TELIKARI.id],
      },
    });
    expect(canViewImage(player, base, config)).toBe(true);
    expect(canViewImage({ ...player, id: 'other' }, base, config)).toBe(false);
    expect(
      canViewImage(
        { ...player, id: 'other' },
        {
          ...base,
          partialText: '[[secreto]] pista',
          revelations: [{ playerId: 'other', displayName: 'O', mode: 'partial' }],
        },
        config,
      ),
    ).toBe(false);
    expect(canViewImage({ ...player, id: 'other', role: 'GM' }, base, config)).toBe(true);
    expect(
      canViewImage(
        { ...player, id: 'other' },
        { ...base, media: { ...media, audience: 'discover' } },
        config,
      ),
    ).toBe(true);
    expect(canViewImage(player, { ...base, media: undefined }, config)).toBe(false);
  });
});
