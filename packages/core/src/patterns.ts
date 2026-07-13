import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, PatternData } from './model.js';

export function upsertPattern(store: NodeStore, name: string, data: PatternData, body?: string): Node {
  const existing = store.byName('pattern', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'pattern',
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

export interface PatternEntry {
  name: string;
  data: PatternData;
}

export function listPatterns(store: NodeStore): PatternEntry[] {
  return store
    .list('pattern')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: n.data as PatternData }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
