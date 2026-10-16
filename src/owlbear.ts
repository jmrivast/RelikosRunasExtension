import OBR from '@owlbear-rodeo/sdk';
import type { Adapter, Navigation } from './adapter';
import { assertGM, INSCRIPTION_KEY, NS, type Inscription, type Snapshot } from './domain';
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
      items,
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
        if (value) item.metadata[INSCRIPTION_KEY] = value;
        else delete item.metadata[INSCRIPTION_KEY];
      }
    });
  }
  async selected() {
    return (await OBR.player.getSelection()) ?? [];
  }
  async open({ view, itemId }: Navigation) {
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
