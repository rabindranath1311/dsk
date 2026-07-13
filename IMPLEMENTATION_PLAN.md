# Implementation Plan

**Status:** Draft v1 · **Date:** 2026-06-30 · Companion to [ARCHITECTURE_PRD.md](ARCHITECTURE_PRD.md)

Working CLI name `dsk` is a placeholder until the product is named.

---

## 1. How we'll approach it

- **Build the walking skeleton first.** The thinnest end-to-end slice that proves "the store is the source of truth → exports" before any polish.
- **Prove the agent loop early (Milestone 2), not last.** The whole thesis is "a real Claude Code session reads/writes/lints against the memory." We demo that as soon as possible.
- **Build Level 2 fully before Level 1.** The client tool is the core value; you act as your own first "client." The studio/factory (L1) comes after the L2 loop works end-to-end.
- **One package, local-first.** No server to host, no LLM inside the tool. The store is a SQLite file in the repo; exports are git-tracked text beside it.
- **Dogfood.** We build it with Claude Code, and use its own MCP/exports on itself as soon as M2 lands.

---

## 2. The one decision to make up front: the stack

**Recommendation: a TypeScript / Node monorepo for Level 2.**

Why TS/Node over reusing the Second Brain Python stack:
- One language across the core, CLI, MCP server, and React visualizer → a single shippable package the client runs.
- `npx dsk` distribution — no Python-env friction for enterprise front-end teams (who are JS/TS shops).
- The MCP TypeScript SDK is first-class; SQLite via `better-sqlite3` (sync, embedded); Style Dictionary (the standard DTCG→CSS/Tailwind tool) is JS-native.
- We already decided to rebuild the visualizer in React, and the flow/token editors we're porting are already JavaScript.

What we reuse from Second Brain becomes **design/logic reference, not copied code**: the `Page`/`meta` model, the MCP tool shapes, the exporter logic, and the flow/IA/token-gallery interaction patterns.

> Alternative (if speed-to-first-demo matters more than a clean foundation): reuse the Second Brain Python backend + vanilla-JS frontend as-is for a fast prototype. The cost is a split Python+TS stack, clunkier client distribution, and growing the 7,925-line `app.js` the review already flagged. I don't recommend it for the real build — but it's a valid 1-week spike.

**This is the decision to confirm before any code.** Everything below assumes TS/Node.

---

## 3. Repo structure (monorepo)

```
dsk/                     ← pnpm workspace (+ turbo optional)
├── packages/
│   ├── core/            ← THE KERNEL — depends on nothing in here
│   │   ├── store/       ← SQLite (better-sqlite3): nodes + edges, migrations
│   │   ├── model/       ← Node types, kinds, DTCG token logic
│   │   ├── domain/      ← validation, naming-lint, recommend + lint_usage engine
│   │   └── export/      ← tokens→CSS/Tailwind (Style Dictionary), design.md/skills/agents.md
│   ├── cli/             ← `dsk` command (built on core) — clipanion/commander
│   ├── mcp/             ← MCP server (TS SDK) wrapping core ops — stdio + HTTP
│   ├── server/          ← `dsk serve`: local HTTP (Hono) = web build + JSON API + /mcp
│   └── web/             ← React visualizer (Vite + React + TS), talks to server API
└── (studio/ added at M5 for Level 1)
```

`core` is the single source of truth logic; `cli`, `mcp`, `server`, `web` are all thin faces over it. This is the "one core, three faces" architecture made literal.

---

## 4. The data model (concrete)

One node table (the `Page` model), one edges table for the graph:

```sql
nodes(
  id        TEXT PRIMARY KEY,   -- ULID
  kind      TEXT NOT NULL,      -- token | component | pattern | guideline | screen | flow | doc
  name      TEXT,               -- stable, human-readable
  level     TEXT,               -- atom | molecule | organism | template  (components only)
  data      JSON,               -- typed payload per kind (the "meta" bag)
  body      TEXT,               -- markdown notes
  origin    TEXT,               -- recipe | client  (for the L1 factory merge later)
  created   TEXT, updated TEXT
);
edges(
  src TEXT, dst TEXT,
  type TEXT  -- composes | governs | uses-token | pairs-with | reached-from | refers
);
```

