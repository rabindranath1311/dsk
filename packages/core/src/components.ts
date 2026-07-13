import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, Level, ComponentData } from './model.js';

export interface NewComponentInput extends ComponentData {
  name: string;
  level?: Level;
  body?: string;
}

/** Create or update a component by name. Usage fields merge; others replace. */
export function upsertComponent(store: NodeStore, input: NewComponentInput): Node {
  const { name, level, body, ...data } = input;
  const existing = store.byName('component', name);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'component',
    name,
    level: level ?? existing?.level ?? null,
    data: mergeComponentData(existing?.data as ComponentData | undefined, data),
    body: body ?? existing?.body ?? null,
    origin: existing?.origin ?? 'client',
    created: existing?.created ?? now,
    updated: now,
  };
  store.upsert(node);
  return node;
}

function mergeComponentData(prev: ComponentData | undefined, next: ComponentData): ComponentData {
  return {
    ...(prev ?? {}),
    ...next,
    usage: { ...(prev?.usage ?? {}), ...(next.usage ?? {}) },
  };
}

export interface ComponentEntry {
  name: string;
  level: Level | null;
  data: ComponentData;
  /** the exact-use-cases prose; populated by getComponent, omitted from lists */
  body?: string | null;
}

const LEVEL_ORDER: Record<string, number> = { atom: 0, molecule: 1, organism: 2, template: 3 };
function levelRank(level: Level | null): number {
  return level ? (LEVEL_ORDER[level] ?? 9) : 9;
}

export function listComponents(store: NodeStore): ComponentEntry[] {
  return store
    .list('component')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ name: n.name, level: n.level, data: (n.data ?? {}) as ComponentData, body: n.body }))
    .sort((a, b) => levelRank(a.level) - levelRank(b.level) || a.name.localeCompare(b.name));
}

export function getComponent(store: NodeStore, name: string): ComponentEntry | undefined {
  const n = store.byName('component', name);
  if (!n || typeof n.name !== 'string') return undefined;
  return { name: n.name, level: n.level, data: (n.data ?? {}) as ComponentData, body: n.body };
}

export function deleteComponent(store: NodeStore, name: string): boolean {
  const n = store.byName('component', name);
  if (!n) return false;
  store.delete(n.id);
  return true;
}
