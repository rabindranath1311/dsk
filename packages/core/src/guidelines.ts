import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, GuidelineData } from './model.js';

export function upsertGuideline(store: NodeStore, name: string, data: GuidelineData, body?: string): Node {
  const existing = store.byName('guideline', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'guideline',
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

export interface GuidelineEntry {
  name: string;
  data: GuidelineData;
}

export function listGuidelines(store: NodeStore): GuidelineEntry[] {
  return store
    .list('guideline')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: n.data as GuidelineData }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