Typed payloads (`data`):
- **token** — DTCG: `{ $value, $type, $description, group, modes? }` (aliases as `{token.path}` refs).
- **component** — `{ props[], variants[], sizes, tokensUsed[], intents[], usage:{ when, whenNot, alternatives[], pairsWith[], do[], dont[], a11y } }`.
- **pattern** — `{ problem, solution, componentsUsed[], rationale }`.
- **guideline** — `{ rule, scope, governs[] }`.
- **screen** — `{ purpose, states[], uiElements[] }`.
- **flow** — `{ nodes[], edges[], sections[] }`.
- **doc** — `{ source, text }` (Level-3 reference material).

The **decision index** (intent → component) is derived by querying components' `intents[]` + `usage`, not stored separately.

---

## 5. Build sequence (milestones)

| # | Milestone | What we build | Proves |
|---|---|---|---|
| **M0** | Walking skeleton | monorepo + `core` (SQLite, nodes/edges, token CRUD) + `dsk` CLI (`init`/`token`/`export`) + DTCG→CSS exporter + basic `design.md` | Edit a token → `tokens.css` + `design.md` regenerate. Store is the source of truth. |
| **M1** | Components + definition layer | `component`/`pattern`/`guideline` kinds + usage metadata + decision index + the rich `design.md` + a skill file | A component's usage rules round-trip into agent-readable form. |
| **M2** | MCP + steering (the thesis) | `mcp` stdio server: `search`, `get_component`, `list_tokens`, `recommend_component`, `component_guidance`, `create_component`, `lint_usage` + generated `.mcp.json` | In a real Claude Code session, the agent recommends, lints, and writes a component back — live. |
| **M3** | React visualizer | `dsk serve` (server + web + `/mcp`) + token gallery (visualized) + component browser with usage rules, editable | Open `localhost`, edit the design system visually, exports regenerate. |
| **M4** | IA + flows (the add-on) | `screen`/`flow` kinds + React flow/IA canvas (port the Second Brain editor design) + `build_feature_prompt` (CLI + MCP) | Sketch a feature flow → scoped spec → Claude Code builds it. |
| **M5** | Studio + factory (Level 1) | L1 studio (multi-project) + recipe manifest + `dsk deploy` (stamp an isolated copy) + visibility tiers + the Second Brain bridge | Onboard a project and stamp an isolated client copy. |

M0–M4 build Level 2 completely; M5 adds Level 1. The agent loop (M2) is proven less than halfway through.

---

## 6. The first week (M0, concretely)

1. Confirm the stack (Section 2) and reserve a name/namespace.
2. `pnpm` workspace + `packages/core`: `better-sqlite3`, the `nodes`/`edges` schema + a migration runner, a `Node` type, token CRUD, one Vitest test.
3. DTCG→CSS exporter (start hand-rolled or Style Dictionary) + a `design.md` generator.
4. `packages/cli`: `dsk init`, `dsk token set/list`, `dsk export`.
5. Run it in a throwaway repo: `dsk init` → `dsk token set color.brand.primary "#1F6FEB"` → `dsk export` writes `tokens.css` + `design.md`. **M0 done.**

That's a self-contained first PR that makes the core thesis tangible.

---

## 7. Decisions to settle (the details to talk through)

1. **Stack** — TS/Node clean build (recommended) vs reuse Second Brain Python for a fast spike. *Load-bearing; confirm first.*
2. **Store on disk** — single SQLite file committed in the repo (recommended) vs files-as-truth+index vs SQLite + a JSON snapshot for git diffs. (Exports are git-friendly text either way.)
3. **First export target** — CSS variables + `design.md` baseline (recommended); add Tailwind/React component scaffolds when a real consumer needs them.
4. **MCP transport** — stdio first (simplest for Claude Code), add local HTTP once `dsk serve` exists (recommended).
5. **L2-first** — build the client tool fully, then L1 (recommended) vs scaffold the studio in parallel.
6. **Name + namespace** — blocks nothing, but fixes package names.

---

## 8. How we build it together

We build with Claude Code, milestone by milestone. The moment M2 lands, we point a Claude Code session at the generated `.mcp.json` and have it build a component against the memory — dogfooding the thesis immediately. Each milestone ends with a runnable demo, not just code.

Suggested first move: confirm the stack, then I scaffold M0 (the monorepo + core + the `dsk init/token/export` slice) so you can see `tokens.css` + `design.md` generated from the store on day one.
