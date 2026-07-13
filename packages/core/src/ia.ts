import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, FlowData } from './model.js';

/**
 * Information architecture = an app-map node graph. It is the SAME graph shape
 * as a flow (nodes/edges/sections) — the difference is purely presentational:
 * IA connectors carry no trigger/outcome annotations. Kept as its own kind so
 * app maps and user flows live in separate lists.
 */
export function upsertIA(store: NodeStore, name: string, data: FlowData, body?: string): Node {
  const existing = store.byName('ia', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'ia',
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

export interface IAEntry {
  name: string;
  data: FlowData;
}

export function listIA(store: NodeStore): IAEntry[] {
  return store
    .list('ia')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: (n.data ?? { nodes: [], edges: [] }) as FlowData }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getIA(store: NodeStore, name: string): IAEntry | undefined {
  const n = store.byName('ia', name);
  if (!n || typeof n.name !== 'string') return undefined;
  return { name: n.name, data: (n.data ?? { nodes: [], edges: [] }) as FlowData };
}

export function deleteIA(store: NodeStore, name: string): boolean {
  const n = store.byName('ia', name);
  if (!n) return false;
  store.delete(n.id);
  return true;
}
