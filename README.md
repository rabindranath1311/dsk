# dsk — design-system memory toolkit

Working name. A single self-contained toolkit for one product's design system,
built for humans and AI coding assistants. One folder = one design system. It
**builds** the design system, **shows** it, and lets an **agent use it** — no
multi-project orchestrator. See [HOW-IT-WORKS.md](HOW-IT-WORKS.md).

## The three faces (over one core)

- `@dsk/core` — the kernel: the store (human-readable file repo or SQLite), the node model, DTCG tokens, exporters. The source of truth.
- `@dsk/cli` — the `dsk` command: **the builder** (init, token, component, pattern, guideline, import, export, feature, recommend, lint).
- `@dsk/server` + `@dsk/web` — `dsk serve`: **the viewer** (React visualizer) + JSON API + the MCP endpoint, one process.
- `@dsk/mcp` — **the agent surface**: the MCP server the client's Claude Code plugs into to read/lint/author the design system.

## Develop

```sh
npm install
npm test          # vitest

# run the CLI (M0): init → set tokens → export
npm run dsk -- init --name "Acme"
npm run dsk -- token set color.brand.primary "#1F6FEB"
npm run dsk -- token set color.action "{color.brand.primary}"
npm run dsk -- export
# → writes design-system/tokens.css and design-system/design.md
```

## Status

The store is the source of truth; everything else is a projection. Editing a
token and re-exporting regenerates `tokens.css` + `design.md`. Builder (CLI),
viewer (`dsk serve`), and the agent surface (MCP) are three faces over the same
`@dsk/core`. The design system ships as the file repo + exports
(`design.md`/`AGENTS.md`/`tokens.css`/`SKILL.md`/`.mcp.json`) so an agent can
read it statically or drive it live over MCP.
