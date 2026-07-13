import type { NodeStore } from './store.js';
import { listComponents } from './components.js';
import { listTokens } from './tokens.js';
import { listPatterns } from './patterns.js';

export interface SearchHit {
  kind: string;
  name: string;
  summary: string;
}

/** Keyword search across components, tokens, and patterns. */
export function search(store: NodeStore, query: string, limit = 12): SearchHit[] {
  const q = query.toLowerCase();
  const hits: SearchHit[] = [];

  for (const c of listComponents(store)) {
    if (matches(q, c.name, c.data.usage?.when, (c.data.intents ?? []).join(' '))) {
      hits.push({ kind: 'component', name: c.name, summary: c.data.usage?.when ?? '' });
    }
  }
  for (const { path, token } of listTokens(store)) {
    if (matches(q, path, String(token.$value))) {
      hits.push({ kind: 'token', name: path, summary: `${token.$value} (${token.$type})` });
    }
  }
  for (const p of listPatterns(store)) {
    if (matches(q, p.name, p.data.problem)) {
      hits.push({ kind: 'pattern', name: p.name, summary: p.data.problem });
    }
  }
  return hits.slice(0, limit);
}

function matches(q: string, ...fields: (string | undefined)[]): boolean {
  return fields.some((f) => f != null && f.toLowerCase().includes(q));
}
