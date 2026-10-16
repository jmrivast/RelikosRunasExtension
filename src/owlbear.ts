import OBR from '@owlbear-rodeo/sdk';
import type { Adapter, Navigation } from './adapter';
import {
  assertGM,
  INSCRIPTION_KEY,
  TOKEN_PLAYER_KEY,
  LOCAL_RUNE_KEY,
  NS,
  readInscription,
  restoredVisibility,
  type Inscription,
  type Snapshot,
} from './domain';
import { canAccessItem, isCharacterToken, tokenPlayer } from './proximity';
export const MODAL_ID = `${NS}/modal`;
export class OwlbearAdapter implements Adapter {
  demo = false;
  private epoch = 0;
  private stopEpoch: (() => void) | undefined;
  private readyListeners = new Set<() => void>();
  private disposed = false;
  dispose() {
    this.disposed = true;
    this.stopEpoch?.();
    this.readyListeners.clear();
  }
  async ready(): Promise<void> {
    if (!OBR.isReady)
      await new Promise<void>((resolve) => {
        OBR.onReady(resolve);
      });
    if (!this.stopEpoch && !this.disposed)
      this.stopEpoch = OBR.scene.onReadyChange(() => {
        this.epoch++;
        this.readyListeners.forEach((fn) => fn());
      });
  }
  async snapshot(): Promise<Snapshot> {
    const epoch = this.epoch;
    const [id, name, role, players, ready, selection, room] = await Promise.all([
      OBR.player.getId(),
      OBR.player.getName(),
      OBR.player.getRole(),
      OBR.party.getPlayers(),
      OBR.scene.isReady(),
      OBR.player.getSelection(),
      OBR.room.getMetadata(),
    ]);
    const items = ready ? await OBR.scene.items.getItems() : [];
    let grid: Snapshot['grid'];
    const centres = new Map<string, { x: number; y: number }>();
    if (ready && items.some((item) => readInscription(item)?.proximity)) {
      const [dpi, scale] = await Promise.all([OBR.scene.grid.getDpi(), OBR.scene.grid.getScale()]);
      const unit = scale.parsed.unit.toLowerCase().trim();
      const conversion = ['ft', 'feet', 'foot', 'pies', 'pie', "'"].includes(unit)
        ? 1
        : ['m', 'meter', 'meters', 'metre', 'metres', 'metro', 'metros'].includes(unit)
          ? 1 / 0.3048
          : NaN;
      grid = { dpi, feetPerCell: scale.parsed.multiplier * conversion };
      await Promise.all(
        items
          .filter((item) => readInscription(item)?.proximity || tokenPlayer(item))
          .map(async (item) => {
            const bounds = await OBR.scene.items.getItemBounds([item.id]);
            centres.set(item.id, bounds.center);
          }),
      );
    }
    if (epoch !== this.epoch) return this.snapshot();
    return {
      roomId: OBR.room.id,
      player: { id, name, role },
      players: [
        ...new Map(
          [{ id, name, role }, ...players].map((p) => [
            p.id,
            { id: p.id, name: p.name, role: p.role },
          ]),
        ).values(),
      ],
      ready,
      selection: selection ?? [],
      room,
      items: items.map((item) => ({ ...item, center: centres.get(item.id) })),
      grid,
      sceneToken: String(epoch),
    };
  }
  subscribe(listener: () => void) {
    this.readyListeners.add(listener);
    const stops = [
      OBR.player.onChange(listener),
      OBR.party.onChange(listener),
      OBR.room.onMetadataChange(listener),
      OBR.scene.items.onChange(listener),
      OBR.scene.grid.onChange(listener),
    ];
    return () => {
      this.readyListeners.delete(listener);
      stops.forEach((stop) => stop());
    };
  }
  async patchRoom(patch: Record<string, unknown>) {
    assertGM({ id: '', name: '', role: await OBR.player.getRole() });
    await OBR.room.setMetadata(patch);
  }
  async putInscription(itemId: string, value: Inscription | null, sceneToken: string) {
    assertGM({ id: '', name: '', role: await OBR.player.getRole() });
    if (!(await OBR.scene.isReady()) || sceneToken !== String(this.epoch))
      throw new Error('La escena cambió. Abre de nuevo el editor.');
    const items = await OBR.scene.items.getItems([itemId]);
    if (!items.length) throw new Error('El objeto ya no existe.');
    if (sceneToken !== String(this.epoch)) throw new Error('La escena cambió.');
    await OBR.scene.items.updateItems([itemId], (draft) => {
      if (sceneToken !== String(this.epoch)) throw new Error('La escena cambió.');
      for (const item of draft) {
        const previous = readInscription(item);
        if (value) {
          item.metadata[INSCRIPTION_KEY] = value;
          if (value.proximity || value.visibility) item.visible = false;
          else if (restoredVisibility(previous) !== undefined)
            item.visible = restoredVisibility(previous)!;
        } else {
          delete item.metadata[INSCRIPTION_KEY];
          if (restoredVisibility(previous) !== undefined)
            item.visible = restoredVisibility(previous)!;
        }
      }
    });
  }
  async assignToken(playerId: string, itemId: string | null, sceneToken: string) {
    const snapshot = await this.snapshot();
    assertGM(snapshot.player);
    if (!snapshot.ready || snapshot.sceneToken !== sceneToken) throw new Error('La escena cambió.');
    const target = snapshot.items.find((item) => item.id === itemId);
    if (itemId && (!target || !isCharacterToken(target)))
      throw new Error('Selecciona un token de personaje de esta escena.');
    if (target && tokenPlayer(target) && tokenPlayer(target) !== playerId)
      throw new Error('Ese token ya pertenece a otro jugador en Relikos.');
    const ids = snapshot.items
      .filter((item) => tokenPlayer(item) === playerId || item.id === itemId)
      .map((item) => item.id);
    if (!ids.length) return;
    await OBR.scene.items.updateItems(ids, (draft) => {
      if (sceneToken !== String(this.epoch)) throw new Error('La escena cambió.');
      for (const item of draft) {
        if (item.id === itemId) item.metadata[TOKEN_PLAYER_KEY] = playerId;
        else delete item.metadata[TOKEN_PLAYER_KEY];
      }
    });
  }
  async selected() {
    return (await OBR.player.getSelection()) ?? [];
  }
  async open({ view, itemId }: Navigation) {
    if (view === 'read') {
      const snapshot = await this.snapshot();
      const item = snapshot.items.find((i) => i.id === itemId && !i.metadata[LOCAL_RUNE_KEY]);
      if (!item || !readInscription(item) || !canAccessItem(snapshot, item))
        throw new Error('La inscripción no está disponible desde tu posición.');
    }
    const height = await OBR.viewport.getHeight();
    await OBR.modal.open({
      id: MODAL_ID,
      url: `/index.html?view=${view}&item=${encodeURIComponent(itemId)}`,
      width: 600,
      height: Math.min(780, Math.max(300, height - 32)),
      hidePaper: true,
    });
  }
  async close() {
    await OBR.modal.close(MODAL_ID);
  }
}
