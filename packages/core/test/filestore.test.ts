import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  FileStore,
  applySeed,
  listComponents,
  listTokens,
  getComponent,
  upsertComponent,
  setToken,
  deleteToken,
  upsertDoc,
  listDocs,
  getDoc,
  deleteDoc,
} from '@dsk/core';
import matter from 'gray-matter';

const seed = JSON.parse(readFileSync(new URL('../../../examples/seed.acme.json', import.meta.url), 'utf8'));

describe('FileStore — a human-readable repo of files', () => {
  it('serializes to markdown files and reads them back', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'dsk-fs-'));
    const ds = join(tmp, 'design-system');
    const store = new FileStore(ds);
    applySeed(store, seed);

    expect(existsSync(join(ds, 'tokens.md'))).toBe(true);
    expect(existsSync(join(ds, 'components', 'Button.md'))).toBe(true);
    expect(existsSync(join(ds, 'flows', 'delete-account.md'))).toBe(true);

    // Button.md is human-readable: frontmatter carries the usage rules
    const fm = matter(readFileSync(join(ds, 'components', 'Button.md'), 'utf8')).data as any;
    expect(fm.kind).toBe('component');
    expect(fm.level).toBe('atom');
    expect(fm.usage.when).toContain('Commit');

    // reads back through the store interface
    expect(listComponents(store).map((c) => c.name)).toContain('Button');
    expect(getComponent(store, 'Button')?.data.usage?.whenNot).toBeTruthy();
    expect(listTokens(store).find((t) => t.path === 'color.brand.primary')?.token.$value).toBe('#1F6FEB');

    rmSync(tmp, { recursive: true, force: true });
  });

  it('delete removes the file from disk', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'dsk-fs-'));
    const ds = join(tmp, 'ds');
    const store = new FileStore(ds);
    upsertComponent(store, { name: 'Badge', level: 'atom', usage: { when: 'status label' } });
    expect(existsSync(join(ds, 'components', 'Badge.md'))).toBe(true);
    store.delete(store.byName('component', 'Badge')!.id);
    expect(existsSync(join(ds, 'components', 'Badge.md'))).toBe(false);
    rmSync(tmp, { recursive: true, force: true });
  });

  // Regression: gray-matter's global parse cache returns a shallow copy whose
  // `.data` is shared; mutating the parsed token map (add/delete) corrupted the
  // cache, so deleting a token — which restores the original file content —
  // used to read back the stale (mutated) map. Create → delete → list must
  // land exactly where it started.
  it('create then delete a token leaves the store as it began', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'dsk-fs-'));
    const store = new FileStore(join(tmp, 'design-system'));
    applySeed(store, seed);
    const before = listTokens(store).map((t) => t.path).sort();

    setToken(store, 'color.brand.accent', '#E4F222');
    expect(listTokens(store).map((t) => t.path)).toContain('color.brand.accent');

    expect(deleteToken(store, 'color.brand.accent')).toBe(true);
    expect(listTokens(store).map((t) => t.path).sort()).toEqual(before);
    rmSync(tmp, { recursive: true, force: true });
  });

  it('docs round-trip through the data layer', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'dsk-fs-'));
    const ds = join(tmp, 'design-system');
    const store = new FileStore(ds);
    upsertDoc(store, 'Brand voice', { type: 'brand', tags: ['tone'] }, '# Voice\n\nPlain-spoken.');

    expect(existsSync(join(ds, 'docs', 'Brand-voice.md'))).toBe(true);
    const d = getDoc(store, 'Brand voice');
    expect(d?.data.type).toBe('brand');
    expect(d?.body).toContain('Plain-spoken');
    expect(listDocs(store).map((x) => x.name)).toEqual(['Brand voice']);

    expect(deleteDoc(store, 'Brand voice')).toBe(true);
    expect(listDocs(store)).toHaveLength(0);
    expect(existsSync(join(ds, 'docs', 'Brand-voice.md'))).toBe(false);
    rmSync(tmp, { recursive: true, force: true });
  });
});
