import { describe, it, expect } from 'vitest';
import {
  Store,
  applySeed,
  tokenImpact,
  componentUsage,
  buildFeaturePrompt,
  listFlows,
  listScreens,
} from '@dsk/core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const seed = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../../examples/seed.acme.json', import.meta.url)), 'utf8'),
);

function seeded(): Store {
  const store = new Store(':memory:');
  applySeed(store, seed);
  return store;
}

describe('M4 — screens, flows, graph, feature prompt', () => {
  it('loads screens and flows from the seed', () => {
    const store = seeded();
    expect(listScreens(store).map((s) => s.name)).toContain('Settings');
    const flow = listFlows(store).find((f) => f.name === 'Delete account');
    expect(flow?.data.nodes.length).toBe(3);
    expect(flow?.data.edges.length).toBe(3);
  });

  it('tokenImpact finds components that use a token', () => {
    const store = seeded();
    expect(tokenImpact(store, 'color.brand.primary')).toContain('Button');
  });

  it('componentUsage finds screens and patterns using a component', () => {
    const store = seeded();
    const usage = componentUsage(store, 'ConfirmDialog');
    expect(usage.screens).toContain('Delete account dialog');
    expect(usage.patterns).toContain('Destructive confirmation');
  });

  it('buildFeaturePrompt assembles tokens + components + flow + guidelines', () => {
    const store = seeded();
    const prompt = buildFeaturePrompt(store, {
      intent: 'delete account',
      components: ['Button', 'ConfirmDialog'],
      screens: ['Settings'],
      flow: 'Delete account',
    });
    expect(prompt).toContain('# Feature: delete account');
    expect(prompt).toContain('## Tokens to honor');
    expect(prompt).toContain('`color.brand.primary`');
    expect(prompt).toContain('### ConfirmDialog');
    expect(prompt).toContain('## Flow: Delete account');
    expect(prompt).toContain('Settings → Confirm dialog');
    expect(prompt).toContain('## Guidelines to follow');
  });
});
