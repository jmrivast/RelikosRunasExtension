import { assertGM, NS, type Identity } from './domain';

type NoteScope = { roomId: string; player: Identity; itemId: string };
function noteKey({ roomId, player, itemId }: NoteScope) {
  assertGM(player);
  if (!roomId || !player.id || !itemId) throw new Error('No se pudo identificar la nota privada.');
  return `${NS}/private-note/${JSON.stringify([roomId, player.id, itemId])}`;
}
// These notes never enter room or scene metadata: only this browser/account can retrieve them.
export function loadPrivateNote(
  scope: NoteScope,
  storage: Pick<Storage, 'getItem'> = localStorage,
) {
  return storage.getItem(noteKey(scope)) ?? '';
}
export function savePrivateNote(
  scope: NoteScope,
  text: string,
  storage: Pick<Storage, 'setItem' | 'removeItem'> = localStorage,
) {
  const key = noteKey(scope);
  if (text.length > 12000) throw new Error('La nota supera los 12000 caracteres.');
  if (text.trim()) storage.setItem(key, text);
  else storage.removeItem(key);
}
