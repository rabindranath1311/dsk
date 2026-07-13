import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { Store, type NodeStore } from './store.js';
import { FileStore } from './filestore.js';

export const DSK_DIR = '.dsk';

export interface ProjectConfig {
  name: string;
  version: string;
  exportDir: string;
  /** 'file' = human-readable repo of markdown files; default is SQLite */
  storage?: 'file' | 'sqlite';
  /** set on deployed client copies so `dsk update` knows its source */
  recipe?: { name: string; version: number; source: string };
}

export interface Project {
  root: string;
  config: ProjectConfig;
}

/** Walk up from `start` to find the nearest `.dsk/config.json`. */
export function findProject(start: string = process.cwd()): Project | null {
  let dir = resolve(start);
  for (;;) {
    const cfgPath = join(dir, DSK_DIR, 'config.json');
    if (existsSync(cfgPath)) {
      return { root: dir, config: JSON.parse(readFileSync(cfgPath, 'utf8')) as ProjectConfig };
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function openStore(root: string): NodeStore {
  const cfg = findProject(root)?.config;
  if (cfg?.storage === 'file') return new FileStore(join(root, cfg.exportDir));
  return new Store(join(root, DSK_DIR, 'store.db'));
}
