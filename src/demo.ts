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
  type Snapshot,
  type Inscription,
  type Identity,
  type MapItem,
} from './domain';
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
          metadata: { 'other.extension/value': 42 },
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
    if (value) item.metadata[INSCRIPTION_KEY] = value;
    else delete item.metadata[INSCRIPTION_KEY];
    this.write(s);
  }
  async selected() {
    return this.selection;
  }
  async open(value: Navigation) {
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
