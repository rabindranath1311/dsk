# Implementation Plan

**Status:** v2 (post-pivot) · **Date:** 2026-07-13 · Companion to [ARCHITECTURE_PRD.md](ARCHITECTURE_PRD.md)

Working CLI name `dsk` is a placeholder until the product is named.

> **2026-07-13 pivot.** The earlier three-level framing — with a Level 1 "Studio"/factory that stamped and updated isolated client copies — is gone; that code was deleted. The project is now **one self-contained CLI toolkit per design system** (one folder = one design system), built as three faces over a single `@dsk/core`:
> - **BUILDER** — the `dsk` CLI (`init`, `token set`, `component new`, `pattern`, `guideline`, `import`, `export`, `feature`, `recommend`, `lint`) plus MCP authoring tools.
> - **VIEWER** — `dsk serve`: a React visualizer that boots straight into the current project (no project picker).
> - **THE DESIGN SYSTEM ITSELF** — the store: a human-readable markdown file repo (`dsk init --files`) or SQLite. The living design-system memory.
> - **AGENT SURFACE** — MCP-over-HTTP from `dsk serve` (10 tools) plus exports (`design.md`, `AGENTS.md`, `tokens.css`, `SKILL.md`, `.mcp.json`).

---

## 1. How we'll approach it

- **Build the walking skeleton first.** The thinnest end-to-end slice that proves "the store is the source of truth → exports" before any polish.
- **Prove the agent loop early (Milestone 2), not last.** The whole thesis is "a real Claude Code session reads/writes/lints against the memory." We demo that as soon as possible.
- **One folder = one design system.** No levels, no factory, no multi-project orchestrator. Each design system is a single self-contained toolkit you run in its own folder; you act as your own first user.
- **One package, local-first.** No server to host, no LLM inside the tool. The store is a SQLite file (or a markdown file repo) in the folder; exports are git-tracked text beside it.
- **Dogfood.** We build it with Claude Code, and use its own MCP/exports on itself as soon as M2 lands.

---

## 2. The one decision to make up front: the stack

**Recommendation: a TypeScript / Node monorepo.**

Why TS/Node over reusing the Second Brain Python stack:
- One language across the core, CLI, MCP server, and React visualizer → a single shippable package the client runs.
- `npx dsk` distribution — no Python-env friction for enterprise front-end teams (who are JS/TS shops).
- The MCP TypeScript SDK is first-class; SQLite via `better-sqlite3` (sync, embedded); Style Dictionary (the standard DTCG→CSS/Tailwind tool) is JS-native.
- We already decided to rebuild the visualizer in React, and the flow/token editors we're porting are already JavaScript.

What we reuse from Second Brain becomes **design/logic reference, not copied code**: the `Page`/`meta` model, the MCP tool shapes, the exporter logic, and the flow/IA/token-gallery interaction patterns.

> Alternative (if speed-to-first-demo matters more than a clean foundation): reuse the Second Brain Python backend + vanilla-JS frontend as-is for a fast prototype. The cost is a split Python+TS stack, clunkier client distribution, and growing the 7,925-line `app.js` the review already flagged. I don't recommend it for the real build — but it's a valid 1-week spike.

**This was the load-bearing decision, now settled.** The build is TS/Node throughout.

---

## 3. Repo structure (monorepo)

```
dsk/                     ← pnpm workspace (+ turbo optional)
└── packages/
    ├── core/            ← @dsk/core, THE KERNEL — depends on nothing in here
    │   ├── store/       ← SQLite (better-sqlite3) or markdown files: nodes + edges, migrations
    │   ├── model/       ← Node types, kinds, DTCG token logic
    │   ├── domain/      ← validation, naming-lint, recommend + lint_usage engine
    │   └── export/      ← tokens→CSS/Tailwind (Style Dictionary), design.md/AGENTS.md/SKILL.md
    ├── cli/             ← @dsk/cli — the `dsk` BUILDER command (built on core)
    ├── mcp/             ← @dsk/mcp — MCP server (TS SDK) wrapping core ops — stdio + HTTP
    ├── server/          ← @dsk/server — `dsk serve`: local HTTP (Hono) = web + JSON API + /mcp
    └── web/             ← @dsk/web — React visualizer (Vite + React + TS), the VIEWER
```

`core` is the single source-of-truth logic; `cli`, `mcp`, `server`, `web` are all thin faces over it — the BUILDER (`dsk` CLI + MCP authoring), the VIEWER (`dsk serve`), and the AGENT SURFACE (MCP-over-HTTP + exports), all over the one store. This is the "three faces over one core" architecture made literal.

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
  origin    TEXT,               -- DORMANT: leftover from the removed factory; slated for removal
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
- **doc** — `{ source, text }` (imported reference material).

