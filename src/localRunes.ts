import OBR, { type Item } from '@owlbear-rodeo/sdk';
import {
  LOCAL_RUNE_KEY,
  INSCRIPTION_KEY,
  readInscription,
  type MapItem,
  type Snapshot,
} from './domain';
import { canAccessItem, type LocalRuneRenderer } from './proximity';

function copyForPlayer(source: MapItem, playerId: string, id: string): Item {
  const copy = { ...structuredClone(source), id } as Item & { center?: unknown };
  delete copy.center;
  copy.name = 'Inscripción';
  copy.description = '';
  copy.visible = true;
  copy.locked = false;
  copy.disableHit = false;
  copy.createdUserId = playerId;
  copy.attachedTo = undefined;
  // Bounds centre is world-space; preserve an unattached rune's exact original image transform.
  copy.metadata = {
    [LOCAL_RUNE_KEY]: source.id,
    [INSCRIPTION_KEY]: source.metadata[INSCRIPTION_KEY],
  };
  return copy;
}
function visualSignature(item: Item) {
  const visual = { ...item } as Record<string, unknown>;
  delete visual.id;
  delete visual.lastModified;
  delete visual.lastModifiedUserId;
  const stable = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => [k, stable(v)]),
          )
        : value;
  return JSON.stringify(stable(visual));
}
export class OwlbearLocalRunes implements LocalRuneRenderer {
  subscribe(listener: () => void) {
    return OBR.scene.local.onChange(listener);
  }
  async clear() {
    if (!(await OBR.scene.isReady())) return;
    const copies = await OBR.scene.local.getItems(
      (item) => typeof item.metadata[LOCAL_RUNE_KEY] === 'string',
    );
    if (copies.length) await OBR.scene.local.deleteItems(copies.map((item) => item.id));
  }
  async reconcile(snapshot: Snapshot, current: () => boolean) {
    if (!snapshot.ready || !current()) return;
    const desired = new Map(
      snapshot.player.role === 'GM'
        ? []
        : snapshot.items
            .filter(
              (item) =>
                item.type === 'IMAGE' &&
                !item.metadata[LOCAL_RUNE_KEY] &&
                (readInscription(item)?.proximity || readInscription(item)?.visibility) &&
                canAccessItem(snapshot, item),
            )
            .map((item) => [item.id, item]),
    );
    const copies = await OBR.scene.local.getItems(
      (item) => typeof item.metadata[LOCAL_RUNE_KEY] === 'string',
    );
    if (!current()) return;
    const remove: string[] = [];
    const updates = new Map<string, Item>();
    for (const copy of copies) {
      const source = desired.get(copy.metadata[LOCAL_RUNE_KEY] as string);
      if (!source) {
        remove.push(copy.id);
        continue;
      }
      desired.delete(source.id);
      const next = copyForPlayer(source, snapshot.player.id, copy.id);
      if (visualSignature(copy) !== visualSignature(next)) updates.set(copy.id, next);
    }
    if (remove.length && current()) await OBR.scene.local.deleteItems(remove);
    if (updates.size && current())
      await OBR.scene.local.updateItems([...updates.keys()], (draft) => {
        for (const item of draft) {
          const next = updates.get(item.id)!;
          for (const [key, value] of Object.entries(next)) {
            if (key === 'id' || key === 'lastModified' || key === 'lastModifiedUserId') continue;
            Object.assign(item, { [key]: value });
          }
        }
      });
    if (desired.size && current())
      await OBR.scene.local.addItems(
        [...desired.values()].map((source) =>
          copyForPlayer(source, snapshot.player.id, crypto.randomUUID()),
        ),
      );
    if (!current()) await this.clear();
  }
}
