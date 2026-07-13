import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/**
 * Assets are the binary side of the design system — icons, images, logos.
 * They aren't nodes; they're plain files under `<exportDir>/assets/`, so they
 * stay part of the human-readable, git-friendly repo alongside the markdown.
 */
export interface AssetEntry {
  name: string;
  size: number;
  ext: string;
}

export function assetsDir(root: string, exportDir: string): string {
  return join(root, exportDir, 'assets');
}

/** Strip any path components — assets are flat files, never traversal targets. */
function safeName(name: string): string {
  return name.replace(/[\\/]/g, '-').replace(/[^\w.\- ]+/g, '').replace(/\.{2,}/g, '.').trim() || 'asset';
}

export function listAssets(root: string, exportDir: string): AssetEntry[] {
  const dir = assetsDir(root, exportDir);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith('.'))
    .map((f) => ({ name: f, size: statSync(join(dir, f)).size, ext: extname(f).toLowerCase() }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function saveAsset(root: string, exportDir: string, name: string, base64: string): AssetEntry {
  const dir = assetsDir(root, exportDir);
  mkdirSync(dir, { recursive: true });
  const clean = safeName(name);
  const buf = Buffer.from(base64, 'base64');
  writeFileSync(join(dir, clean), buf);
  return { name: clean, size: buf.length, ext: extname(clean).toLowerCase() };
}

export function readAsset(root: string, exportDir: string, name: string): Buffer | null {
  const dir = assetsDir(root, exportDir);
  const file = resolve(dir, safeName(name));
  if (!file.startsWith(resolve(dir)) || !existsSync(file)) return null;
  return readFileSync(file);
}

export function deleteAsset(root: string, exportDir: string, name: string): boolean {
  const file = join(assetsDir(root, exportDir), safeName(name));
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}
