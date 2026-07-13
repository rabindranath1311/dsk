import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, DocData } from './model.js';

/**
 * Docs are the data layer: PRDs, brand refs, research notes — the grounding an
 * agent reads. The name is the doc's stable identity; the body is its content
 * (markdown/text); `data` carries a type and tags for organisation.
 */
export function upsertDoc(store: NodeStore, name: string, data: DocData, body?: string): Node {
  const existing = store.byName('doc', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'doc',
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

export interface DocEntry {
  name: string;
  data: DocData;
  body: string | null;
  updated: string;
}

export function listDocs(store: NodeStore): DocEntry[] {
  return store
    .list('doc')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, data: (n.data ?? {}) as DocData, body: n.body, updated: n.updated }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getDoc(store: NodeStore, name: string): DocEntry | undefined {
  const n = store.byName('doc', name);
  if (!n || typeof n.name !== 'string') return undefined;
  return { name: n.name, data: (n.data ?? {}) as DocData, body: n.body, updated: n.updated };
}

export function deleteDoc(store: NodeStore, name: string): boolean {
  const n = store.byName('doc', name);
  if (!n) return false;
  store.delete(n.id);
  return true;
}
