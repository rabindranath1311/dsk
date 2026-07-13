import type { NodeStore } from './store.js';
import { getComponent } from './components.js';
import { listGuidelines } from './guidelines.js';
import { recommend } from './recommend.js';

export interface PlanItem {
  component: string;
  purpose?: string;
}

export interface LintFinding {
  level: 'error' | 'warn' | 'info';
  component?: string;
  message: string;
}

/**
 * Check a proposed UI plan against the design system BEFORE code is written.
 * This is the system actively steering the agent, not just informing it.
 */
export function lintUsage(store: NodeStore, plan: PlanItem[]): LintFinding[] {
  const findings: LintFinding[] = [];

  for (const item of plan) {
    const comp = getComponent(store, item.component);

    if (!comp) {
      const recs = item.purpose ? recommend(store, item.purpose) : [];
      findings.push({
        level: 'error',
        component: item.component,
        message:
          `Unknown component "${item.component}".` +
          (recs.length ? ` For "${item.purpose}", consider ${recs.map((r) => r.component).join(', ')}.` : ''),
      });
      continue;
    }

    if (item.purpose) {
      const recs = recommend(store, item.purpose);
      const top = recs[0];
      if (top && top.component !== comp.name) {
        const reason = comp.data.usage?.whenNot ? ` ${comp.name} is not for this — ${comp.data.usage.whenNot}` : '';
        findings.push({
          level: 'warn',
          component: comp.name,
          message: `For "${item.purpose}", prefer ${top.component} over ${comp.name}.${reason}`,
        });
      }
    }

    for (const g of listGuidelines(store)) {
      if (g.data.governs?.includes(comp.name)) {
        findings.push({ level: 'info', component: comp.name, message: `Guideline — ${g.data.rule}` });
      }
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'info', message: 'No issues found against the design system.' });
  }
  return findings;
}
