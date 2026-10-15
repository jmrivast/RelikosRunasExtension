import type { Inscription, MapItem, Snapshot } from './domain';
export type Navigation = { view: 'read' | 'edit'; itemId: string };
export interface Adapter {
  ready(): Promise<void>;
  snapshot(): Promise<Snapshot>;
  subscribe(listener: () => void): () => void;
  patchRoom(patch: Record<string, unknown>): Promise<void>;
  putInscription(itemId: string, value: Inscription | null, sceneToken: string): Promise<void>;
  selected(): Promise<string[]>;
  open(view: Navigation): Promise<void>;
  close(): Promise<void>;
  demo: boolean;
}
export function visibleItems(items: MapItem[], role: Snapshot['player']['role']) {
  return items.filter((i) => role === 'GM' || i.visible);
}
