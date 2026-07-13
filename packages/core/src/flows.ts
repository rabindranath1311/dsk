import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, FlowData } from './model.js';

export function upsertFlow(store: NodeStore, name: string, data: FlowData, body?: string): Node {
  const existing = store.byName('flow', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'flow',
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

export interface FlowEntry {
  name: string;
  data: FlowData;
}

export function listFlows(store: NodeStore): FlowEntry[] {
  return store
    .list('flow')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: (n.data ?? { nodes: [], edges: [] }) as FlowData }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getFlow(store: NodeStore, name: string): FlowEntry | undefined {
  const n = store.byName('flow', name);
  if (!n || typeof n.name !== 'string') return undefined;
  return { name: n.name, data: (n.data ?? { nodes: [], edges: [] }) as FlowData };
}
