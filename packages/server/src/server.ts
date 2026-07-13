import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createServer as createMcpServer } from '@dsk/mcp';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findProject,
  openStore,
  listTokens,
  setToken,
  listComponents,
  getComponent,
  upsertComponent,
  listPatterns,
  listGuidelines,
  listScreens,
  getScreen,
  upsertScreen,
  listFlows,
  getFlow,
  upsertFlow,
  listIA,
  getIA,
  upsertIA,
  deleteIA,
  deleteToken,
  deleteComponent,
  listDocs,
  getDoc,
  upsertDoc,
  deleteDoc,
  listAssets,
  saveAsset,
  readAsset,
  deleteAsset,
  recommend,
  lintUsage,
  buildFeaturePrompt,
  exportProject,
} from '@dsk/core';

const WEB_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../web/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function countsFor(root: string) {
  const store = openStore(root);
  const cfg = findProject(root)?.config;
  const counts = {
    tokens: listTokens(store).length,
    components: listComponents(store).length,
    patterns: listPatterns(store).length,
    guidelines: listGuidelines(store).length,
    screens: listScreens(store).length,
    flows: listFlows(store).length,
    ia: listIA(store).length,
    docs: listDocs(store).length,
    assets: cfg ? listAssets(root, cfg.exportDir).length : 0,
  };
  store.close();
  return counts;
}

