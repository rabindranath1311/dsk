import { Command } from 'commander';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DSK_DIR,
  findProject,
  openStore,
  setToken,
  listTokens,
  upsertComponent,
  listComponents,
  getComponent,
  upsertPattern,
  upsertGuideline,
  recommend,
  lintUsage,
  applySeed,
  buildFeaturePrompt,
  exportProject,
  type Project,
  type ProjectConfig,
  type NewComponentInput,
  type PlanItem,
} from '@dsk/core';

function needProject(): Project {
  const project = findProject();
  if (!project) {
    console.error('Not a dsk project. Run `dsk init` first.');
    process.exit(1);
  }
  return project;
}

const collect = (val: string, acc: string[]): string[] => {
  acc.push(val);
  return acc;
};

/**
 * Stamp a PORTABLE .mcp.json: the design-system MCP is served over HTTP by
 * `dsk serve` at localhost, so the config carries no monorepo paths and travels
 * with the client repo. The client runs `dsk serve` to get the visualizer AND
 * the MCP from one process.
 */
function writeMcpConfig(root: string, port = 4321): void {
  const mcp = {
    mcpServers: {
      'design-system': { type: 'http', url: `http://localhost:${port}/mcp` },
    },
  };
  writeFileSync(join(root, '.mcp.json'), JSON.stringify(mcp, null, 2) + '\n');
}

const program = new Command();
program.name('dsk').description('Design-system memory toolkit').version('0.0.1');

program
  .command('init')
  .description('Initialize a design-system memory in this folder')
  .option('-n, --name <name>', 'project name', 'Design system')
  .option('--files', 'store the design system as a human-readable file repo (not SQLite)')
  .action((opts: { name: string; files?: boolean }) => {
    const root = process.cwd();
    mkdirSync(join(root, DSK_DIR), { recursive: true });
    const config: ProjectConfig = { name: opts.name, version: '0.0.1', exportDir: 'design-system' };
    if (opts.files) config.storage = 'file';
    writeFileSync(join(root, DSK_DIR, 'config.json'), JSON.stringify(config, null, 2) + '\n');
    openStore(root).close();
    console.log(`Initialized "${config.name}"${opts.files ? ' — human-readable file repo' : ''}.`);
    console.log(`  store:   ${opts.files ? config.exportDir + '/ (markdown files)' : DSK_DIR + '/store.db'}`);
    console.log(`\nNext:  dsk import examples/seed.acme.json   then   dsk export`);
  });

// --- tokens ----------------------------------------------------------------

const token = program.command('token').description('Manage design tokens');

token
  .command('set <path> <value>')
  .description('Set a token, e.g. color.brand.primary "#1F6FEB" (alias: "{color.brand.primary}")')
  .option('-t, --type <type>', 'DTCG type (color|dimension|number|duration|string)')
  .option('-d, --desc <text>', 'description')
  .action((path: string, value: string, opts: { type?: any; desc?: string }) => {
    const { root } = needProject();
    const store = openStore(root);
    const node = setToken(store, path, value, { type: opts.type, description: opts.desc });
    store.close();
    const t = node.data as { $value: unknown; $type: string };
    console.log(`set ${path} = ${t.$value}  (${t.$type})`);
  });

token
  .command('list')
  .description('List all tokens')
  .action(() => {
    const { root } = needProject();
    const store = openStore(root);
    const tokens = listTokens(store);
    store.close();
    if (tokens.length === 0) return console.log('No tokens yet.');
    for (const { path, token } of tokens) {
      console.log(`${path.padEnd(34)} ${String(token.$value).padEnd(16)} ${token.$type}`);
    }
  });

// --- components ------------------------------------------------------------

const component = program.command('component').description('Manage components');

component
  .command('new <name>')
  .description('Create or update a component (richer fields via `dsk import`)')
  .option('-l, --level <level>', 'atom|molecule|organism|template')
  .option('--intent <intent>', 'an intent it serves (repeatable)', collect, [])
  .option('--token <path>', 'a token it uses (repeatable)', collect, [])
  .option('--when <text>', 'when to use it')
  .option('--when-not <text>', 'when NOT to use it')
  .option('--a11y <text>', 'accessibility note')
  .action(
    (
      name: string,
      opts: { level?: any; intent: string[]; token: string[]; when?: string; whenNot?: string; a11y?: string },
    ) => {
      const { root } = needProject();
      const store = openStore(root);
      const input: NewComponentInput = { name, level: opts.level };
      if (opts.intent.length) input.intents = opts.intent;
      if (opts.token.length) input.tokensUsed = opts.token;
      const usage: Record<string, string> = {};
      if (opts.when) usage.when = opts.when;
      if (opts.whenNot) usage.whenNot = opts.whenNot;
      if (opts.a11y) usage.a11y = opts.a11y;
      if (Object.keys(usage).length) input.usage = usage;
      upsertComponent(store, input);
      store.close();
      console.log(`saved component ${name}${opts.level ? ` (${opts.level})` : ''}`);
    },
  );

component
  .command('list')
  .description('List components')
  .action(() => {
    const { root } = needProject();
    const store = openStore(root);
    const comps = listComponents(store);
    store.close();
    if (comps.length === 0) return console.log('No components yet.');
    for (const c of comps) {
      console.log(`${c.name.padEnd(18)} ${(c.level ?? '-').padEnd(10)} ${c.data.usage?.when ?? ''}`);
    }
  });

