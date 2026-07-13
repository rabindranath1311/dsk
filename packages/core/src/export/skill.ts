import type { NodeStore } from '../store.js';
import { listComponents } from '../components.js';
import { listGuidelines } from '../guidelines.js';
import { listPatterns } from '../patterns.js';
import { listDocs } from '../docs.js';
import { buildDecisionIndex } from '../recommend.js';

/**
 * A Claude Code skill that steers an agent with the design system's decision
 * rules — the "better than a hand-written design.md" artifact. Condensed and
 * action-oriented; full detail lives in design.md.
 */
export function buildSkill(store: NodeStore, name = 'Design system'): string {
  const out: string[] = [];
  out.push('---');
  out.push('name: design-system');
  out.push(
    `description: Use ${name}'s tokens and component rules when building any UI in this project. Honor the design tokens, and pick components by the decision guide.`,
  );
  out.push('---');
  out.push('');
  out.push(`# ${name}`);
  out.push('');
  out.push(
    'This design system is the source of truth for UI in this project. Do not invent components or hardcode values that have a token.',
  );
  out.push('');
  out.push('## Tokens');
  out.push(
    'Honor the tokens in `design-system/tokens.css` (CSS custom properties). Never hardcode a color, spacing, radius, or font value that has a token — reference the token instead.',
  );
  out.push('');

  const index = buildDecisionIndex(store);
  if (index.length) {
    out.push('## Choosing a component');
    for (const { intent, components } of index) out.push(`- **${intent}** → ${components.join(', ')}`);
    out.push('');
  }

  const comps = listComponents(store);
  if (comps.length) {
    out.push('## Component rules');
    for (const c of comps) {
      const u = c.data.usage ?? {};
      const parts: string[] = [];
      if (u.when) parts.push(`use when ${strip(u.when)}`);
      if (u.whenNot) parts.push(`not when ${strip(u.whenNot)}`);
      out.push(`- **${c.name}** — ${parts.join('; ') || 'see design.md'}`);
    }
    out.push('');
  }

  const patterns = listPatterns(store);
  if (patterns.length) {
    out.push('## Patterns');
    for (const p of patterns) out.push(`- **${p.name}** — ${strip(p.data.problem)}${p.data.solution ? `: ${strip(p.data.solution)}` : ''}`);
    out.push('');
  }

  const guidelines = listGuidelines(store);
  if (guidelines.length) {
    out.push('## Guidelines');
    for (const g of guidelines) out.push(`- ${g.data.rule}`);
    out.push('');
  }

  out.push('## Before you build');
  out.push('- Call `lint_usage` on your planned components BEFORE writing code.');
  out.push('- Use `build_feature_prompt` to assemble the tokens, component rules, screens, and flow for a feature.');
  if (listDocs(store).length) out.push('- Read the reference docs in `design-system/docs/` for product grounding.');
  out.push('');
  out.push("Full detail (props, variants, do/don't, accessibility, the exact use-cases per component, screens & flows): `design-system/design.md`.");
  out.push('');
  return out.join('\n');
}

/**
 * A tool-agnostic AGENTS.md that travels into the client repo root of the
 * design-system folder — the same steering as the Claude Code skill, for agents
 * that read AGENTS.md rather than skills.
 */
export function buildAgentsMd(name = 'Design system'): string {
  return [
    `# ${name} — design-system instructions for agents`,
    '',
    'This project ships with a living design system in `design-system/`. Before building or changing ANY UI:',
    '',
    '- **Honor the tokens** in `design-system/tokens.css` — never hardcode a color, spacing, radius, or font that has a token.',
    '- **Read `design-system/design.md`** — the components (atoms→templates), the "when to use which" decision guide, alternatives, patterns, guidelines, screens, user flows, and the exact use-cases written for THIS product.',
    '- **Use the design-system MCP** (wired via `.mcp.json`): `search`, `recommend_component`, `component_guidance`, and `lint_usage` your plan BEFORE writing code. Author new components/tokens back with `create_component` / `set_token`.',
    '- Do not invent components or restyle existing ones — extend the system and write the new definition back into it.',
    '',
  ].join('\n');
}

function strip(s: string): string {
  return (s.charAt(0).toLowerCase() + s.slice(1)).replace(/\.$/, '');
}
