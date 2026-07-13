import { describe, it, expect } from 'vitest';
import { Store, setToken, listTokens, tokensToCss, buildDesignMd } from '@dsk/core';

describe('tokens', () => {
  it('stores and lists a token with inferred type', () => {
    const store = new Store(':memory:');
    setToken(store, 'color.brand.primary', '#1F6FEB');
    const tokens = listTokens(store);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.path).toBe('color.brand.primary');
    expect(tokens[0]!.token.$type).toBe('color');
  });

  it('upserts by path and re-infers type', () => {
    const store = new Store(':memory:');
    setToken(store, 'space.sm', '4px');
    setToken(store, 'space.sm', '8px');
    const tokens = listTokens(store);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]!.token.$value).toBe('8px');
    expect(tokens[0]!.token.$type).toBe('dimension');
  });

  it('exports CSS with aliases resolved to var() refs', () => {
    const store = new Store(':memory:');
    setToken(store, 'color.brand.primary', '#1F6FEB');
    setToken(store, 'color.action', '{color.brand.primary}');
    const css = tokensToCss(listTokens(store));
    expect(css).toContain('--color-brand-primary: #1F6FEB;');
    expect(css).toContain('--color-action: var(--color-brand-primary);');
  });

  it('builds design.md grouped by token group', () => {
    const store = new Store(':memory:');
    setToken(store, 'color.brand.primary', '#1F6FEB');
    setToken(store, 'space.sm', '8px');
    const md = buildDesignMd(store, 'Acme');
    expect(md).toContain('# Acme — design system');
    expect(md).toContain('### color');
    expect(md).toContain('### space');
    expect(md).toContain('color.brand.primary');
  });
});
