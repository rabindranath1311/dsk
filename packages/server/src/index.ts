import { findProject } from '@dsk/core';
import { startServer } from './server.js';

// One design system: serve the folder we're standing in (or DSK_ROOT).
const root = process.env.DSK_ROOT ?? findProject()?.root;
if (!root) {
  console.error('Not a dsk project. Run `dsk init` first, or `cd` into a design system.');
  process.exit(1);
}
startServer({ root, port: Number(process.env.PORT ?? 4321) });
