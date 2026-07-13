import type { NodeStore } from '../store.js';
import { listTokens, type TokenEntry } from '../tokens.js';
import { listComponents } from '../components.js';
import { listPatterns } from '../patterns.js';
import { listGuidelines } from '../guidelines.js';
import { listScreens } from '../screens.js';
import { listFlows } from '../flows.js';
import { listIA } from '../ia.js';
import { listDocs } from '../docs.js';
import { buildDecisionIndex } from '../recommend.js';
import type { FlowData } from '../model.js';

/**
 * Project the store to a human- and agent-readable design.md. This is a
 * projection — never hand-edited. It carries the usage/decision rules, not just
 * an inventory, which is what makes it better than a hand-written design.md.
 */
export function buildDesignMd(store: NodeStore, name = 'Design system'): string {
  const out: string[] = [];
  out.push(`# ${name} — design system`);
  out.push('');
  out.push('> Generated from the design-system memory. Do not edit by hand — change it in the tool and re-export.');
  out.push('');

  // Tokens
  out.push('## Tokens');
  out.push('');
  const tokens = listTokens(store);
  if (tokens.length === 0) {
    out.push('_No tokens yet._');
    out.push('');
  } else {
    for (const [group, items] of groupTokens(tokens)) {
      out.push(`### ${group}`);
      out.push('');
      out.push('| Token | Value | Type |');
      out.push('|---|---|---|');
      for (const { path, token } of items) out.push(`| \`${path}\` | \`${token.$value}\` | ${token.$type} |`);
      out.push('');
    }
  }

  // Decision guide (the index)
  const index = buildDecisionIndex(store);
  if (index.length) {
    out.push('## Choosing a component');
    out.push('');
    out.push('Pick by intent. When more than one is listed, prefer the first.');
    out.push('');
    out.push('| Intent | Use |');
    out.push('|---|---|');
    for (const { intent, components } of index) out.push(`| ${intent} | ${components.join(', ')} |`);
    out.push('');
  }

  // Components
  out.push('## Components');
  out.push('');
  const comps = listComponents(store);
  if (comps.length === 0) out.push('_No components yet._');
  for (const c of comps) {
    out.push(`### ${c.name}${c.level ? ` · ${c.level}` : ''}`);
    out.push('');
    const u = c.data.usage ?? {};
    if (c.data.intents?.length) out.push(`- **Intents:** ${c.data.intents.join(', ')}`);
    if (u.when) out.push(`- **Use when:** ${u.when}`);
    if (u.whenNot) out.push(`- **Don't use when:** ${u.whenNot}`);
    if (u.alternatives?.length)
      out.push(`- **Instead use:** ${u.alternatives.map((a) => `${a.use} (${a.when})`).join('; ')}`);
    if (u.pairsWith?.length) out.push(`- **Pairs with:** ${u.pairsWith.join(', ')}`);
    if (c.data.variants?.length)
      out.push(`- **Variants:** ${c.data.variants.map((v) => (v.when ? `${v.name} — ${v.when}` : v.name)).join('; ')}`);
    if (u.do?.length) out.push(`- **Do:** ${u.do.join('; ')}`);
    if (u.dont?.length) out.push(`- **Don't:** ${u.dont.join('; ')}`);
    if (u.a11y) out.push(`- **Accessibility:** ${u.a11y}`);
    if (c.data.tokensUsed?.length) out.push(`- **Tokens:** ${c.data.tokensUsed.map((t) => `\`${t}\``).join(', ')}`);
    if (c.body) {
      out.push('');
      out.push('**Exact use-cases on this project:**');
      out.push('');
      out.push(c.body.trim());
    }
    out.push('');
  }

  // Patterns
  const patterns = listPatterns(store);
  if (patterns.length) {
    out.push('## Patterns');
    out.push('');
    for (const p of patterns) {
      out.push(`### ${p.name}`);
      out.push('');
      out.push(`- **Problem:** ${p.data.problem}`);
      if (p.data.solution) out.push(`- **Solution:** ${p.data.solution}`);
      if (p.data.componentsUsed?.length) out.push(`- **Uses:** ${p.data.componentsUsed.join(', ')}`);
      if (p.data.rationale) out.push(`- **Why:** ${p.data.rationale}`);
      out.push('');
    }
  }

  // Guidelines
  const guidelines = listGuidelines(store);
  if (guidelines.length) {
    out.push('## Guidelines');
    out.push('');
    for (const g of guidelines) {
      const governs = g.data.governs?.length ? ` _(governs: ${g.data.governs.join(', ')})_` : '';
      out.push(`- **${g.name}** — ${g.data.rule}${governs}`);
    }
    out.push('');
  }

  // Information architecture (screens)
  const screens = listScreens(store);
  if (screens.length) {
    out.push('## Screens');
    out.push('');
    for (const s of screens) {
      out.push(`### ${s.name}`);
      out.push('');
      if (s.data.purpose) out.push(`- **Purpose:** ${s.data.purpose}`);
      if (s.data.states?.length) out.push(`- **States:** ${s.data.states.join(', ')}`);
      if (s.data.components?.length) out.push(`- **Components:** ${s.data.components.join(', ')}`);
      out.push('');
    }
  }

  // IA app-maps + user flows (graphs, rendered as a text outline)
  const ia = listIA(store);
  if (ia.length) {
    out.push('## Information architecture (app maps)');
    out.push('');
    for (const m of ia) out.push(...outlineGraph(m.name, m.data, false));
  }
  const flows = listFlows(store);
  if (flows.length) {
    out.push('## User flows');
    out.push('');
    for (const f of flows) out.push(...outlineGraph(f.name, f.data, true));
  }

  // Data layer
  const docs = listDocs(store);
  if (docs.length) {
    out.push('## Reference docs (data layer)');
    out.push('');
    out.push('Grounding material in `design-system/docs/`:');
    out.push('');
    for (const d of docs) out.push(`- **${d.name}**${d.data.type ? ` _(${d.data.type})_` : ''}`);
    out.push('');
  }

  return out.join('\n') + '\n';
}

/** Render a flow/IA graph as a readable text outline: each edge as source → target with its annotation. */
function outlineGraph(name: string, data: FlowData, annotated: boolean): string[] {
  const out: string[] = [`### ${name}`, ''];
  const title = (id: string) => data.nodes.find((n) => n.id === id)?.title ?? id;
  if (!data.edges.length && !data.nodes.length) { out.push('_empty_', ''); return out; }
  if (!data.edges.length) {
    for (const n of data.nodes) out.push(`- ${n.title}`);
    out.push('');
    return out;
  }
  for (const e of data.edges) {
    const anno = annotated
      ? [e.trigger, e.condition ? `[${e.condition}]` : '', e.label ? `→ ${e.label}` : ''].filter(Boolean).join(' ')
      : '';
    out.push(`- ${title(e.from)} → ${title(e.to)}${anno ? `  _(${anno})_` : ''}`);
  }
  out.push('');
  return out;
}

function groupTokens(tokens: TokenEntry[]): [string, TokenEntry[]][] {
  const groups = new Map<string, TokenEntry[]>();
  for (const entry of tokens) {
    const g = entry.token.group ?? entry.path.split('.')[0]!;
    const arr = groups.get(g) ?? (groups.set(g, []).get(g) as TokenEntry[]);
    arr.push(entry);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b));
}