The **decision index** (intent → component) is derived by querying components' `intents[]` + `usage`, not stored separately.

---

## 5. Build sequence (milestones)

| # | Milestone | What we build | Face | Status |
|---|---|---|---|---|
| **M0** | Walking skeleton | monorepo + `core` (SQLite, nodes/edges, token CRUD) + `dsk` CLI (`init`/`token`/`export`) + DTCG→CSS exporter + basic `design.md` | Store + BUILDER | ✅ Done — edit a token → `tokens.css` + `design.md` regenerate; the store is the source of truth. |
| **M1** | Components + definition layer | `component`/`pattern`/`guideline` kinds + usage metadata + decision index + the rich `design.md` + a skill file | Store + BUILDER | ✅ Done — a component's usage rules round-trip into agent-readable form. |
| **M2** | MCP + agent surface (the thesis) | `mcp` server (stdio + HTTP): `search`, `get_component`, `list_tokens`, `recommend_component`, `component_guidance`, `create_component`, `lint_usage`, … (10 tools) + generated `.mcp.json` | AGENT SURFACE | ✅ Done — in a real Claude Code session the agent recommends, lints, and writes a component back, live. |
| **M3** | React visualizer | `dsk serve` (server + web + `/mcp`) boots straight into the current project + token gallery + editable component browser with usage rules | VIEWER | ✅ Done — open `localhost`, edit the design system visually, exports regenerate. |
| **M4** | IA + flows (the add-on) | `screen`/`flow` kinds + React flow/IA canvas + `build_feature_prompt` / `dsk feature` (CLI + MCP) | BUILDER + VIEWER | ✅ Done — sketch a feature flow → scoped spec → Claude Code builds it. |
| **M5** | Installable toolkit | publish `@dsk/*` to npm — or ship a single compiled binary — so a user runs `dsk` in their own design-system folder without the monorepo | Packaging | ⏳ Next — the real "installable toolkit" step. |

M0–M4 are complete: the single toolkit's store, BUILDER, VIEWER, and AGENT SURFACE all work end-to-end. Typecheck is clean across all 5 packages and 26 Vitest tests pass; the toolkit round-trips the full model (tokens, components, patterns, guidelines, IA, flows, docs, assets). M5 — making it installable outside the monorepo — is the one substantive piece of work left.

---

## 6. What's left (concretely)

All five packages — `@dsk/core`, `@dsk/cli`, `@dsk/mcp`, `@dsk/server`, `@dsk/web` — exist and work. Typecheck is clean across all five; 26 Vitest tests pass; the toolkit round-trips the full model. The genuinely-remaining work:

1. **Make it installable (M5).** Publish `@dsk/*` to npm — or ship a single compiled binary — so a user runs `dsk` inside their own design-system folder without cloning the monorepo. This is the real "installable toolkit" step and the one substantive milestone left.
2. **Strip the dormant fields.** The model still carries unused `origin` / `visibility` / `config.recipe` fields left over from the removed factory. Remove them from the schema, model, migrations, and exporters.
3. **Name the product.** `dsk` is still a placeholder; pick a real name + npm namespace before publishing.

That's the shortlist between "works in the monorepo" and "a design-system team installs `dsk` and runs it in their own folder."

---

## 7. Decisions (mostly settled)

These were the open questions during the build; all but the last are now resolved.

1. **Stack** — ✅ TS/Node clean build. *(Was load-bearing; done.)*
2. **Store on disk** — ✅ both shipped: SQLite by default, or a human-readable markdown file repo via `dsk init --files`. (Exports are git-friendly text either way.)
3. **First export target** — ✅ CSS variables + `design.md` baseline, plus `AGENTS.md` / `SKILL.md` / `.mcp.json`; Tailwind via Style Dictionary.
4. **MCP transport** — ✅ stdio first, plus local HTTP served from `dsk serve`.
5. **Name + namespace** — ⏳ still open; `dsk` is a placeholder and blocks publishing under a real npm namespace.

---

## 8. How we build it together

We build with Claude Code, milestone by milestone. Since M2 landed, we point a Claude Code session at the generated `.mcp.json` and have it build a component against the memory — dogfooding the thesis directly. Each milestone ends with a runnable demo, not just code.

Suggested next move: pick the name + namespace, then publish `@dsk/*` (or a single compiled binary) so `dsk serve` and the BUILDER CLI run standalone in any design-system folder — the M5 installable step. After that, strip the dormant `origin` / `visibility` / `config.recipe` fields.
