import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  type NodeStore,
  listTokens,
  setToken,
  getComponent,
  recommend,
  search,
  lintUsage,
  upsertComponent,
  listFlows,
  buildFeaturePrompt,
  type NewComponentInput,
} from '@dsk/core';

function text(data: unknown) {
  return {
    content: [
      { type: 'text' as const, text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) },
    ],
  };
}

/**
 * Build the MCP server over a store. The same surface the client's Claude Code
 * calls to read, get checked by, and write back to the design-system memory.
 */
export function createServer(store: NodeStore): McpServer {
  const server = new McpServer({ name: 'design-system', version: '0.0.1' });

  server.tool(
    'search',
    'Search the design system (components, tokens, patterns) by keyword.',
    { query: z.string() },
    async ({ query }) => text(search(store, query)),
  );

  server.tool(
    'list_tokens',
    'List design tokens, optionally filtered by group (color, space, radius, ...).',
    { group: z.string().optional() },
    async ({ group }) =>
      text(
        listTokens(store).filter((t) => !group || t.token.group === group || t.path.startsWith(`${group}.`)),
      ),
  );

  server.tool(
    'get_component',
    'Get a component card: level, intents, props, variants, usage rules, tokens used.',
    { name: z.string() },
    async ({ name }) => {
      const c = getComponent(store, name);
      return c ? text(c) : text(`No component "${name}".`);
    },
  );

  server.tool(
    'component_guidance',
    'When to use a component, when not to, alternatives, and accessibility notes.',
    { name: z.string() },
    async ({ name }) => {
      const c = getComponent(store, name);
      if (!c) return text(`No component "${name}".`);
      return text({ name: c.name, level: c.level, intents: c.data.intents, usage: c.data.usage });
    },
  );

  server.tool(
    'recommend_component',
    'Which component fits a described problem or intent? Returns ranked candidates with reasons.',
    { problem: z.string() },
    async ({ problem }) => text(recommend(store, problem)),
  );

  server.tool(
    'lint_usage',
    'Check a proposed UI plan against the design system BEFORE writing code. Each item is a component plus the purpose it is being used for.',
    { plan: z.array(z.object({ component: z.string(), purpose: z.string().optional() })) },
    async ({ plan }) => text(lintUsage(store, plan)),
  );

  server.tool(
    'set_token',
    'Create or update a design token by dotted path (e.g. color.brand.primary "#1F6FEB"). Value may be an alias like "{color.brand.primary}". This is the agent authoring path for tokens.',
    {
      path: z.string(),
      value: z.string(),
      type: z.enum(['color', 'dimension', 'number', 'duration', 'fontFamily', 'fontWeight', 'string']).optional(),
      description: z.string().optional(),
    },
    async (args) => {
      const node = setToken(store, args.path, args.value, { type: args.type, description: args.description });
      const t = node.data as { $value: unknown; $type: string };
      return text({ saved: args.path, value: t.$value, type: t.$type });
    },
  );

  server.tool(
    'create_component',
    'Create or update a component in the design system — the agent authoring components back into the memory. Carries the FULL definition: level, intents, tokens, the usage rules (when/whenNot/alternatives/pairsWith/do/dont/a11y), variants, props, and `body` = the exact use-cases on THIS project written as prose.',
    {
      name: z.string(),
      level: z.enum(['atom', 'molecule', 'organism', 'template']).optional(),
      intents: z.array(z.string()).optional(),
      tokensUsed: z.array(z.string()).optional(),
      when: z.string().optional(),
      whenNot: z.string().optional(),
      alternatives: z.array(z.object({ use: z.string(), when: z.string() })).optional(),
      pairsWith: z.array(z.string()).optional(),
      do: z.array(z.string()).optional(),
      dont: z.array(z.string()).optional(),
      a11y: z.string().optional(),
      variants: z.array(z.object({ name: z.string(), when: z.string().optional() })).optional(),
      props: z.array(z.object({ name: z.string(), type: z.string().optional(), default: z.string().optional(), description: z.string().optional() })).optional(),
      body: z.string().optional(),
    },
    async (args) => {
      const input: NewComponentInput = { name: args.name, level: args.level };
      if (args.intents) input.intents = args.intents;
      if (args.tokensUsed) input.tokensUsed = args.tokensUsed;
      if (args.variants) input.variants = args.variants;
      if (args.props) input.props = args.props;
      if (args.body) input.body = args.body;
      const usage: NonNullable<NewComponentInput['usage']> = {};
      if (args.when) usage.when = args.when;
      if (args.whenNot) usage.whenNot = args.whenNot;
      if (args.alternatives) usage.alternatives = args.alternatives;
      if (args.pairsWith) usage.pairsWith = args.pairsWith;
      if (args.do) usage.do = args.do;
      if (args.dont) usage.dont = args.dont;
      if (args.a11y) usage.a11y = args.a11y;
      if (Object.keys(usage).length) input.usage = usage;
      const node = upsertComponent(store, input);
      return text({ saved: node.name, level: node.level });
    },
  );

  server.tool(
    'list_flows',
    'List user flows / information architecture in the design system.',
    {},
    async () => text(listFlows(store).map((f) => ({ name: f.name, nodes: f.data.nodes.length, edges: f.data.edges.length }))),
  );

  server.tool(
    'build_feature_prompt',
    'Assemble a scoped build prompt for a feature from the design system: the tokens to honor, the components to use (with their rules), the screens, the flow, and the governing guidelines. Pass an intent (and optionally explicit components/screens/flow).',
    {
      intent: z.string().optional(),
      components: z.array(z.string()).optional(),
      screens: z.array(z.string()).optional(),
      flow: z.string().optional(),
    },
    async (args) => text(buildFeaturePrompt(store, args)),
  );

  return server;
}
