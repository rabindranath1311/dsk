import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NodeStore } from '../store.js';
import type { ProjectConfig } from '../project.js';
import { listTokens } from '../tokens.js';
import { tokensToCss } from './css.js';
import { buildDesignMd } from './designmd.js';
import { buildSkill, buildAgentsMd } from './skill.js';

/** Regenerate every projection from the store. The single export path. */
export function exportProject(store: NodeStore, root: string, config: ProjectConfig): string[] {
  const css = tokensToCss(listTokens(store));
  const md = buildDesignMd(store, config.name);
  const skill = buildSkill(store, config.name);
  const agents = buildAgentsMd(config.name);

  const outDir = join(root, config.exportDir);
  const skillDir = join(root, '.claude', 'skills', 'design-system');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(outDir, 'tokens.css'), css);
  writeFileSync(join(outDir, 'design.md'), md);
  writeFileSync(join(outDir, 'AGENTS.md'), agents);
  writeFileSync(join(skillDir, 'SKILL.md'), skill);

  return [
    `${config.exportDir}/tokens.css`,
    `${config.exportDir}/design.md`,
    `${config.exportDir}/AGENTS.md`,
    '.claude/skills/design-system/SKILL.md',
  ];
}
