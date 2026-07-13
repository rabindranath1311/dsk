import type { TokenEntry } from '../tokens.js';

/** Project DTCG tokens to CSS custom properties. Aliases become var() refs. */
export function tokensToCss(tokens: TokenEntry[]): string {
  const lines = tokens.map(({ path, token }) => `  --${cssVar(path)}: ${cssValue(token.$value)};`);
  const body = lines.length ? lines.join('\n') : '  /* no tokens yet */';
  return `:root {\n${body}\n}\n`;
}

function cssVar(path: string): string {
  return path.replace(/\./g, '-');
}

function cssValue(value: string | number): string {
  if (typeof value === 'string') {
    const alias = value.match(/^\{(.+)\}$/);
    if (alias) return `var(--${cssVar(alias[1]!)})`;
  }
  return String(value);
}
