# Design System Toolkit — Architecture PRD

**Status:** Draft v2 · **Date:** 2026-07-13 (single-toolkit pivot) · **Owner:** klikitat.tech

Each section gives the technical detail first, then a `> In plain words:` explanation directly below it.

---

## 0. TL;DR

One self-contained CLI toolkit per design system. **One folder = one design system.** No orchestrator, no client copies, no multi-project studio — just a single package (`@dsk/core`) with the design-system store at its center and **three faces** over it: a **Builder** (`dsk` CLI) that helps you build the system, a **Viewer** (`dsk serve`, a React app) that boots straight into the current project, and an **Agent surface** (MCP-over-HTTP + a static export bundle) so an AI agent can read the system or drive it live. The store — a human-readable markdown file repo (or SQLite) — *is* the living design-system memory; everything else is a projection of it. The toolkit contains no AI: it holds, serves, and checks; the thinking is done by whatever agent (Claude Code) connects to it.

> In plain words: This is a "brain" for one design system, living in one folder. It's a command-line kit for building the system, a web app for seeing and playing with it, and an AI connection — all wrapped around one shared rulebook stored as plain files. The kit itself doesn't think; it remembers, answers, and checks. The thinking is done by your AI.

---

## 1. Problem, goals, non-goals

**Problem.** Teams build software with AI agents (Claude Code), but the agent has no reliable, structured source of truth for the design system. `design.md` files drift, go stale, and can't be queried ("which component should I use here?"). Designers can't easily keep them in sync, and agents make inconsistent choices.

**Goals.**
1. A single structured source of truth for tokens, components, patterns, IA, and flows — queryable by an agent.
2. Keep it self-contained: one folder holds the whole design system, editable by hand and by tool.
3. Make the system *actively steer* the agent's decisions, not just store data.
4. Store the design system as human-readable files that live under git alongside (or as) the project.
5. Export to the formats real codebases consume (CSS/Tailwind tokens, skills, `AGENTS.md`).

**Non-goals.**
- Not an AI agent or assistant. No model runs inside the toolkit.
- Not a pixel design canvas. Screens/flows are information architecture, not mockups. (Tokens *are* visualized.)
- Not a multi-project orchestrator or hosted SaaS. There is no studio/factory that manages many design systems or stamps out copies.

> In plain words: AI assistants build apps but keep guessing at design decisions because the rules live in messy text files. We give them one tidy, reliable rulebook — kept in a single folder, editable by a person or a tool, that their AI can look things up in and get checked against. We are not building another chatbot, a Figma, or a multi-tenant platform.

---

## 2. Core mental model — three bets

The whole architecture rests on three decisions:

**Bet 1 — One folder, one design system.** The toolkit is self-contained: a single package (`@dsk/core`) whose store, CLI, viewer, and MCP server all point at one design system living in one directory. No orchestrator, no locked "client copies," no environment-role switch — the whole thing *is* the design system you're working on, and shipping it means handing over the folder.

**Bet 2 — The store is the single source of truth; everything else is a projection.** The structured store *is* the design-system memory. The CLI, the React viewer, the exported `design.md`/skills/CSS, and the agent talking over MCP are all just different windows onto that one store. Change the store → every window updates.

**Bet 3 — Backend, not agent.** The toolkit is a store + CLI + MCP server + exporters + thin UI. Simple things (tokens, naming, IA, flows) are edited directly by a human via the CLI or the viewer; the harder *creation* (detailed components, organisms, templates) is authored by the connected agent (Claude Code) via MCP. The toolkit itself runs no model.

> In plain words: (1) One folder is one design system — there's no master version and no copies. (2) There's one rulebook store, and everything you see or export is just a printout of it, so nothing can fall out of sync. (3) The program itself is "dumb" on purpose: it holds, serves, and checks the rules; your AI does the building.

---

## 3. One core, three faces

The design system is the **store** at the center; around it sits one core package (`@dsk/core`: the store + domain logic — validation, naming-lint, the `recommend`/`lint_usage` engine, exporters) exposed through **three faces**, each the right tool for a different job. None of the faces *is* the system — the store is; each is a window onto it.

