import { describe, it, expect } from 'vitest';
import {
  Store,
  upsertComponent,
  getComponent,
  upsertGuideline,
  recommend,
  buildDecisionIndex,
  buildDesignMd,
  buildSkill,
} from '@dsk/core';

function seeded(): Store {
  const store = new Store(':memory:');
  upsertComponent(store, {
    name: 'Button',
    level: 'atom',
    intents: ['submit-form', 'primary-action'],
    tokensUsed: ['color.brand.primary'],
    usage: {
      when: 'Commit an action on the current view.',
      whenNot: 'Navigation — use Link.',
      alternatives: [{ use: 'Link', when: 'navigating' }],
      a11y: '44px target.',
    },
  });
  upsertComponent(store, {
    name: 'Link',
    level: 'atom',
    intents: ['navigate'],
    usage: { when: 'Navigate to another page.' },
  });
  upsertGuideline(store, 'One primary', { rule: 'At most one primary Button per region.', governs: ['Button'] });
  return store;
}

describe('components + definition layer', () => {
  it('merges usage on update, preserves the rest', () => {
    const store = seeded();
    upsertComponent(store, { name: 'Button', usage: { do: ['verb-first labels'] } });
    const b = getComponent(store, 'Button');
    expect(b?.level).toBe('atom');
    expect(b?.data.usage?.when).toContain('Commit');
    expect(b?.data.usage?.do).toEqual(['verb-first labels']);
    expect(b?.data.intents).toContain('submit-form');
  });

  it('builds the decision index intent -> components', () => {
    const index = buildDecisionIndex(seeded());
    expect(index.find((i) => i.intent === 'navigate')?.components).toContain('Link');
  });

  it('recommends by intent keyword', () => {
    const recs = recommend(seeded(), 'submit a form');
    expect(recs[0]?.component).toBe('Button');
  });

  it('design.md carries usage rules, not just an inventory', () => {
    const md = buildDesignMd(seeded(), 'Acme');
    expect(md).toContain('## Choosing a component');
    expect(md).toContain('### Button · atom');
    expect(md).toContain('**Use when:**');
    expect(md).toContain('Instead use:');
  });

  it('skill has valid frontmatter and decision rules', () => {
    const skill = buildSkill(seeded(), 'Acme');
    expect(skill).toMatch(/^---\nname: design-system/);
    expect(skill).toContain('## Choosing a component');
    expect(skill).toContain('Button');
  });
});
