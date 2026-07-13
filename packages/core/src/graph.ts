import type { NodeStore } from './store.js';
import { listComponents } from './components.js';
import { listScreens } from './screens.js';
import { listPatterns } from './patterns.js';

/** Which components consume a given token — "what breaks if I change this token?". */
export function tokenImpact(store: NodeStore, tokenPath: string): string[] {
  return listComponents(store)
    .filter((c) => (c.data.tokensUsed ?? []).includes(tokenPath))
    .map((c) => c.name);
}

export interface ComponentUsageGraph {
  screens: string[];
  patterns: string[];
}

/** Where a component is used — screens it appears on and patterns it composes. */
export function componentUsage(store: NodeStore, name: string): ComponentUsageGraph {
  const screens = listScreens(store)
    .filter((s) => (s.data.components ?? []).includes(name))
    .map((s) => s.name);
  const patterns = listPatterns(store)
    .filter((p) => (p.data.componentsUsed ?? []).includes(name))
    .map((p) => p.name);
  return { screens, patterns };
}
