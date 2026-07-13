import type { NodeStore } from './store.js';
import type {
  ComponentData,
  FlowData,
  GuidelineData,
  Level,
  PatternData,
  ScreenData,
  TokenType,
} from './model.js';
import { setToken } from './tokens.js';
import { upsertComponent } from './components.js';
import { upsertPattern } from './patterns.js';
import { upsertGuideline } from './guidelines.js';
import { upsertScreen } from './screens.js';
import { upsertFlow } from './flows.js';

type TokenSeed = string | { value: string; type?: TokenType; description?: string };

export interface Seed {
  tokens?: Record<string, TokenSeed>;
  components?: (ComponentData & { name: string; level?: Level; body?: string })[];
  patterns?: (PatternData & { name: string; body?: string })[];
  guidelines?: (GuidelineData & { name: string; body?: string })[];
  screens?: (ScreenData & { name: string; body?: string })[];
  flows?: (FlowData & { name: string; body?: string })[];
}

export interface SeedResult {
  tokens: number;
  components: number;
  patterns: number;
  guidelines: number;
  screens: number;
  flows: number;
}

/** Apply a structured seed to the store — the same path an agent uses to author. */
export function applySeed(store: NodeStore, seed: Seed): SeedResult {
  const r: SeedResult = { tokens: 0, components: 0, patterns: 0, guidelines: 0, screens: 0, flows: 0 };

  for (const [path, v] of Object.entries(seed.tokens ?? {})) {
    if (typeof v === 'string') setToken(store, path, v);
    else setToken(store, path, v.value, { type: v.type, description: v.description });
    r.tokens++;
  }
  for (const c of seed.components ?? []) {
    upsertComponent(store, c);
    r.components++;
  }
  for (const p of seed.patterns ?? []) {
    const { name, body, ...data } = p;
    upsertPattern(store, name, data, body);
    r.patterns++;
  }
  for (const g of seed.guidelines ?? []) {
    const { name, body, ...data } = g;
    upsertGuideline(store, name, data, body);
    r.guidelines++;
  }
  for (const s of seed.screens ?? []) {
    const { name, body, ...data } = s;
    upsertScreen(store, name, data, body);
    r.screens++;
  }
  for (const f of seed.flows ?? []) {
    const { name, body, ...data } = f;
    upsertFlow(store, name, data, body);
    r.flows++;
  }
  return r;
}