### 3.1 The store — the design system itself

The living design-system memory, kept as a **human-readable markdown file repo** (`dsk init --files`) or SQLite. This is the source of truth from Bet 2: every token, component, pattern, guideline, screen, and flow is a page in this store (data model in §4). Because it's plain files under git, the design system gets free history, branching, and diffing, and the exports sit right beside it.

### 3.2 Face 1 — Builder (`dsk` CLI)

The machine that helps you build the design system. The workhorse for *doing*: `dsk init` (scaffold a new design system; `--files` for the markdown store), `dsk token set`, `dsk component new`, `dsk pattern`, `dsk guideline`, `dsk import` (pull in existing `design.md`/brand docs), `dsk export`, `dsk feature`, `dsk recommend "..."`, `dsk lint`. Scriptable, composable, deterministic — which also makes it an excellent agent interface: a connected Claude Code can drive it from Bash. Used by both the human power-user and the agent. Authoring the hard components can also flow through MCP (§3.4).

### 3.3 Face 2 — Viewer (`dsk serve`)

The local React app for *seeing and playing*. It boots straight into the current project — **no project picker**, because one folder is one design system. It shows: a **token gallery** (visualized), an **atomic component browser** with the full **usage/definition layer** (when/whenNot, alternatives, do/dont, a11y, per-variant guidance), the **IA + user-flow canvas** where you drag screens, wire flows, and arrange architecture, the **docs** and **assets**, and a **build-a-feature** surface for sketching a new feature against the real graph. Full editor for the directly-editable things (tokens, IA, flows); a visualize-and-plan surface for the agent-authored ones (detailed components/organisms). Lifted from the Second Brain prototype's token gallery, `flow`/`screen` editors, and feature builder.

### 3.4 Face 3 — Agent surface (MCP + exports)

The native agent surface, served **over HTTP by `dsk serve`**, so a connected Claude Code reads/writes the memory while building. An agent can consume the system **two ways**: read it *statically* from the exported bundle (§6), or drive it *live* over MCP. CLI and MCP overlap on purpose — same core, two calling conventions. The MCP tool surface (ten tools) is detailed in §5.

**The feature loop (the point of it):** plan in the Viewer (sketch the flow, pick screens/components) → the Viewer assembles a scoped spec from the real graph (`build_feature_prompt`) → handed to the connected Claude Code via MCP → the agent builds, reading tokens/components via `dsk`/MCP and running `lint_usage` to check its plan, writing new organisms/templates back into the store → they reappear in the Viewer for the next feature.

### 3.5 The data layer (docs) — grounding

Reference material attached to the design system as ordinary pages: brand guidelines, PRDs, docs, text, inspiration. Agents read these for grounding (via MCP search and via the exported bundle). No new infrastructure — they're just pages marked as read-only reference.

> In plain words: The design system itself is one rulebook stored as plain files. Around it are three ways in: a command-line toolkit for *doing* things (which your AI also uses), a React app for *seeing and playing* with the whole system and planning features on a flow canvas, and an AI connection that can either read an exported copy or work the live system. Plus a pile of supporting docs — brand guides, specs — so the AI has full context. To add a feature: sketch it in the app, the app bundles up exactly what's needed, your AI builds it and files the result back — and it shows up in the app, ready for the next thing.

---

## 4. The data model — the design-system memory

### 4.1 The Page envelope (reused from the Second Brain prototype)

Everything is a `Page`:
```
id        ULID
kind      what it is (selects the renderer + behavior)
title
tags[]    filtering / grouping
mentions[] graph edges to other pages
meta      free-form JSON bag (the typed payload per kind)
body      markdown
+ schema_version
```
Because one folder is one design system, there's no per-tenant `project` / `visibility` / `origin` bookkeeping — every page simply belongs to this design system. (Personal reference pointers that must stay out of exports are handled in §10.)

> In plain words: Every single thing in the system — a color, a button, a rule, a screen — is stored in the same simple "card" format. A `kind` label says what type of card it is. This uniformity is what lets one set of tools handle everything.

### 4.2 Atomic design hierarchy

