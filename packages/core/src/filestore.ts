import matter from 'gray-matter';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Kind, Node, TokenData } from './model.js';
import type { NodeStore } from './store.js';

/**
 * A file-based store: the design system IS a folder of human-readable files.
 * Tokens live in one `tokens.md` (DESIGN.md-style frontmatter map); every other
 * node is a markdown file with YAML frontmatter (the structured data) + a
 * markdown body (the prose / exact use-cases). Git-friendly and portable.
 *
 *   design-system/
 *   ├── tokens.md
 *   ├── components/<Name>.md
 *   ├── patterns/<Name>.md
 *   ├── guidelines/<Name>.md
 *   ├── screens/<Name>.md   (structured screen specs)
 *   ├── ia/<Name>.md        (IA app-map graphs)
 *   ├── flows/<name>.md     (user-flow graphs)
 *   └── docs/<name>.md      (the data layer)
 */
const DIR: Partial<Record<Kind, string>> = {
  component: 'components',
  pattern: 'patterns',
  guideline: 'guidelines',
  screen: 'screens',
  ia: 'ia',
  flow: 'flows',
  doc: 'docs',
};

const META_KEYS = new Set(['id', 'kind', 'name', 'level', 'origin', 'visibility', 'created', 'updated']);

/**
 * Parse front-matter WITHOUT gray-matter's global cache. The cache returns a
 * shallow copy whose `.data` is shared across calls (gray-matter/index.js:39),
 * so callers that mutate the parsed map (upsert/delete) would corrupt the cache
 * and later reads would see stale data. The store's contract is that the file
 * on disk is the source of truth, so we always parse fresh — passing an options
 * object disables the cache (gray-matter/index.js:37).
 */
function parseFresh(raw: string) {
  return matter(raw, {});
}

function slugify(s: string): string {
  return s.trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled';
}

export class FileStore implements NodeStore {
  constructor(private root: string) {
    mkdirSync(root, { recursive: true });
  }

  // --- tokens (single file) ---
  private tokensFile(): string {
    return join(this.root, 'tokens.md');
  }
  private readTokens(): Record<string, TokenData> {
    const f = this.tokensFile();
    if (!existsSync(f)) return {};
    const fm = parseFresh(readFileSync(f, 'utf8')).data as { tokens?: Record<string, TokenData> };
    return fm.tokens ?? {};
  }
  private writeTokens(map: Record<string, TokenData>): void {
    const body = '# Design tokens\n\nEach entry is a DTCG token — human-readable and editable.\n';
    writeFileSync(this.tokensFile(), matter.stringify(body, { tokens: map }));
  }
  private tokenNode(path: string, data: TokenData): Node {
    return {
      id: `token:${path}`, kind: 'token', name: path, level: null, data,
      body: null, origin: 'client', visibility: 'studio', created: '', updated: '',
    };
  }

  // --- one-file-per-node kinds ---
  private dirNodes(kind: Kind): Node[] {
    const sub = DIR[kind];
    if (!sub) return [];
    const dir = join(this.root, sub);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => this.parseFile(join(dir, f)))
      .filter((n): n is Node => n != null);
  }
  private parseFile(file: string): Node | null {
    try {
      const { data, content } = parseFresh(readFileSync(file, 'utf8'));
      const meta = data as Record<string, unknown>;
      const fields: Record<string, unknown> = {};
      for (const k of Object.keys(meta)) if (!META_KEYS.has(k)) fields[k] = meta[k];
      const body = content.trim();
      return {
        id: String(meta.id),
        kind: meta.kind as Kind,
        name: (meta.name as string) ?? null,
        level: (meta.level as Node['level']) ?? null,
        data: fields,
        body: body || null,
        origin: (meta.origin as Node['origin']) ?? 'client',
        visibility: (meta.visibility as Node['visibility']) ?? 'studio',
        created: (meta.created as string) ?? '',
        updated: (meta.updated as string) ?? '',
      };
    } catch {
      return null;
    }
  }

  list(kind?: Kind): Node[] {
    if (kind === 'token') return Object.entries(this.readTokens()).map(([p, d]) => this.tokenNode(p, d));
    if (kind) return this.dirNodes(kind);
    const all: Node[] = Object.entries(this.readTokens()).map(([p, d]) => this.tokenNode(p, d));
    for (const k of Object.keys(DIR) as Kind[]) all.push(...this.dirNodes(k));
    return all;
  }

  get(id: string): Node | undefined {
    if (id.startsWith('token:')) {
      const path = id.slice('token:'.length);
      const d = this.readTokens()[path];
      return d ? this.tokenNode(path, d) : undefined;
    }
    return this.list().find((n) => n.id === id);
  }

  byName(kind: Kind, name: string): Node | undefined {
    if (kind === 'token') {
      const d = this.readTokens()[name];
      return d ? this.tokenNode(name, d) : undefined;
    }
    return this.dirNodes(kind).find((n) => n.name === name);
  }

  upsert(node: Node): void {
    if (node.kind === 'token') {
      const map = this.readTokens();
      map[node.name as string] = node.data as TokenData;
      this.writeTokens(map);
      return;
    }
    const sub = DIR[node.kind];
    if (!sub || !node.name) return;
    const dir = join(this.root, sub);
    mkdirSync(dir, { recursive: true });
    const fm: Record<string, unknown> = { id: node.id, kind: node.kind, name: node.name };
    if (node.level) fm.level = node.level;
    fm.origin = node.origin;
    fm.visibility = node.visibility ?? 'studio';
    // Strip `undefined` (recursively) before it reaches the YAML dumper — js-yaml
    // throws on undefined values, and callers legitimately pass undefined for
    // unset optional fields. JSON round-trip mirrors how the SQLite store
    // serializes, so both backends accept the same input.
    Object.assign(fm, JSON.parse(JSON.stringify((node.data as Record<string, unknown>) ?? {})));
    fm.created = node.created;
    fm.updated = node.updated;
    writeFileSync(join(dir, `${slugify(node.name)}.md`), matter.stringify(node.body ? `\n${node.body}\n` : '', fm));
  }

  delete(id: string): void {
    if (id.startsWith('token:')) {
      const map = this.readTokens();
      delete map[id.slice('token:'.length)];
      this.writeTokens(map);
      return;
    }
    const n = this.get(id);
    if (!n || !n.name) return;
    const sub = DIR[n.kind];
    if (!sub) return;
    const f = join(this.root, sub, `${slugify(n.name)}.md`);
    if (existsSync(f)) rmSync(f);
  }

  close(): void {}
}
