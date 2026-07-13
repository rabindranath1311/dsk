import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Node, Kind } from './model.js';

/** The storage contract both the SQLite Store and the file-based FileStore satisfy. */
export interface NodeStore {
  upsert(node: Node): void;
  get(id: string): Node | undefined;
  byName(kind: Kind, name: string): Node | undefined;
  list(kind?: Kind): Node[];
  delete(id: string): void;
  close(): void;
}

/**
 * The design-system store. A single SQLite file holding every node and edge.
 * This is the source of truth; the CLI, MCP server, visualizer, and exporters
 * are all faces over it.
 */
export class Store implements NodeStore {
  private db: Database.Database;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id         TEXT PRIMARY KEY,
        kind       TEXT NOT NULL,
        name       TEXT,
        level      TEXT,
        data       TEXT,
        body       TEXT,
        origin     TEXT NOT NULL DEFAULT 'client',
        visibility TEXT NOT NULL DEFAULT 'studio',
        created    TEXT NOT NULL,
        updated    TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS edges (
        src   TEXT NOT NULL,
        dst   TEXT NOT NULL,
        type  TEXT NOT NULL,
        PRIMARY KEY (src, dst, type)
      );
      CREATE INDEX IF NOT EXISTS idx_nodes_kind ON nodes(kind);
      CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name);
    `);
    // Migrate stores created before the visibility column existed.
    const cols = (this.db.prepare(`PRAGMA table_info(nodes)`).all() as { name: string }[]).map((c) => c.name);
    if (!cols.includes('visibility')) {
      this.db.exec(`ALTER TABLE nodes ADD COLUMN visibility TEXT NOT NULL DEFAULT 'studio'`);
    }
  }

  upsert(node: Node): void {
    this.db
      .prepare(
        `INSERT INTO nodes (id, kind, name, level, data, body, origin, visibility, created, updated)
         VALUES (@id, @kind, @name, @level, @data, @body, @origin, @visibility, @created, @updated)
         ON CONFLICT(id) DO UPDATE SET
           kind=excluded.kind, name=excluded.name, level=excluded.level,
           data=excluded.data, body=excluded.body, origin=excluded.origin,
           visibility=excluded.visibility, updated=excluded.updated`,
      )
      .run({ ...node, data: JSON.stringify(node.data ?? null), visibility: node.visibility ?? 'studio' });
  }

  get(id: string): Node | undefined {
    const row = this.db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(id);
    return row ? rowToNode(row) : undefined;
  }

  byName(kind: Kind, name: string): Node | undefined {
    const row = this.db
      .prepare(`SELECT * FROM nodes WHERE kind = ? AND name = ? LIMIT 1`)
      .get(kind, name);
    return row ? rowToNode(row) : undefined;
  }

  list(kind?: Kind): Node[] {
    const rows = kind
      ? this.db.prepare(`SELECT * FROM nodes WHERE kind = ? ORDER BY name`).all(kind)
      : this.db.prepare(`SELECT * FROM nodes ORDER BY kind, name`).all();
    return rows.map(rowToNode);
  }

  delete(id: string): void {
    this.db.prepare(`DELETE FROM nodes WHERE id = ?`).run(id);
  }

  close(): void {
    this.db.close();
  }
}

function rowToNode(row: any): Node {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    level: row.level,
    data: row.data ? JSON.parse(row.data) : null,
    body: row.body,
    origin: row.origin,
    visibility: row.visibility,
    created: row.created,
    updated: row.updated,
  };
}
