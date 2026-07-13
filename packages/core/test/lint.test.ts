import { describe, it, expect } from 'vitest';
import { Store, upsertComponent, upsertGuideline, lintUsage } from '@dsk/core';

function seeded(): Store {
  const store = new Store(':memory:');
  upsertComponent(store, {
    name: 'Toast',
    intents: ['non-blocking-message', 'notify'],
    usage: { when: 'Show a brief, non-blocking message.' },
  });
  upsertComponent(store, {
    name: 'ConfirmDialog',
    intents: ['blocking-decision', 'confirm-destructive'],
    usage: { when: 'Block to confirm a destructive action.', whenNot: 'non-blocking feedback — use Toast' },
  });
  upsertGuideline(store, 'Non-blocking uses Toast', {
    rule: 'Non-blocking messages use Toast.',
    governs: ['Toast'],
  });
  return store;
}

describe('lintUsage', () => {
  it('warns when a better component exists for the purpose', () => {
    const findings = lintUsage(seeded(), [{ component: 'ConfirmDialog', purpose: 'non-blocking message' }]);
    const warn = findings.find((f) => f.level === 'warn');
    expect(warn?.message).toContain('prefer Toast');
  });

  it('errors on an unknown component', () => {
    const findings = lintUsage(seeded(), [{ component: 'Slideover', purpose: 'side panel' }]);
    expect(findings.find((f) => f.level === 'error')?.message).toContain('Unknown component');
  });

  it('passes a correct choice and surfaces governing guidelines', () => {
    const findings = lintUsage(seeded(), [{ component: 'Toast', purpose: 'non-blocking message' }]);
    expect(findings.some((f) => f.level === 'warn')).toBe(false);
    expect(findings.some((f) => f.level === 'info' && f.message.includes('Guideline'))).toBe(true);
  });
});
