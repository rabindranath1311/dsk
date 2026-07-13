import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, ScreenData } from './model.js';

export function upsertScreen(store: NodeStore, name: string, data: ScreenData, body?: string): Node {
  const existing = store.byName('screen', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'screen',
    name,
    level: null,
    data,
    body: body ?? existing?.body ?? null,
    origin: existing?.origin ?? 'client',
    created: existing?.created ?? now,
    updated: now,
  };
  store.upsert(node);
  return node;
}

export interface ScreenEntry {
  name: string;
  data: ScreenData;
}

export function listScreens(store: NodeStore): ScreenEntry[] {
  return store
    .list('screen')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: (n.data ?? {}) as ScreenData }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getScreen(store: NodeStore, name: string): ScreenEntry | undefined {
  const n = store.byName('screen', name);
  if (!n || typeof n.name !== 'string') return undefined;
  return { name: n.name, data: (n.data ?? {}) as ScreenData };
}