Components carry `meta.level`: `atom | molecule | organism | template`. Composition is expressed as typed edges (which atoms make up a molecule, which molecules make up an organism). This makes impact analysis possible: "which organisms break if I change this atom?"

> In plain words: Design pieces go from small to big — atoms (a color, a button) → molecules (a search box) → organisms (a header) → templates (a page layout). We record what's made of what, so you can ask "if I change this, what else is affected?"

### 4.3 Tokens — DTCG native

Tokens follow the W3C Design Tokens (DTCG) spec: `$value`, `$type`, groups, aliases/references, and modes (light/dark, brand themes). DTCG is the **hub format** that CSS variables, Tailwind config, and Style Dictionary all derive *from*.
```json
{ "color": { "brand": { "primary": { "$value": "#1F6FEB", "$type": "color" },
                          "primary-hover": { "$value": "{color.brand.primary}", "$type": "color" } } } }
```

> In plain words: Colors, spacing, fonts, etc. are stored in one standard format. From that single source we automatically generate whatever the code needs (plain CSS, Tailwind, etc.), so the design values and the code can never disagree.

### 4.4 The component-definition layer (the differentiator)

Each `component` page carries usage intelligence in `meta`:
```yaml
intents: [submit-form, primary-action]      # the jobs it does (searchable)
when_to_use: "Primary action on a view; max one per region."
when_not_to_use: "Navigation → use Link; destructive → Button variant=danger + confirm."
alternatives:
  - { use: Link, when: "navigating, not committing" }
pairs_with: [FormField, Toast]
do:   ["one primary per region", "verb-first label"]
dont: ["'Click here'", "two primaries stacked"]
a11y: "44px min target; never color-only state."
variants:
  - { name: danger, when: "irreversible actions, always with confirm" }
```
Plus two new kinds for cross-component decisions:
- `kind: pattern` — a recommended solution to a recurring problem (destructive-confirmation, empty-state, multi-step-form); mentions the components it composes + the rationale.
- `kind: guideline` / `convention` — cross-cutting rules (spacing rhythm, density, tone, naming) that *govern* components via graph edges.

And a **decision/selection index** (intent → component): `"pick one of 2–5 options" → SegmentedControl (over Select, RadioGroup — few options)`.

> In plain words: This is what makes it a "design system" and not just a parts list. For every component we record *when to use it, when not to, what to use instead, and what not to do*. We also store named solutions to common problems and the rules that span the whole system. So when the AI asks "what should I use here?", it gets a real, reasoned answer — not a guess.

### 4.5 IA & flows

Reused from the Second Brain prototype: `kind: screen` (an IA node — purpose, states, UI elements as mentions) and `kind: flow` (a user-flow graph — nodes, edges with statechart annotations `trigger [condition] → outcome`, phase bands). Not pixel canvases — structure.

> In plain words: We map out the app's screens and how users move between them as a flowchart, not as detailed mockups. This tells the AI how the product is organized and what each screen is for.

---

## 5. The MCP surface — how humans and agents co-edit

The MCP server (served over HTTP by `dsk serve`) exposes **ten tools** the connected Claude Code calls. Split by who does what:

**Read (grounding the agent):**
```
search(query)                        → relevant pages
get_component(name)                  → full component card incl. usage rules
list_tokens(group?)                  → tokens (DTCG)
recommend_component(problem)         → ranked components + rationale + governing pattern
component_guidance(name)             → when_to_use / alternatives / do-dont / a11y
list_flows()                         → the IA / user-flow graph
build_feature_prompt(intent, ...)    → a scoped prompt assembled from real graph data
                                       (evolved from the prototype's fbBuildPrompt)
```
**Write (the agent authors the hard stuff, the human sets the simple stuff):**
```
set_token(name, value)               → add / update a token
create_component(level, name, meta)  → new molecule / organism / template
```
**Check (the system steers the agent):**
```
lint_usage(plan)  → flags violations BEFORE code is written
                    ("Modal used for a non-blocking message — guideline says Toast")
```
**Human-vs-agent split.** Tokens, naming, IA, flows → directly editable in the CLI / Viewer (`set_token` mirrors this for the agent). Detailed components, organisms, templates → authored by the agent via `create_component`. Both write paths pass through one `write_page()` chokepoint that lints naming/conventions identically.

