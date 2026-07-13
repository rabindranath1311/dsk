import type { NodeStore } from './store.js';
import { getComponent } from './components.js';
import { listGuidelines } from './guidelines.js';
import { listTokens } from './tokens.js';
import { recommend } from './recommend.js';
import { getScreen } from './screens.js';
import { getFlow } from './flows.js';

export interface FeatureRequest {
  intent?: string;
  components?: string[];
  screens?: string[];
  flow?: string;
}

/**
 * Assemble a scoped, grounded build prompt from real graph data — the picked
 * components' usage + tokens + the screens/flow + governing guidelines. This is
 * what the visualizer hands to the client's Claude Code (and the MCP
 * `build_feature_prompt` tool returns).
 */
export function buildFeaturePrompt(store: NodeStore, req: FeatureRequest): string {
  const tokenValue = new Map(listTokens(store).map((t) => [t.path, t.token.$value] as const));

  // Resolve components: explicit list, else top recommendations for the intent.
  const names = req.components?.length
    ? req.components
    : req.intent
      ? recommend(store, req.intent).map((r) => r.component)
      : [];
  const components = names.map((n) => getComponent(store, n)).filter((c): c is NonNullable<typeof c> => !!c);

  const out: string[] = [];
  out.push(`# Feature: ${req.intent ?? 'New feature'}`);
  out.push('');
  out.push(
    'Build this honoring the design system below. Use the listed components, and never hardcode a value that has a token — reference the token.',
  );
  out.push('');

  // Tokens to honor (union across chosen components)
  const tokenPaths = [...new Set(components.flatMap((c) => c.data.tokensUsed ?? []))];
  if (tokenPaths.length) {
    out.push('## Tokens to honor');
    for (const p of tokenPaths) out.push(`- \`${p}\` = ${tokenValue.get(p) ?? '(undefined)'}`);
    out.push('');
  }

  // Components
  if (components.length) {
    out.push('## Components to use');
    out.push('');
    for (const c of components) {
      out.push(`### ${c.name}${c.level ? ` · ${c.level}` : ''}`);
      const u = c.data.usage ?? {};
      if (u.when) out.push(`- Use when: ${u.when}`);
      if (u.whenNot) out.push(`- Avoid when: ${u.whenNot}`);
      if (c.data.variants?.length)
        out.push(`- Variants: ${c.data.variants.map((v) => (v.when ? `${v.name} (${v.when})` : v.name)).join('; ')}`);
      if (c.data.props?.length) out.push(`- Props: ${c.data.props.map((p) => p.name).join(', ')}`);
      if (u.a11y) out.push(`- Accessibility: ${u.a11y}`);
      out.push('');
    }
  }

  // Screens
  const screens = (req.screens ?? []).map((s) => getScreen(store, s)).filter((s): s is NonNullable<typeof s> => !!s);
  if (screens.length) {
    out.push('## Screens');
    out.push('');
    for (const s of screens) {
      out.push(`### ${s.name}`);
      if (s.data.purpose) out.push(`- Purpose: ${s.data.purpose}`);
      if (s.data.states?.length) out.push(`- States: ${s.data.states.join(', ')}`);
      if (s.data.uiElements?.length) out.push(`- Elements: ${s.data.uiElements.join(', ')}`);
      if (s.data.components?.length) out.push(`- Components: ${s.data.components.join(', ')}`);
      out.push('');
    }
  }

  // Flow
  const flow = req.flow ? getFlow(store, req.flow) : undefined;
  if (flow) {
    const byId = new Map(flow.data.nodes.map((n) => [n.id, n] as const));
    out.push(`## Flow: ${flow.name}`);
    out.push('');
    for (const e of flow.data.edges) {
      const from = byId.get(e.from)?.title ?? e.from;
      const to = byId.get(e.to)?.title ?? e.to;
      const trig = [e.trigger, e.condition ? `[${e.condition}]` : '', e.label ? `→ ${e.label}` : '']
        .filter(Boolean)
        .join(' ');
      out.push(`- ${from} → ${to}${trig ? `  (${trig})` : ''}`);
    }
    out.push('');
  }

  // Governing guidelines
  const chosen = new Set(components.map((c) => c.name));
  const relevant = listGuidelines(store).filter((g) => (g.data.governs ?? []).some((n) => chosen.has(n)));
  if (relevant.length) {
    out.push('## Guidelines to follow');
    for (const g of relevant) out.push(`- ${g.data.rule}`);
    out.push('');
  }

  out.push('Before writing code, run `lint_usage` on your plan to check it against these rules.');
  out.push('');
  return out.join('\n');
}
