import type { Adapter } from './adapter';
import { savePrivateNote } from './privateNotes';
import {
  assertGM,
  inscriptionId,
  inscriptionSchema,
  languageSchema,
  profileSchema,
  settingsSchema,
  LANGUAGE_PREFIX,
  PROFILE_PREFIX,
  SETTINGS_KEY,
  readConfig,
  validPartial,
  readInscription,
  type Inscription,
  type Language,
  type Profile,
  type Settings,
} from './domain';
export class RelikosService {
  constructor(private adapter: Adapter) {}
  async saveNote(itemId: string, text: string, sceneToken: string, roomId: string) {
    const s = await this.adapter.snapshot();
    assertGM(s.player);
    if (!s.ready || s.sceneToken !== sceneToken || s.roomId !== roomId)
      throw new Error('La escena cambió. Vuelve a abrir el editor.');
    if (!s.items.some((item) => item.id === itemId)) throw new Error('El objeto ya no existe.');
    savePrivateNote({ roomId: s.roomId, player: s.player, itemId }, text);
  }
  async saveInscription(
    itemId: string,
    input: Omit<Inscription, 'id' | 'version' | 'objectId'>,
    sceneToken: string,
  ) {
    const s = await this.adapter.snapshot();
    assertGM(s.player);
    if (!s.ready || s.sceneToken !== sceneToken)
      throw new Error('La escena cambió. Vuelve a abrir el editor.');
    if (!s.items.some((i) => i.id === itemId))
      throw new Error('El objeto ya no existe en esta escena.');
    const data = inscriptionSchema.parse({
      ...input,
      version: 1,
      id: inscriptionId(itemId),
      objectId: itemId,
    });
    if (data.proximity) {
      const item = s.items.find((i) => i.id === itemId)!;
      if (item.type !== 'IMAGE') throw new Error('La proximidad requiere una imagen de runa.');
      data.proximity.restoreVisible =
        readInscription(item)?.proximity?.restoreVisible ?? item.visible;
    }
    if (data.partialText && !validPartial(data.partialText))
      throw new Error('Cierra cada fragmento oculto con [[ y ]], sin anidar corchetes.');
    if (data.revelations?.some((r) => r.mode === 'partial') && !data.partialText?.trim())
      throw new Error('Escribe una traducción parcial antes de asignarla a un jugador.');
    if (new Set(data.revelations?.map((r) => r.playerId)).size !== (data.revelations?.length ?? 0))
      throw new Error('Un jugador no puede tener dos revelaciones en la misma inscripción.');
    if (!readConfig(s.room).languages.some((l) => l.id === data.languageId))
      throw new Error('Selecciona un idioma válido.');
    await this.adapter.putInscription(itemId, data, sceneToken);
  }
  async removeInscription(itemId: string, sceneToken: string) {
    assertGM((await this.adapter.snapshot()).player);
    await this.adapter.putInscription(itemId, null, sceneToken);
  }
  private async patch(key: string, value: unknown) {
    const s = await this.adapter.snapshot();
    assertGM(s.player);
    const projected = { ...s.room, [key]: value };
    if (new TextEncoder().encode(JSON.stringify(projected)).length >= 15500)
      throw new Error(
        'La sala se acerca al límite de 16 kB de metadatos. Reduce los datos o elimina perfiles antiguos.',
      );
    await this.adapter.patchRoom({ [key]: value });
  }
  async saveLanguage(value: Language) {
    const l = languageSchema.parse(value);
    await this.patch(LANGUAGE_PREFIX + l.id, l);
  }
  async saveProfile(value: Profile) {
    const p = profileSchema.parse(value);
    const config = readConfig((await this.adapter.snapshot()).room);
    if (p.languageIds.some((id) => !config.languages.some((l) => l.id === id)))
      throw new Error('Uno de los idiomas ya no está disponible.');
    await this.patch(PROFILE_PREFIX + p.playerId, {
      ...p,
      languageIds: [...new Set(p.languageIds)],
    });
  }
  async removeProfile(playerId: string) {
    await this.patch(PROFILE_PREFIX + playerId, null);
  }
  async assignToken(playerId: string, itemId: string | null, sceneToken: string) {
    const snapshot = await this.adapter.snapshot();
    assertGM(snapshot.player);
    if (!snapshot.ready || snapshot.sceneToken !== sceneToken) throw new Error('La escena cambió.');
    if (
      !snapshot.players.some((p) => p.id === playerId && p.role === 'PLAYER') &&
      !readConfig(snapshot.room).profiles.some((p) => p.playerId === playerId)
    )
      throw new Error('Selecciona un jugador conocido de esta sala.');
    await this.adapter.assignToken(playerId, itemId, sceneToken);
  }
  async saveSettings(value: Settings) {
    await this.patch(SETTINGS_KEY, settingsSchema.parse(value));
  }
}