> In plain words: Your AI talks to the rulebook through a set of commands. It can look things up ("what component fits this?"), build new things ("create this organism"), and — the clever part — get its plan checked against the rules before writing any code. Simple stuff (colors, names, screens, flows) the human edits by hand; complicated stuff the AI builds. Either way, every change is checked the same way.

---

## 6. The export / projection pipeline

The store is truth; exports are regenerated views, never hand-edited:
- **Tokens** → `tokens.dtcg.json` → `tokens.css` (CSS custom properties) / Tailwind config / Style Dictionary (build only the format used first).
- **Memory** → `design.md` + `AGENTS.md` + `.claude/skills/design-system/SKILL.md` + `.mcp.json`.

This exported bundle is exactly what lets an agent consume the system *statically*: `design.md` (the human/agent-readable rulebook), `AGENTS.md`, `tokens.css`, the Claude skill, and `.mcp.json` (which points a connecting agent at the live MCP server). What makes the exported `design.md` *better* than a hand-written one: it carries machine-usable decision rules, anti-patterns, and the selection index — not just a component inventory. Regeneration is triggered on save (write-through), so exports never drift. Round-trip: DTCG re-imports losslessly.

> In plain words: From the one rulebook we automatically produce the files a codebase actually uses — token files, an AI instructions file, reusable "skills," and the config that wires an AI up to the live system. Because they're generated, not typed by hand, they're always current. And they're smarter than normal design docs because they include the "when to use what" rules the AI can act on. An AI can either read this exported copy or connect to the live system.

---

## 7. Starting a design system — init & import

There's no factory and no deploy step — you *create* a design system in place and grow it.

- **`dsk init`** scaffolds a new, empty design system in the current folder; **`dsk init --files`** lays it out as the human-readable markdown file repo (SQLite is the alternative store).
- **`dsk import`** pulls existing `design.md` / brand docs into the store as §3.5 reference pages, and (optionally, with your own Claude Code) drafts starter tokens + atoms from them for you to review in the Viewer.
- From there you add usage rules, patterns, and conventions (the component-definition layer, §4.4) by hand via the CLI / Viewer, or by having the agent author them.

There is no versioned "recipe," no provisioning of isolated copies, and no propagation to other instances — the folder *is* the design system, and "sharing it" means sharing the folder (§8).

> In plain words: You don't stamp out copies from a factory. You run one command to create a fresh design system right where you're working, optionally point it at your old design docs to get a head start, and build it up from there. If you want to hand it to someone, you hand them the folder.

---

## 8. Packaging & delivery

**One self-contained package = the store + three faces (Builder CLI, Viewer, Agent/MCP — see §3).** Ship it as a git repo (a folder). Running `dsk serve` hosts the React viewer + a small JSON API + the **MCP-over-HTTP** endpoint in one process on `localhost`; the `dsk` CLI talks to the same store directly. A connecting Claude Code auto-wires via the generated `.mcp.json`. Updates are just `git pull` on the folder.

**Store = a markdown file repo (or SQLite), living in the repo.** The design-system store is either the human-readable markdown file repo (`dsk init --files`) or a single SQLite file, committed inside the repo. This puts the design-system memory *under git alongside the code* (free history / branching / merge) and means the exports (`design.md`, `tokens.css`, skills, `.mcp.json`) sit right next to it as the human/agent-readable projection. The `pages` CRUD seam abstracts the backend, so file-repo vs SQLite (vs Postgres for any hosted surface) is a swap, not a rewrite.

Why local-first wins: the design system is just files on your machine (residency ✓), there's nothing to host, and "share it" literally means handing over a folder. A local MCP on `localhost` isn't internet-exposed, so the auth surface mostly disappears.

**HuggingFace / hosted Spaces:** public demo only — not how the toolkit is normally used.

**Rejected:** adopting OpenClaw or Hermes as platforms — they bundle an AI agent we explicitly don't want. (Their MCP-auth/gateway patterns are worth borrowing only if a hosted surface is ever added.)

