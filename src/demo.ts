import type { Adapter, Navigation } from './adapter';
import {
  assertGM,
  NS,
  INSCRIPTION_KEY,
  LANGUAGE_PREFIX,
  PROFILE_PREFIX,
  TELIKARI,
  SAMPLE,
  inscriptionId,
  TOKEN_PLAYER_KEY,
  readInscription,
  restoredVisibility,
  type Snapshot,
  type Inscription,
  type Identity,
  type MapItem,
} from './domain';
import { canAccessItem, isCharacterToken, tokenPlayer } from './proximity';
const KEY = `${NS}/demo-v1`;
const CHANGE = 'relikos:demo-change';
export const DEMO_PLAYERS: Identity[] = [
  { id: 'demo-dm', name: 'Dungeon Master', role: 'GM' },
  { id: 'demo-basili', name: 'Jugador de Basili', role: 'PLAYER' },
  { id: 'demo-other', name: 'Otro jugador', role: 'PLAYER' },
];
type Store = { room: Record<string, unknown>; scenes: Record<string, MapItem[]> };
function initial(): Store {
  return {
    room: {
      [LANGUAGE_PREFIX + TELIKARI.id]: TELIKARI,
      [PROFILE_PREFIX + 'demo-basili']: {
        version: 1,
        playerId: 'demo-basili',
        displayName: 'Jugador de Basili',
        character: 'Basili',
        languageIds: [TELIKARI.id],
      },
    },
    scenes: {
      a: [
        {
          id: 'rune-aurill',
          name: 'Runa en la pared',
          visible: true,
          type: 'IMAGE',
          layer: 'PROP',
          position: { x: 0, y: 0 },
          metadata: {
            [INSCRIPTION_KEY]: {
              ...SAMPLE,
              version: 1,
              id: inscriptionId('rune-aurill'),
              objectId: 'rune-aurill',
            },
          },
        },
        {
          id: 'rune-blank',
          name: 'Runa sin configurar',
          visible: true,
          type: 'IMAGE',
          layer: 'PROP',
          position: { x: 400, y: 0 },
          metadata: { 'other.extension/value': 42 },
        },
        {
          id: 'token-basili',
          name: 'Basili',
          type: 'IMAGE',
          layer: 'CHARACTER',
          visible: true,
          position: { x: 400, y: 0 },
          metadata: {},
        },
        {
          id: 'token-other',
          name: 'Otro personaje',
          type: 'IMAGE',
          layer: 'CHARACTER',
          visible: true,
          position: { x: 600, y: 0 },
          metadata: {},
        },
      ],
      b: [],
    },
  };
}
export class DemoAdapter implements Adapter {
  demo = true;
  private scene = 'a';
  private loaded = true;
  private selection = ['rune-blank'];
  private connected = DEMO_PLAYERS.map((p) => p.id);
  private actor: Identity;
  private navigate: (value: Navigation | null) => void = () => {};
  constructor(actorId: string) {
    this.actor = DEMO_PLAYERS.find((p) => p.id === actorId) ?? DEMO_PLAYERS[0];
    if (!localStorage.getItem(KEY)) this.write(initial());
  }
  onNavigate(fn: (value: Navigation | null) => void) {
    this.navigate = fn;
  }
  async ready() {}
  private read(): Store {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : initial();
  }
  private write(value: Store) {
    localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE));
  }
  async snapshot(): Promise<Snapshot> {
    const s = this.read();
    return {
      roomId: 'demo-room',
      player: this.actor,
      players: DEMO_PLAYERS.filter((p) => this.connected.includes(p.id)),
      ready: this.loaded,
      items: this.loaded ? s.scenes[this.scene] : [],
      selection: this.selection,
      room: s.room,
      sceneToken: this.scene,
      grid: { dpi: 100, feetPerCell: 5 },
    };
  }
  subscribe(listener: () => void) {
    window.addEventListener(CHANGE, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(CHANGE, listener);
      window.removeEventListener('storage', listener);
    };
  }
  async patchRoom(patch: Record<string, unknown>) {
    assertGM(this.actor);
    const s = this.read();
    this.write({ ...s, room: { ...s.room, ...patch } });
  }
  async putInscription(itemId: string, value: Inscription | null, sceneToken: string) {
    assertGM(this.actor);
    if (!this.loaded || sceneToken !== this.scene) throw new Error('La escena cambió.');
    const s = this.read();
    const item = s.scenes[this.scene].find((i) => i.id === itemId);
    if (!item) throw new Error('El objeto ya no existe.');
    const previous = readInscription(item);
    if (value) {
      item.metadata[INSCRIPTION_KEY] = value;
      if (value.proximity || value.visibility) item.visible = false;
      else if (restoredVisibility(previous) !== undefined)
        item.visible = restoredVisibility(previous)!;
    } else {
      delete item.metadata[INSCRIPTION_KEY];
      if (restoredVisibility(previous) !== undefined) item.visible = restoredVisibility(previous)!;
    }
    this.write(s);
  }
  async assignToken(playerId: string, itemId: string | null, sceneToken: string) {
    assertGM(this.actor);
    if (!this.loaded || sceneToken !== this.scene) throw new Error('La escena cambió.');
    const store = this.read();
    const target = store.scenes[this.scene].find((item) => item.id === itemId);
    if (itemId && (!target || !isCharacterToken(target)))
      throw new Error('Selecciona un token de personaje.');
    if (target && tokenPlayer(target) && tokenPlayer(target) !== playerId)
      throw new Error('Ese token ya pertenece a otro jugador.');
    for (const item of store.scenes[this.scene]) {
      if (item.id === itemId) item.metadata[TOKEN_PLAYER_KEY] = playerId;
      else if (tokenPlayer(item) === playerId) delete item.metadata[TOKEN_PLAYER_KEY];
    }
    this.write(store);
  }
  moveToken(itemId: string, feet: number) {
    assertGM(this.actor);
    const store = this.read();
    const item = store.scenes[this.scene].find((item) => item.id === itemId);
    if (!item || !isCharacterToken(item)) throw new Error('Token no disponible.');
    item.position = { x: feet * 20, y: 0 };
    this.write(store);
  }
  async selected() {
    return this.selection;
  }
  async open(value: Navigation) {
    if (value.view === 'read') {
      const snapshot = await this.snapshot();
      const item = snapshot.items.find((item) => item.id === value.itemId);
      if (!item || !readInscription(item) || !canAccessItem(snapshot, item))
        throw new Error('La inscripción no está disponible desde tu posición.');
    }
    this.navigate(value);
  }
  async close() {
    this.navigate(null);
  }
  setScene(value: string) {
    this.loaded = value !== 'none';
    this.scene = value === 'b' ? 'b' : 'a';
    window.dispatchEvent(new Event(CHANGE));
  }
  toggleBasili() {
    this.connected = this.connected.includes('demo-basili')
      ? this.connected.filter((id) => id !== 'demo-basili')
      : [...this.connected, 'demo-basili'];
    window.dispatchEvent(new Event(CHANGE));
  }
  reset() {
    assertGM(this.actor);
    this.write(initial());
  }
  duplicate() {
    assertGM(this.actor);
    const s = this.read();
    const item = s.scenes[this.scene][0];
    if (item)
      s.scenes[this.scene].push({
        ...structuredClone(item),
        id: crypto.randomUUID(),
        name: 'Copia de runa',
      });
    this.write(s);
  }
  deleteObject() {
    assertGM(this.actor);
    const s = this.read();
    s.scenes[this.scene] = s.scenes[this.scene].filter((i) => i.id !== 'rune-aurill');
    this.write(s);
  }
}
