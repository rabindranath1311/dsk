import type { NodeStore } from './store.js';
import { ulid } from './ulid.js';
import type { Node, TokenData, TokenType } from './model.js';

/** Best-effort DTCG type inference from a raw value string. */
export function inferType(value: string): TokenType {
  const v = value.trim();
  if (/^\{.+\}$/.test(v)) return 'string'; // alias reference — type follows the target conceptually
  if (/^#([0-9a-f]{3,8})$/i.test(v) || /^(rgb|hsl)a?\(/i.test(v)) return 'color';
  if (/^-?\d*\.?\d+(px|rem|em|%|vh|vw)$/.test(v)) return 'dimension';
  if (/^-?\d*\.?\d+(ms|s)$/.test(v)) return 'duration';
  if (/^-?\d*\.?\d+$/.test(v)) return 'number';
  return 'string';
}

export interface SetTokenOpts {
  type?: TokenType;
  description?: string;
}

/** Create or update a token by its dotted path (e.g. "color.brand.primary"). */
export function setToken(store: NodeStore, path: string, value: string, opts: SetTokenOpts = {}): Node {
  const type = opts.type ?? inferType(value);
  const group = path.split('.')[0];
  const data: TokenData = { $value: coerce(value, type), $type: type, group };
  if (opts.description) data.$description = opts.description;

  const existing = store.byName('token', path);
  const now = new Date().toISOString();
  const node: Node = {
    id: existing?.id ?? ulid(),
    kind: 'token',
    name: path,
    level: null,
    data,
    body: existing?.body ?? null,
    origin: existing?.origin ?? 'client',
    created: existing?.created ?? now,
    updated: now,
  };
  store.upsert(node);
  return node;
}

export interface TokenEntry {
  path: string;
  token: TokenData;
}

export function listTokens(store: NodeStore): TokenEntry[] {
  return store
    .list('token')
    .filter((n): n is Node & { name: string } => typeof n.name === 'string')
    .map((n) => ({ path: n.name, token: n.data as TokenData }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function deleteToken(store: NodeStore, path: string): boolean {
  const n = store.byName('token', path);
  if (!n) return false;
  store.delete(n.id);
  return true;
}

function coerce(value: string, type: TokenType): string | number {
  if (type === 'number' && /^-?\d*\.?\d+$/.test(value)) return Number(value);
  return value;
}
