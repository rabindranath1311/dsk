import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { findProject, openStore } from '@dsk/core';
import { createServer } from './server.js';

// Resolve the project: DSK_ROOT env (set by the generated .mcp.json) or cwd.
const root = process.env.DSK_ROOT ?? findProject()?.root;
if (!root) {
  console.error('No dsk project found. Set DSK_ROOT or run from inside a project.');
  process.exit(1);
}

const store = openStore(root);
const server = createServer(store);

const transport = new StdioServerTransport();
await server.connect(transport);

const shutdown = () => {
  store.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
