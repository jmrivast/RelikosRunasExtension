import { z } from 'zod';
export const NS = 'com.relikos.runas-antiguas';
export const INSCRIPTION_KEY = `${NS}/inscription`;
export const SETTINGS_KEY = `${NS}/settings`;
export const LANGUAGE_PREFIX = `${NS}/language/`;
export const PROFILE_PREFIX = `${NS}/player/`;
const id = z.string().min(1).max(180);
export const languageSchema = z.object({
  version: z.literal(1),
  id,
  name: z.string().trim().min(1).max(80),
});
export const profileSchema = z.object({
  version: z.literal(1),
  playerId: id,
  displayName: z.string().max(100),
  character: z.string().max(100),
  languageIds: z.array(id).max(60),
});
export const settingsSchema = z.object({
  version: z.literal(1),
  fontSize: z.number().int().min(16).max(24),
  animate: z.boolean(),
});
export const inscriptionSchema = z.object({
  version: z.literal(1),
  id,
  objectId: id,
  title: z.string().trim().min(1).max(140),
  languageId: id,
  text: z.string().trim().min(1).max(12000),
  unreadable: z.string().max(12000).optional(),
});
export type Language = z.infer<typeof languageSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Inscription = z.infer<typeof inscriptionSchema>;
export type Identity = { id: string; name: string; role: 'GM' | 'PLAYER' };
export type MapItem = {
  id: string;
  name: string;
  visible: boolean;
  metadata: Record<string, unknown>;
};
export type Config = {
  languages: Language[];
  profiles: Profile[];
  settings: Settings;
  warnings: string[];
};
export type Snapshot = {
  player: Identity;
  players: Identity[];
  ready: boolean;
  items: MapItem[];
  selection: string[];
  room: Record<string, unknown>;
  sceneToken: string;
};
export const TELIKARI: Language = { version: 1, id: 'telikari-antiguo', name: 'Telikari antiguo' };
export const DEFAULT_SETTINGS: Settings = { version: 1, fontSize: 19, animate: true };
export const SAMPLE = {
  title: 'El arrepentimiento de Aurill',
  languageId: TELIKARI.id,
  text: '«Espero algún día puedas perdonarme, Iskaria, reina de los Telikari. Rogaste por clemencia, me entregaste sin dudar su más preciado tesoro, su arma más poderosa y peligrosa, y por culpa de mi ignorancia te traicioné.»',
  unreadable: '',
};
export function inscriptionId(objectId: string) {
  return `runa:${objectId}`;
}
/** Canonical identity belongs to the actual object; copied metadata never aliases its source. */
export function readInscription(item: MapItem): Inscription | null {
  const parsed = inscriptionSchema.safeParse(item.metadata[INSCRIPTION_KEY]);
  return parsed.success ? { ...parsed.data, id: inscriptionId(item.id), objectId: item.id } : null;
}
export function readConfig(room: Record<string, unknown>): Config {
  const warnings: string[] = [];
  const languages: Language[] = [];
  const profiles: Profile[] = [];
  for (const [key, value] of Object.entries(room)) {
    if (key.startsWith(LANGUAGE_PREFIX) && value !== null) {
      const p = languageSchema.safeParse(value);
      if (p.success && key === LANGUAGE_PREFIX + p.data.id) languages.push(p.data);
      else warnings.push('Hay un idioma inválido o de una versión no compatible.');
    }
    if (key.startsWith(PROFILE_PREFIX) && value !== null) {
      const p = profileSchema.safeParse(value);
      if (p.success && key === PROFILE_PREFIX + p.data.playerId) profiles.push(p.data);
      else warnings.push('Hay permisos inválidos; no se concederá lectura con esos datos.');
    }
  }
  if (!Object.hasOwn(room, LANGUAGE_PREFIX + TELIKARI.id)) languages.unshift(TELIKARI);
  const settings = settingsSchema.safeParse(room[SETTINGS_KEY]);
  if (room[SETTINGS_KEY] !== undefined && !settings.success)
    warnings.push('Configuración visual inválida; se usan valores predeterminados.');
  return {
    languages,
    profiles,
    settings: settings.success ? settings.data : DEFAULT_SETTINGS,
    warnings,
  };
}
export function canRead(player: Identity, inscription: Inscription, config: Config) {
  return (
    player.role === 'GM' ||
    (config.languages.some((l) => l.id === inscription.languageId) &&
      config.profiles.some(
        (p) => p.playerId === player.id && p.languageIds.includes(inscription.languageId),
      ))
  );
}
export function assertGM(player: Identity) {
  if (player.role !== 'GM') throw new Error('Solo el Dungeon Master puede realizar esta acción.');
}
const RUNES = Array.from('ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛟᛞ');
export function runes(text: string, seed: string): string {
  let hash = 2166136261;
  for (const c of seed) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return Array.from(text, (c) => {
    if (/\s/u.test(c)) return c;
    hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
    return RUNES[hash % RUNES.length];
  }).join('');
}
export function reading(player: Identity, inscription: Inscription, config: Config) {
  return canRead(player, inscription, config)
    ? inscription.text
    : inscription.unreadable?.trim() || runes(inscription.text, inscription.id);
}
