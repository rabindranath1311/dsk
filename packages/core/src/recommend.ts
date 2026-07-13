import type { NodeStore } from './store.js';
import { listComponents } from './components.js';

export interface Recommendation {
  component: string;
  level: string | null;
  score: number;
  why: string;
}

/**
 * Rank components for a free-text problem/intent. M1 uses keyword overlap over
 * the component's name + intents + "use when". This backs the MCP
 * `recommend_component` tool in M2.
 */
export function recommend(store: NodeStore, query: string, limit = 5): Recommendation[] {
  const words = tokenize(query);
  if (words.length === 0) return [];
  return listComponents(store)
    .map((c) => {
      const hay = tokenize([c.name, ...(c.data.intents ?? []), c.data.usage?.when ?? ''].join(' '));
      const score = words.filter((w) => hay.includes(w)).length;
      const matchedIntents = (c.data.intents ?? []).filter((i) => words.some((w) => i.includes(w)));
      const why = matchedIntents.length ? `intent: ${matchedIntents.join(', ')}` : c.data.usage?.when ?? '';
      return { component: c.name, level: c.level, score, why };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.component.localeCompare(b.component))
    .slice(0, limit);
}

export interface IntentMap {
  intent: string;
  components: string[];
}

/** The decision index: intent → the components that serve it. */
export function buildDecisionIndex(store: NodeStore): IntentMap[] {
  const map = new Map<string, string[]>();
  for (const c of listComponents(store)) {
    for (const intent of c.data.intents ?? []) {
      const arr = map.get(intent) ?? (map.set(intent, []).get(intent) as string[]);
      arr.push(c.name);
    }
  }
  return [...map]
    .map(([intent, components]) => ({ intent, components }))
    .sort((a, b) => a.intent.localeCompare(b.intent));
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}
