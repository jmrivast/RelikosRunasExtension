import type { Adapter } from './adapter';
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
  type Inscription,
  type Language,
  type Profile,
  type Settings,
} from './domain';
export class RelikosService {
  constructor(private adapter: Adapter) {}
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
  async saveSettings(value: Settings) {
    await this.patch(SETTINGS_KEY, settingsSchema.parse(value));
  }
}