component
  .command('show <name>')
  .description('Show a component card')
  .action((name: string) => {
    const { root } = needProject();
    const store = openStore(root);
    const c = getComponent(store, name);
    store.close();
    if (!c) {
      console.error(`No component "${name}".`);
      process.exit(1);
    }
    console.log(JSON.stringify(c, null, 2));
  });

// --- patterns / guidelines -------------------------------------------------

program
  .command('pattern <name>')
  .description('Add or update a pattern')
  .requiredOption('--problem <text>', 'the recurring problem')
  .option('--solution <text>', 'the recommended solution')
  .option('--component <name>', 'a component it uses (repeatable)', collect, [])
  .option('--rationale <text>', 'why')
  .action((name: string, opts: { problem: string; solution?: string; component: string[]; rationale?: string }) => {
    const { root } = needProject();
    const store = openStore(root);
    upsertPattern(store, name, {
      problem: opts.problem,
      solution: opts.solution,
      componentsUsed: opts.component.length ? opts.component : undefined,
      rationale: opts.rationale,
    });
    store.close();
    console.log(`saved pattern ${name}`);
  });

program
  .command('guideline <name>')
  .description('Add or update a guideline')
  .requiredOption('--rule <text>', 'the rule')
  .option('--scope <text>', 'scope, e.g. hierarchy|feedback|color')
  .option('--governs <name>', 'a component it governs (repeatable)', collect, [])
  .action((name: string, opts: { rule: string; scope?: string; governs: string[] }) => {
    const { root } = needProject();
    const store = openStore(root);
    upsertGuideline(store, name, {
      rule: opts.rule,
      scope: opts.scope,
      governs: opts.governs.length ? opts.governs : undefined,
    });
    store.close();
    console.log(`saved guideline ${name}`);
  });

// --- recommend / lint ------------------------------------------------------

program
  .command('recommend <query...>')
  .description('Which component fits a problem? e.g. dsk recommend "confirm a destructive action"')
  .action((query: string[]) => {
    const { root } = needProject();
    const store = openStore(root);
    const recs = recommend(store, query.join(' '));
    store.close();
    if (recs.length === 0) return console.log('No match.');
    for (const r of recs) console.log(`${r.component.padEnd(18)} ${r.why}`);
  });

program
  .command('lint <file>')
  .description('Check a UI plan (JSON array of {component, purpose}) against the design system')
  .action((file: string) => {
    const { root } = needProject();
    const plan = JSON.parse(readFileSync(resolve(file), 'utf8')) as PlanItem[];
    const store = openStore(root);
    const findings = lintUsage(store, plan);
    store.close();
    for (const f of findings) console.log(`[${f.level}] ${f.component ? f.component + ': ' : ''}${f.message}`);
  });

// --- import ----------------------------------------------------------------

program
  .command('import <file>')
  .description('Import a seed file (tokens, components, patterns, guidelines)')
  .action((file: string) => {
    const { root } = needProject();
    const seed = JSON.parse(readFileSync(resolve(file), 'utf8'));
    const store = openStore(root);
    const r = applySeed(store, seed);
    store.close();
    console.log(`Imported: ${r.tokens} tokens, ${r.components} components, ${r.patterns} patterns, ${r.guidelines} guidelines.`);
  });

// --- export ----------------------------------------------------------------

program
  .command('export')
  .description('Regenerate tokens.css, design.md, and the Claude Code skill from the store')
  .action(() => {
    const { root, config } = needProject();
    const store = openStore(root);
    const files = exportProject(store, root, config);
    store.close();
    console.log('Exported →');
    for (const f of files) console.log(`  ${f}`);
  });

// --- feature (scoped build prompt) -----------------------------------------

program
  .command('feature')
  .description('Assemble a scoped build prompt for a feature from the design system')
  .option('--intent <text>', 'what you are building')
  .option('--component <name>', 'a component to include (repeatable)', collect, [])
  .option('--screen <name>', 'a screen to include (repeatable)', collect, [])
  .option('--flow <name>', 'a flow to include')
  .action((opts: { intent?: string; component: string[]; screen: string[]; flow?: string }) => {
    const { root } = needProject();
    const store = openStore(root);
    const prompt = buildFeaturePrompt(store, {
      intent: opts.intent,
      components: opts.component.length ? opts.component : undefined,
      screens: opts.screen.length ? opts.screen : undefined,
      flow: opts.flow,
    });
    store.close();
    console.log(prompt);
  });

// --- serve (visualizer + API) ----------------------------------------------

program
  .command('serve')
  .description('Run the visualizer + API at localhost (React app over the store)')
  .option('-p, --port <port>', 'port', '4321')
  .action(async (opts: { port: string }) => {
    const { root } = needProject();
    const { startServer } = await import('@dsk/server');
    startServer({ root, port: Number(opts.port) });
  });

// --- mcp-config ------------------------------------------------------------

program
  .command('mcp-config')
  .description('Write a .mcp.json so Claude Code connects to this project’s design-system MCP server')
  .action(() => {
    const { root } = needProject();
    writeMcpConfig(root);
    console.log('Wrote .mcp.json (HTTP → http://localhost:4321/mcp).');
    console.log('Run `dsk serve` so Claude Code can read/lint/author the design system over MCP.');
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err);
  process.exit(1);
});
