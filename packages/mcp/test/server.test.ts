import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Store, upsertComponent, upsertGuideline } from '@dsk/core';
import { createServer } from '../src/server.js';

function seeded(): Store {
  const store = new Store(':memory:');
  upsertComponent(store, {
    name: 'Toast',
    level: 'molecule',
    intents: ['notify', 'non-blocking-message'],
    usage: { when: 'Show a brief, non-blocking message.' },
  });
  upsertComponent(store, {
    name: 'ConfirmDialog',
    level: 'organism',
    intents: ['confirm-destructive', 'blocking-decision'],
    usage: { when: 'Block to confirm a destructive action.', whenNot: 'non-blocking feedback — use Toast' },
  });
  upsertGuideline(store, 'Non-blocking uses Toast', {
    rule: 'Non-blocking messages use Toast, never a dialog.',
    governs: ['Toast', 'ConfirmDialog'],
  });
  return store;
}

async function connect(store: Store): Promise<Client> {
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await createServer(store).connect(serverT);
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(clientT);
  return client;
}

function payload(res: any): any {
  return JSON.parse(res.content[0].text);
}

describe('mcp server', () => {
  it('advertises the design-system tools', async () => {
    const { tools } = await (await connect(seeded())).listTools();
    expect(tools.map((t) => t.name)).toEqual(
      expect.arrayContaining([
        'search',
        'list_tokens',
        'get_component',
        'component_guidance',
        'recommend_component',
        'lint_usage',
        'create_component',
        'set_token',
      ]),
    );
  });

  it('recommend_component ranks the right component first', async () => {
    const client = await connect(seeded());
    const res = await client.callTool({
      name: 'recommend_component',
      arguments: { problem: 'non-blocking success message' },
    });
    expect(payload(res)[0].component).toBe('Toast');
  });

  it('lint_usage flags the wrong component for a purpose', async () => {
    const client = await connect(seeded());
    const res = await client.callTool({
      name: 'lint_usage',
      arguments: { plan: [{ component: 'ConfirmDialog', purpose: 'non-blocking success message' }] },
    });
    const warn = payload(res).find((f: any) => f.level === 'warn');
    expect(warn?.message).toContain('prefer Toast');
  });

  it('create_component writes back to the store', async () => {
    const store = seeded();
    const client = await connect(store);
    await client.callTool({
      name: 'create_component',
      arguments: { name: 'Badge', level: 'atom', intents: ['status'], when: 'Show a small status label.' },
    });
    expect(store.list('component').map((n) => n.name)).toContain('Badge');
  });

  // The visualizer is read-only for components, so MCP must be able to author
  // the FULL definition — usage rules AND the exact-use-cases prose body.
  it('create_component authors the full definition incl. prose body', async () => {
    const store = seeded();
    const client = await connect(store);
    await client.callTool({
      name: 'create_component',
      arguments: {
        name: 'Button', level: 'atom', intents: ['submit-form'],
        when: 'Commit an action on the current view.',
        whenNot: 'Navigation — use Link.',
        alternatives: [{ use: 'Link', when: 'navigating rather than committing' }],
        do: ['One primary button per region'], dont: ['"Click here" labels'],
        a11y: 'Minimum 44px touch target.',
        variants: [{ name: 'primary', when: 'the single main action' }],
        body: 'On checkout, the primary Button says "Pay $X" and is disabled until the form validates.',
      },
    });
    const res = await client.callTool({ name: 'get_component', arguments: { name: 'Button' } });
    const c = payload(res);
    expect(c.data.usage.alternatives[0].use).toBe('Link');
    expect(c.data.usage.dont).toContain('"Click here" labels');
    expect(c.data.variants[0].name).toBe('primary');
    expect(c.body).toContain('Pay $X');
  });

  it('set_token authors a token', async () => {
    const store = seeded();
    const client = await connect(store);
    await client.callTool({ name: 'set_token', arguments: { path: 'color.brand.primary', value: '#1F6FEB' } });
    expect(store.list('token').map((n) => n.name)).toContain('color.brand.primary');
  });
});