export function buildApp(root: string) {
  const app = new Hono();

  // Single design system: every request serves the folder the server was started
  // in. (`?project=` is ignored — Layer 1's multi-project studio is gone.)
  const rootOf = (_c?: any): string | null => root;

  // --- the design system ---
  const withStore = (c: any) => {
    const root = rootOf(c);
    if (!root) return null;
    return { root, store: openStore(root), config: findProject(root)!.config };
  };
  const reexport = (root: string, store: any) => {
    const cfg = findProject(root)?.config;
    if (cfg) exportProject(store, root, cfg);
  };

  app.get('/api/project/overview', (c) => {
    const root = rootOf(c);
    if (!root) return c.json({ error: 'no project' }, 400);
    const cfg = findProject(root)?.config;
    return c.json({ name: cfg?.name ?? 'Project', root, storage: cfg?.storage ?? 'sqlite', counts: countsFor(root) });
  });

  app.get('/api/project/tokens', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const t = listTokens(ctx.store);
    ctx.store.close();
    return c.json(t);
  });
  app.put('/api/project/tokens/:path', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as { value: string; type?: any };
    setToken(ctx.store, c.req.param('path'), body.value, { type: body.type });
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok: true });
  });

  app.get('/api/project/components', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const x = listComponents(ctx.store);
    ctx.store.close();
    return c.json(x);
  });
  app.get('/api/project/components/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const x = getComponent(ctx.store, c.req.param('name'));
    ctx.store.close();
    return x ? c.json(x) : c.json({ error: 'not found' }, 404);
  });
  app.put('/api/project/components/:name', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as any;
    upsertComponent(ctx.store, { name: c.req.param('name'), ...body });
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok: true });
  });
  app.delete('/api/project/components/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const ok = deleteComponent(ctx.store, c.req.param('name'));
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok });
  });
  app.delete('/api/project/tokens/:path', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const ok = deleteToken(ctx.store, c.req.param('path'));
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok });
  });

  // --- docs (the data layer) ---
  app.get('/api/project/docs', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const x = listDocs(ctx.store);
    ctx.store.close();
    return c.json(x);
  });
  app.get('/api/project/docs/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const x = getDoc(ctx.store, c.req.param('name'));
    ctx.store.close();
    return x ? c.json(x) : c.json({ error: 'not found' }, 404);
  });
  app.put('/api/project/docs/:name', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as { type?: string; tags?: string[]; body?: string };
    upsertDoc(ctx.store, c.req.param('name'), { type: body.type, tags: body.tags }, body.body);
    ctx.store.close();
    return c.json({ ok: true });
  });
  app.delete('/api/project/docs/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const ok = deleteDoc(ctx.store, c.req.param('name'));
    ctx.store.close();
    return c.json({ ok });
  });

  // --- assets (icons / images) ---
  const cfgExportDir = (root: string) => findProject(root)?.config.exportDir ?? 'design-system';
  app.get('/api/project/assets', (c) => {
    const root = rootOf(c);
    if (!root) return c.json([]);
    return c.json(listAssets(root, cfgExportDir(root)));
  });
  app.post('/api/project/assets', async (c) => {
    const root = rootOf(c);
    if (!root) return c.json({ error: 'no project' }, 400);
    const { name, data } = (await c.req.json()) as { name: string; data: string };
    return c.json(saveAsset(root, cfgExportDir(root), name, data));
  });
  app.delete('/api/project/assets/:name', (c) => {
    const root = rootOf(c);
    if (!root) return c.json({ error: 'no project' }, 400);
    return c.json({ ok: deleteAsset(root, cfgExportDir(root), c.req.param('name')) });
  });
  app.get('/api/project/asset/:name', (c) => {
    const root = rootOf(c);
    if (!root) return c.text('no project', 400);
    const buf = readAsset(root, cfgExportDir(root), c.req.param('name'));
    if (!buf) return c.text('not found', 404);
    const ext = c.req.param('name').slice(c.req.param('name').lastIndexOf('.')).toLowerCase();
    return c.body(new Uint8Array(buf), 200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
  });

  for (const [route, fn] of [
    ['patterns', listPatterns],
    ['guidelines', listGuidelines],
    ['screens', listScreens],
    ['flows', listFlows],
  ] as const) {
    app.get(`/api/project/${route}`, (c) => {
      const ctx = withStore(c);
      if (!ctx) return c.json([]);
      const x = (fn as any)(ctx.store);
      ctx.store.close();
      return c.json(x);
    });
  }

  // --- flows (interactive canvas: create / save positions+edges / delete) ---
  app.get('/api/project/flows/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const x = getFlow(ctx.store, c.req.param('name'));
    ctx.store.close();
    return x ? c.json(x) : c.json({ error: 'not found' }, 404);
  });
  app.put('/api/project/flows/:name', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as { nodes?: any[]; edges?: any[]; sections?: any[] };
    upsertFlow(ctx.store, c.req.param('name'), {
      nodes: body.nodes ?? [],
      edges: body.edges ?? [],
      sections: body.sections ?? [],
    });
    ctx.store.close();
    return c.json({ ok: true });
  });
  app.delete('/api/project/flows/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const n = ctx.store.byName('flow', c.req.param('name'));
    if (n) ctx.store.delete(n.id);
    ctx.store.close();
    return c.json({ ok: !!n });
  });

  // --- IA (app-map graphs: same engine as flows, no edge annotations) ---
  app.get('/api/project/ia', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const x = listIA(ctx.store);
    ctx.store.close();
    return c.json(x);
  });
  app.get('/api/project/ia/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const x = getIA(ctx.store, c.req.param('name'));
    ctx.store.close();
    return x ? c.json(x) : c.json({ error: 'not found' }, 404);
  });
  app.put('/api/project/ia/:name', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as { nodes?: any[]; edges?: any[]; sections?: any[] };
    upsertIA(ctx.store, c.req.param('name'), {
      nodes: body.nodes ?? [],
      edges: body.edges ?? [],
      sections: body.sections ?? [],
    });
    ctx.store.close();
    return c.json({ ok: true });
  });
  app.delete('/api/project/ia/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const ok = deleteIA(ctx.store, c.req.param('name'));
    ctx.store.close();
    return c.json({ ok });
  });

  // --- screens (IA: create / edit structured form / delete) ---
  app.get('/api/project/screens/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const x = getScreen(ctx.store, c.req.param('name'));
    ctx.store.close();
    return x ? c.json(x) : c.json({ error: 'not found' }, 404);
  });
  app.put('/api/project/screens/:name', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const body = (await c.req.json()) as any;
    upsertScreen(ctx.store, c.req.param('name'), {
      purpose: body.purpose,
      states: body.states,
      components: body.components,
      uiElements: body.uiElements,
    });
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok: true });
  });
  app.delete('/api/project/screens/:name', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ error: 'no project' }, 400);
    const n = ctx.store.byName('screen', c.req.param('name'));
    if (n) ctx.store.delete(n.id);
    reexport(ctx.root, ctx.store);
    ctx.store.close();
    return c.json({ ok: !!n });
  });

  app.get('/api/project/recommend', (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const x = recommend(ctx.store, c.req.query('q') ?? '');
    ctx.store.close();
    return c.json(x);
  });
  app.post('/api/project/lint', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json([]);
    const x = lintUsage(ctx.store, await c.req.json());
    ctx.store.close();
    return c.json(x);
  });
  app.post('/api/project/feature', async (c) => {
    const ctx = withStore(c);
    if (!ctx) return c.json({ prompt: '' });
    const prompt = buildFeaturePrompt(ctx.store, await c.req.json());
    ctx.store.close();
    return c.json({ prompt });
  });

  // --- MCP over HTTP (the client's Claude Code plugs in here) ---
  // This is what makes `dsk serve` a single command that gives the client BOTH
  // the visualizer AND the design-system MCP — no monorepo paths in .mcp.json.
  // Stateless: a fresh server+transport per request (the SDK forbids reusing a
  // stateless transport), with a buffered JSON response so cleanup is safe.
  app.all('/mcp', async (c) => {
    const root = rootOf(c);
    if (!root) return c.json({ error: 'no project — run `dsk serve` inside a project or pass ?project=' }, 400);
    const store = openStore(root);
    const server = createMcpServer(store);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    const res = await transport.handleRequest(c.req.raw);
    await transport.close();
    await server.close();
    store.close();
    return res;
  });

  // --- static (the React visualizer) ---
  app.get('/*', (c) => {
    const reqPath = c.req.path === '/' ? '/index.html' : c.req.path;
    const safe = normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
    let file = join(WEB_DIST, safe);
    if (!existsSync(file) || !file.startsWith(WEB_DIST)) file = join(WEB_DIST, 'index.html');
    if (!existsSync(file)) return c.text('The visualizer is not built yet. Run `npm run build:web`.', 200);
    return c.body(readFileSync(file), 200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  });

  return app;
}

export interface ServeOptions {
  root: string;
  port?: number;
}

export function startServer({ root, port = 4321 }: ServeOptions): void {
  const name = findProject(root)?.config.name ?? 'design system';
  serve({ fetch: buildApp(root).fetch, port }, (info) => {
    console.log(`dsk · ${name} → http://localhost:${info.port}`);
  });
}