> In plain words: The design system is a folder you run on your own computer — one command to start it. Your AI connects to it locally. This keeps the data on your machine, makes security simple, and costs nothing to host. Sharing it is just handing over the folder (or `git pull`). We don't put it on a public website except for demos, and we don't build on top of other AI-assistant platforms because we don't need their AI.

---

## 9. Security

Because the toolkit is local-first — one folder, one design system, on your own machine — most of the classic attack surface simply isn't there: there's no shared server, no multi-tenant store, and nothing to leak between projects. Two things still matter:

- **MCP binding.** `dsk serve` exposes MCP-over-HTTP on `localhost`; it is not internet-exposed. If a hosted surface is ever added, that `/mcp` endpoint must require a per-deployment token (today it's open by design because it's local).
- **Personal data never enters exports.** If you reference personal Second Brain material while authoring (§10), the share/export boundary must hard-drop anything marked personal, so private notes never end up in `design.md` or a shipped folder.

> In plain words: Running everything as files on your own computer removes most of the security worry — there's no shared server and no other tenants' data to reach. The two things to keep honest: don't expose the local AI connection to the internet without a password, and make sure any private notes you reference while building never get baked into the files you share.

---

## 10. Personal data bridge (Second Brain ↔ Design-systems)

Requirement: reference your personal Second Brain docs/inspiration while authoring a design system, but **never** leak personal data into the shipped design system (its exports or the folder you share).

**Don't merge the stores.** Keep Second Brain its own private store; the design system its own. Bridge with two mechanisms:
1. **Reference (pointer, personal-only)** — link a Second Brain page into the design system's view; resolved only in *your* session; **stripped from every exported artifact and the shared folder**. Zero duplication, zero leak.
2. **Promote-to-store (explicit copy)** — deliberately copy one chosen item's content into the design-system store when it should become part of the deliverable.

The bridge is an MCP tool (`reference_personal_page`) available only in your personal session; the export boundary (§9) enforces that referenced-but-not-promoted pages never ship.

Rule to hold onto: **personal data is referenced, never absorbed; only an explicit promotion makes something part of the design system.**

> In plain words: You keep a private collection of notes and inspiration (your Second Brain). You can *point to* those while building a design system for your own eyes, but those pointers vanish from anything you export or hand off. If you actually want a piece of inspiration to become part of the design system, you consciously copy that one thing in. Private stays private unless you deliberately move it.

---

## 11. End-to-end workflows

**A) Start a design system.**
1. `dsk init --files` in a folder; optionally `dsk import` your existing `design.md` / brand files as §3.5 reference pages.
2. Your own Claude Code can draft starter tokens + atoms from those docs; you review/edit in the Viewer.
3. Add usage rules, patterns, and conventions (the component-definition layer) by hand or via the agent.

**B) Build a feature (the loop).**
1. In the Viewer, sketch the feature — pick screens/components on the flow canvas; `build_feature_prompt` assembles a scoped spec from the real graph.
2. Your Claude Code grounds itself with `recommend_component` / `component_guidance` and proposes a plan.
3. `lint_usage` checks the plan against the rules *before* code is written; the agent builds using the exported tokens/components.
4. New organisms/templates it authors are saved back into the store via `create_component` — and reappear in the Viewer for the next feature.

**C) Hand the design system to an agent.**
1. `dsk export` regenerates the bundle (`design.md`, `AGENTS.md`, `tokens.css`, the Claude skill, `.mcp.json`).
2. An agent either reads the bundle statically, or connects live over MCP via `.mcp.json` and drives the system.

> In plain words: (A) You create a design system, optionally from your old files, and build it up. (B) You tell your AI to build something; it sketches on the canvas, checks the rulebook, gets its plan approved, builds it, and files what it made back into the rulebook. (C) When you want an AI to use the system, you either hand it the exported files or point it at the live connection.

---

## 12. Build roadmap (lean, first-system-first)

