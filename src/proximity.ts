import {
  LOCAL_RUNE_KEY,
  TOKEN_PLAYER_KEY,
  readInscription,
  type MapItem,
  type Snapshot,
} from './domain';
import type { Adapter } from './adapter';

export function isCharacterToken(item: MapItem) {
  return item.type === 'IMAGE' && item.layer === 'CHARACTER' && !item.metadata[LOCAL_RUNE_KEY];
}
export function tokenPlayer(item: MapItem) {
  const value = item.metadata[TOKEN_PLAYER_KEY];
  return typeof value === 'string' ? value : null;
}
/** Straight-line radius, using world-space item centres and the scene's real scale. */
export function withinReach(snapshot: Snapshot, rune: MapItem) {
  const rule = readInscription(rune)?.proximity;
  const grid = snapshot.grid;
  const anchor = rune.center ?? rune.position;
  if (
    !snapshot.ready ||
    !rule ||
    !anchor ||
    !grid ||
    !Number.isFinite(grid.dpi) ||
    grid.dpi <= 0 ||
    !Number.isFinite(grid.feetPerCell) ||
    grid.feetPerCell <= 0
  )
    return false;
  return snapshot.items.some((token) => {
    const centre = token.center ?? token.position;
    if (
      !isCharacterToken(token) ||
      !token.visible ||
      tokenPlayer(token) !== snapshot.player.id ||
      !centre
    )
      return false;
    const feet =
      (Math.hypot(centre.x - anchor.x, centre.y - anchor.y) / grid.dpi) * grid.feetPerCell;
    return Number.isFinite(feet) && feet < rule.radiusFeet;
  });
}
export function canAccessItem(snapshot: Snapshot, item: MapItem) {
  if (!snapshot.ready) return false;
  if (snapshot.player.role === 'GM') return true;
  return readInscription(item)?.proximity ? withinReach(snapshot, item) : item.visible;
}
export function sourceId(item: MapItem) {
  const source = item.metadata[LOCAL_RUNE_KEY];
  return typeof source === 'string' ? source : item.id;
}

export interface LocalRuneRenderer {
  reconcile(snapshot: Snapshot, current: () => boolean): Promise<void>;
  clear(): Promise<void>;
  subscribe(listener: () => void): () => void;
}
/** Coalesce bursts; serialize writes and invalidate work immediately on movement/scene changes. */
export function startProximity(
  adapter: Adapter,
  local: LocalRuneRenderer,
  onError: (error: unknown) => void,
) {
  let disposed = false;
  let revision = 0;
  let running = false;
  let pending = false;
  let reported = false;
  const refresh = (invalidate = true) => {
    // Our own local writes also emit onChange. They schedule a fresh comparison,
    // but must not invalidate the snapshot that just produced the valid copy.
    if (invalidate) revision++;
    pending = true;
    if (running || disposed) return;
    running = true;
    void (async () => {
      try {
        while (pending && !disposed) {
          pending = false;
          const captured = revision;
          const snapshot = await adapter.snapshot();
          if (disposed || captured !== revision) continue;
          await local.reconcile(snapshot, () => !disposed && captured === revision);
          reported = false;
        }
      } catch (error) {
        await local.clear().catch(() => {});
        if (!disposed && !reported) {
          reported = true;
          onError(error);
        }
      } finally {
        running = false;
        if (pending && !disposed) refresh(false);
      }
    })();
  };
  const stops = [adapter.subscribe(() => refresh()), local.subscribe(() => refresh(false))];
  refresh();
  return () => {
    disposed = true;
    revision++;
    stops.forEach((stop) => stop());
    return local.clear();
  };
}
