// Drives the REAL stdio MCP server as a subprocess — exactly how Claude Code
// connects. Run: DSK_ROOT=<project> tsx packages/mcp/scripts/smoke.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..'); // packages/mcp/scripts -> repo root
const tsxBin = resolve(repoRoot, 'node_modules/.bin/tsx');
const serverEntry = resolve(repoRoot, 'packages/mcp/src/index.ts');

const root = process.env.DSK_ROOT;
if (!root) {
  console.error('Set DSK_ROOT to a dsk project.');
  process.exit(1);
}

const transport = new StdioClientTransport({
  command: tsxBin,
  args: [serverEntry],
  env: { ...(process.env as Record<string, string>), DSK_ROOT: root },
});
const client = new Client({ name: 'smoke', version: '0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log('tools:', tools.map((t) => t.name).join(', '));

const rec = await client.callTool({
  name: 'recommend_component',
  arguments: { problem: 'confirm a destructive action' },
});
console.log('\nrecommend_component("confirm a destructive action"):');
console.log((rec as any).content[0].text);

const lint = await client.callTool({
  name: 'lint_usage',
  arguments: { plan: [{ component: 'ConfirmDialog', purpose: 'non-blocking success message' }] },
});
console.log('\nlint_usage(ConfirmDialog for a non-blocking message):');
console.log((lint as any).content[0].text);

await client.close();
process.exit(0);