| Phase | Goal | Proves |
|---|---|---|
| **0 — Core + store (wk 1)** | Lift the Second Brain prototype → `@dsk/core`; trim kinds; the markdown file-repo store + `pages` CRUD seam; `dsk init` | One folder holds a working design-system store |
| **1 — Tokens + exporters (wk 2)** | DTCG token model; the one exporter used first; `design.md` + `AGENTS.md` + skill + `.mcp.json` regen on save | Edit a token → exported files change in lockstep (no drift) |
| **2 — Definition layer + agent (wk 3–4)** | component-definition layer + `recommend`/`lint_usage`; MCP-over-HTTP via `dsk serve`; the 10-tool surface | A connected Claude Code builds a component honoring the tokens |
| **3 — Viewer + feature loop (wk 5–7)** | React Viewer (token gallery, component browser, IA/flow canvas, build-a-feature); `pattern`/`guideline` kinds + graph | Sketch a feature in the Viewer → agent builds it → it reappears |
| **4 — Hardening (wk 8+)** | revisions/history via git; import polish; docs/assets; optional SQLite backend | Real day-to-day authoring of a design system end-to-end |

Deferred: the 4-format token hub (build the first-used format first), the atomic-graph impact-analysis refactor, and a Postgres/hosted backend (only if a hosted surface is ever added).

> In plain words: Build in order of "what proves the idea works." First: one folder that holds the rulebook. Then: prove the rulebook drives the exported files. Then: prove an AI can build against it and get checked. Then: the React app and the full sketch-build-refile loop. Fancier bits (multi-format tokens, impact analysis, a hosted backend) wait until they're actually needed.

---

## 13. Open decisions

1. ~~Does the toolkit need a GUI at all?~~ **RESOLVED:** one core with three faces — a `dsk` CLI (Builder), a React Viewer (`dsk serve`), and an MCP-over-HTTP Agent surface (§3). Store is a markdown file repo (`dsk init --files`) or SQLite in the repo (§8).
2. **`pattern`/`guideline` as first-class kinds vs. richer `meta` on components.** First-class buys graph queries ("which components does this guideline govern") at the cost of more surface.
3. **First export target** — React+Tailwind / plain CSS vars / Vue+Web Components / decide-at-first-use.
4. **Store backend for v1** — markdown file repo (great git diffs, human-readable) vs SQLite (richer queries). The `pages` seam keeps this a swap.
5. **Build stack** — lift the hyperscript renderers from the Second Brain prototype, or rebuild the Viewer in React? (The direction leans toward a real React app for the Viewer.)
6. **Agent via CLI vs MCP** — ship both over the shared core (recommended), or pick one? Some teams prefer giving the agent a great CLI over MCP tools; both are cheap once the core exists.

> In plain words: A handful of forks we should settle as we go: how formal the "rules" storage is; which code format we export first; whether the store is plain files or SQLite to start; what we build the screens with; and whether the AI works through the command-line, the structured connection, or both. (The big one — "does it get a screen?" — is settled: yes, a React app, plus a command-line toolkit, plus the AI connection.)

---

## 14. Top risks

1. **Export drift / source-of-truth erosion** — if any face lets you edit a projection instead of the store, the "one rulebook" promise breaks. Mitigate: every write goes through the `write_page()` chokepoint; exports are regenerated on save, never hand-edited.
2. **Token-model migration** — the Second Brain prototype is mid-migration (legacy → `meta.sets[]`); we're going to DTCG. Migrate cleanly and update the prompt builder, or the agent reads stale shapes.
3. **A thin definition layer** — if components ship without real when/whenNot/alternatives/do-dont, the system degrades to a parts list and the agent is back to guessing. Mitigate: make the definition layer the thing `lint_usage` and `recommend` depend on, so it's load-bearing, not optional.
4. **Prototype code scale** — the Second Brain `app.js` is a 7,925-line single file, no tests. Build the Viewer fresh; lift only proven renderers; add a smoke-test harness.

> In plain words: The things most likely to bite: someone editing a printout instead of the real rulebook so they fall out of sync; a messy half-finished token format; a "design system" that's really just a parts list because nobody filled in the usage rules; and an old giant code file that's hard to grow. We have a specific plan for each.
