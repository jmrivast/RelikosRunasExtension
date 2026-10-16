import { describe, expect, it } from 'vitest';
import { loadPrivateNote, savePrivateNote } from '../../src/privateNotes';

describe('notas privadas locales', () => {
  const scope = {
    roomId: 'room-a',
    player: { id: 'dm-a', name: 'DM', role: 'GM' as const },
    itemId: 'obj-a',
  };
  function storage() {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
  }
  it('persiste y aísla cada sala, cuenta y objeto; vaciar elimina la nota', () => {
    const store = storage();
    savePrivateNote(scope, 'Una pista privada', store);
    expect(loadPrivateNote(scope, store)).toBe('Una pista privada');
    for (const other of [
      { ...scope, roomId: 'room-b' },
      { ...scope, itemId: 'obj-b' },
      { ...scope, player: { ...scope.player, id: 'dm-b' } },
    ])
      expect(loadPrivateNote(other, store)).toBe('');
    savePrivateNote(scope, '', store);
    expect(loadPrivateNote(scope, store)).toBe('');
  });
  it('impide leer y escribir desde un rol jugador, incluso con la misma cuenta', () => {
    const store = storage();
    savePrivateNote(scope, 'Privado', store);
    const player = { ...scope, player: { ...scope.player, role: 'PLAYER' as const } };
    expect(() => loadPrivateNote(player, store)).toThrow(/Dungeon Master/);
    expect(() => savePrivateNote(player, 'x', store)).toThrow(/Dungeon Master/);
    expect(loadPrivateNote(scope, store)).toBe('Privado');
  });
  it('no oculta errores de almacenamiento ni sobreescribe una nota al superar el límite', () => {
    const store = storage();
    savePrivateNote(scope, 'Conservar', store);
    expect(() => savePrivateNote(scope, 'x'.repeat(12001), store)).toThrow(/12000/);
    expect(loadPrivateNote(scope, store)).toBe('Conservar');
    expect(() =>
      savePrivateNote(scope, 'x', {
        ...store,
        setItem: () => {
          throw new Error('Quota');
        },
      }),
    ).toThrow('Quota');
  });
});
