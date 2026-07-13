# Design System Platform — Architecture PRD

**Status:** Draft v1 · **Date:** 2026-06-29 · **Owner:** klikitat.tech

Each section gives the technical detail first, then a `> In plain words:` explanation directly below it.

---

## 0. TL;DR

A 3-layer platform that turns a design system into **structured memory an AI agent can read and write over MCP**, instead of scattered `design.md` files. You (the studio) author and fine-tune a client's design system in **Level 1**, then stamp out an **isolated Level 2 tool** the client runs locally and connects their own Claude Code to. The tool itself contains no AI — it's a backend: a store, an MCP server, exporters, and a thin UI. The agent lives in the client's Claude Code.

> In plain words: We're building a "brain" for a product's design system. You set it up for a client, hand them a copy, and their AI coding assistant uses that brain to build their app consistently. The brain doesn't think on its own — it remembers, answers, and checks. The thinking is done by the client's AI.

---

## 1. Problem, goals, non-goals

**Problem.** Enterprise teams build software with AI agents (Claude Code), but the agent has no reliable, structured source of truth for the design system. `design.md` files drift, go stale, and can't be queried ("which component should I use here?"). Designers can't easily keep them in sync, and agents make inconsistent choices.

**Goals.**
1. A single structured source of truth for tokens, components, patterns, IA, and flows — queryable by an agent.
2. Author once (Level 1), deliver an isolated, consistent per-client copy (Level 2).
3. Keep the client's design data on the client's machine (enterprise residency).
4. Make the system *actively steer* the agent's decisions, not just store data.
5. Export to the formats real codebases consume (CSS/Tailwind tokens, skills, `CLAUDE.md`).

**Non-goals.**
- Not an AI agent or assistant. No model runs inside the tool.
- Not a pixel design canvas. Screens/flows are information architecture, not mockups. (Tokens *are* visualized.)
- Not a multi-tenant SaaS for client data — clients run their own copy.

> In plain words: AI assistants build apps but keep guessing at design decisions because the rules live in messy text files. We give them one tidy, reliable rulebook — set up by us, owned and run by the client, that their AI can look things up in and get checked against. We are not building another chatbot or a Figma.

---

## 2. Core mental model — three bets

The whole architecture rests on three decisions:

**Bet 1 — One kernel, two roles.** Level 1 (Studio) and Level 2 (client tool) are the *same codebase*, switched by an environment flag (`DSK_ROLE` / `PROJECT_LOCK`). Studio = unlocked, sees all projects. Client = locked to one project, fewer edit capabilities. No fork, no second tool to maintain.

**Bet 2 — The store is the single source of truth; everything else is a projection.** The structured database *is* the design-system memory. The UI editors, the exported `design.md`/skills/CSS, and the agent talking over MCP are all just different windows onto that one store. Change the store → every window updates.

**Bet 3 — Backend, not agent.** The tool is a store + MCP server + exporters + thin UI. All *creation* (building components, organisms, templates) happens in the client's Claude Code via MCP. Level 1 also allows direct manual editing of simple things (tokens, naming).

> In plain words: (1) There's one program; a setting decides whether it's your master version or the client's locked copy. (2) There's one rulebook database, and everything you see or export is just a printout of it — so nothing can fall out of sync. (3) The program itself is "dumb" on purpose: it holds and serves the rules; the client's AI does the building.

---

## 3. The three layers

### 3.1 Level 1 — Studio (the creator / super-tool)

The kernel booted unlocked. Adds a multi-project dashboard on top of the client toolset:
- **Project registry** — every client design system you manage, with its recipe version and deploy status.
- **Onboarding** — drop a client's `design.md` files (stored as Level-3 reference pages); the user's *own* Claude Code drafts starter atoms/tokens for review (no in-tool AI).
- **Recipe editor** — edit the blueprint that defines how a Level-2 build is configured.
- **Deploy panel / CLI** — stamp an isolated Level-2 instance.
- **Studio-only powers** — edit recipes, the kind whitelist, naming-convention rules, export templates; reference personal data (Section 10).

Audience: you, and maybe colleagues. This is the sensitive surface (it holds *many* clients' systems), so it gets the strong auth + isolation boundary (Section 9).

> In plain words: Level 1 is your control room. You see all your clients, set up a new one from their existing notes, tune their design system, and press "deploy" to send them their own copy. You and your team use this; clients never see it.

### 3.2 Level 2 — Isolated tool (per client, one project): one local core, three faces

The kernel locked to a single project, delivered as **one local package** with a **local core** (the store + domain logic: validation, naming-lint, the `recommend`/`lint_usage` engine, exporters) exposed through **three faces**, each the right tool for a different job. None of the faces *is* the system — the store is; each is a window onto it.

- **Face 1 — `dsk` CLI (the toolkit).** The workhorse for *doing*: `dsk component new`, `dsk token set`, `dsk recommend "..."`, `dsk lint`, `dsk export tokens --tailwind`, `dsk flow new checkout`. Scriptable, composable, deterministic — which also makes it an excellent agent interface: the client's Claude Code drives it from Bash. Used by both the human power-user and the agent.
- **Face 2 — React visualizer (`dsk serve`).** The local web app for *seeing and playing*: token gallery (visualized), component browser with usage rules, and the **IA + user-flow canvas** where the client drags screens, wires flows, arranges architecture, and sketches a new feature. Full editor for the directly-editable things (tokens, IA, flows); visualize-and-plan surface for the agent-authored ones (detailed components/organisms). Lifted from Second Brain's token gallery + `flow`/`screen` editors + feature builder.
- **Face 3 — MCP server.** The native agent surface; mirrors the core ops as structured tools so Claude Code reads/writes the memory while building. CLI and MCP overlap on purpose — same core, two calling conventions.

`dsk serve` hosts the React build + a small JSON API + the MCP endpoint in one process; the CLI talks to the same store directly. Knows one project; exposes fewer edit capabilities than Studio.

**The feature loop (the point of it):** plan in React (sketch the flow, pick screens/components) → React assembles a scoped spec from the real graph (`build_feature_prompt`) → handed to the client's Claude Code via MCP → the agent builds, reading tokens/components via `dsk`/MCP and running `lint_usage` to check its plan, writing new organisms/templates back into the store → they reappear in React for the next feature.

> In plain words: Level 2 is the copy you hand the client, and it has three ways in: a command-line toolkit for *doing* things (which their AI also uses), a React app for *seeing and playing* with the whole design system and planning new features on a flow canvas, and an AI connection. They're three doors into one shared rulebook. To add a feature: sketch it in the React app, the app bundles up exactly what's needed, the client's AI builds it and files the result back — and it shows up in the app, ready for the next thing.

### 3.3 Level 3 — Data layer

Reference material attached to a project as ordinary pages: brand guidelines, PRDs, docs, text, inspiration. Agents read these for grounding (via MCP search and via the exported bundle). No new infrastructure — they're just pages marked as read-only reference.

> In plain words: Level 3 is the pile of supporting documents — brand guides, product specs — that sit next to the design system so the AI has the full context, not just the components.

---

## 4. The data model — the design-system memory

### 4.1 The Page envelope (reused from Second Brain)

Everything is a `Page`:
```
id        ULID
kind      what it is (selects the renderer + behavior)
title
tags[]    filtering / grouping
mentions[] graph edges to other pages
meta      free-form JSON bag (the typed payload per kind)
body      markdown
+ project    (denormalized — which project this belongs to; indexed)
+ visibility (personal | studio | client:<id>)
+ origin     (recipe | client — who authored it; for safe updates)
+ schema_version
```

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

> In plain words: Colors, spacing, fonts, etc. are stored in one standard format. From that single source we automatically generate whatever the client's code needs (plain CSS, Tailwind, etc.), so the design values and the code can never disagree.

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

Reused from Second Brain: `kind: screen` (an IA node — purpose, states, UI elements as mentions) and `kind: flow` (a user-flow graph — nodes, edges with statechart annotations `trigger [condition] → outcome`, phase bands). Not pixel canvases — structure.

> In plain words: We map out the app's screens and how users move between them as a flowchart, not as detailed mockups. This tells the AI how the product is organized and what each screen is for.

---

## 5. The MCP surface — how humans and agents co-edit

The Level-2 MCP server (local) exposes tools the client's Claude Code calls. Split by who does what:

**Read (grounding the agent):**
```
ds.search(query)                       → relevant pages
ds.get_component(name)                 → full component card incl. usage rules
ds.list_tokens(group?)                 → tokens (DTCG)
ds.recommend_component(problem)        → ranked components + rationale + governing pattern
ds.component_guidance(name)            → when_to_use / alternatives / do-dont / a11y
ds.build_feature_prompt(intent, ...)   → a scoped prompt assembled from real graph data
                                         (evolved from Second Brain's fbBuildPrompt)
```
**Write (the agent authors the hard stuff):**
```
ds.create_component(level, name, meta) → new molecule/organism/template
ds.update_component(name, changes)
ds.add_pattern(...) / ds.add_guideline(...)
```
**Check (the system steers the agent):**
```
ds.lint_usage(plan)  → flags violations BEFORE code is written
                       ("Modal used for a non-blocking message — guideline says Toast")
```
**Human-vs-agent split.** Tokens, naming, simple props → directly editable in the UI. Detailed components, organisms, templates → authored by the agent via the write tools. Both write paths pass through one `write_page()` chokepoint that lints naming/conventions identically.

> In plain words: The client's AI talks to the rulebook through a set of commands. It can look things up ("what component fits this?"), build new things ("create this organism"), and — the clever part — get its plan checked against the rules before writing any code. Simple stuff (colors, names) the human edits by hand in the app; complicated stuff the AI builds. Either way, every change is checked the same way.

---

## 6. The export / projection pipeline

The store is truth; exports are regenerated views, never hand-edited:
- **Tokens** → `tokens.dtcg.json` → CSS custom properties / Tailwind config / Style Dictionary (build only the format the client uses first).
- **Memory** → `design.md` + `CLAUDE.md` + `.claude/skills/*` + `agents.md`.

What makes the exported `design.md` *better* than a hand-written one: it carries machine-usable decision rules, anti-patterns, and the selection index — not just a component inventory. Regeneration is triggered on save (write-through), so exports never drift. Round-trip: DTCG re-imports losslessly.

> In plain words: From the one rulebook we automatically produce the files a codebase actually uses — token files, an AI instructions file, reusable "skills." Because they're generated, not typed by hand, they're always current. And they're smarter than normal design docs because they include the "when to use what" rules the AI can act on.

---

## 7. The factory & recipe system (Level 1 → Level 2)

**A recipe** = a versioned, schema-validated manifest pinning what a build gets: which atoms/tokens, naming conventions, enabled features, branding, MCP tools, export targets.

**Deploy pipeline (`dsk deploy <project>`):**
1. **Provision** an isolated store for the client (separate schema, or separate DB for residency-sensitive clients).
2. **Seed** the recipe's atoms/tokens into it, tagging each `origin: recipe` with a stable id + `recipe_version`.
3. **Config** — generate the client's `.mcp.json` + `CLAUDE.md` + run config, locked to the new project.
4. **Export** the starter `design.md` / skills bundle.

**Updates to live clients.** Explicit and diff-based, never silent: a per-atom *merge* keyed by the stable recipe-origin id. Client-authored pages (`origin: client`) are never overwritten. Default policy = **notify** (operator triggers the migration); structural changes always pinned; token-value changes optionally auto-merge.

> In plain words: A "recipe" is the spec for a client's build — what colors, rules, and features they get. Deploying runs four steps: make them an empty box, fill it with the starter design system, wire up their AI to connect to it, and drop in the starter files. Later, if you improve the master recipe, clients get the update *only when you choose to push it*, and it never erases the work their AI already did.

---

## 8. Packaging & delivery

**Level 2 (client): a self-contained local package = one core + three faces (CLI, React viz, MCP — see §3.2).** Ship as a git repo template + Docker image. The client runs `dsk serve` (or `docker compose up`), which hosts the React visualizer + JSON API + **local MCP** (stdio or `localhost` HTTP) in one process; the `dsk` CLI talks to the same store directly. Their Claude Code auto-connects via the generated `.mcp.json`. Updates are pull-based (`git pull` / `docker pull` a pinned tag).

**Store = SQLite-per-project, living in the client's repo.** The design-system store is a single SQLite file committed inside the client's product repo (Postgres stays the option only for any hosted surface). This makes deploy = copy a folder, puts the design-system memory *under git alongside the code* (free history/branching/merge), and means the exports (`design.md`, `tokens.css`, skills) sit right next to it as the human/agent-readable projection. The `pages` CRUD seam abstracts the backend, so SQLite-local vs Postgres-hosted is a swap, not a rewrite.

Why local-first wins: the client's design system never leaves their machine (residency ✓), tenant isolation is *free* (it's their box — no shared-server leak surface), you host nothing, and "send it to your client" literally means handing over a repo/image. A local MCP isn't internet-exposed, so the auth surface mostly disappears.

**Level 1 (studio):** run private/local, or host small behind real auth (Cloudflare Access / Tailscale, or an OAuth MCP gateway pattern). This is the multi-project, sensitive surface.

**HuggingFace / hosted Spaces:** public demo only — not how clients receive the tool.

**Rejected:** adopting OpenClaw or Hermes as platforms — they bundle an AI agent we explicitly don't want. (Their MCP-auth/gateway patterns are worth borrowing only if Level 1 is ever public.)

> In plain words: The client gets the tool as a package they run on their own computer — one command to start it. Their AI connects to it locally. This keeps their data on their machine, makes security simple, and costs you nothing to host. Your control room (Level 1) you keep private. We don't put client tools on a public website, and we don't build on top of other AI-assistant platforms because we don't need their AI.

---

## 9. Security & isolation

**The #1 invariant (verified in code).** Tenant isolation must be enforced at the database query layer, **not** at `list_pages`. In the current Second Brain code, `read_page` and every by-id write (`write/update/delete_page`) query by raw id and bypass `list_pages` — so a project filter there alone would leak data by id. Enforce scope in one place: a `project_scope()` guard at the `db.client()` boundary (or on every `Page` leaving the kernel), covering read/write/delete + graph + search + MCP tools + asset URLs.

**Acceptance test (Phase 0, blocking).** A locked instance must get 404/empty for a *known foreign id* via `get_page`, `export_page`, graph, and search — not merely hidden from listings.

**MCP auth.** The current `/mcp` is unauthenticated with `CORS: *`. For local Level-2 this is mostly moot (not internet-exposed). For any hosted surface (Level 1, or hosted Level 2), `/mcp` must require a per-deployment token.

**Visibility tiers.** Every page carries `visibility` (`personal | studio | client:<id>`), enforced at the *same* scope chokepoint. The share/export boundary hard-drops anything `personal`.

> In plain words: The most important thing to get right: when a client's copy is locked to one project, it must be *impossible* for it to reach another project's data — even by guessing an ID. We enforce that in one central place and prove it with a test before building anything else. For client copies running locally this is easy; for anything we host, the AI connection needs a password. And a "who can see this" label on every item keeps private things from ever leaking into shared or client files.

---

## 10. Personal data bridge (Second Brain ↔ Design-systems)

Requirement: reference your personal Second Brain docs/inspiration into *your* projects (Level 1), but **never** leak personal data to colleagues (Level 1 shared) or clients (Level 2).

**Don't merge the databases.** Keep Second Brain its own private store; Design-systems its own. Bridge with two mechanisms:
1. **Reference (pointer, personal-only)** — link a Second Brain page into an L1 project view; resolved only in *your* session; **stripped from every shared/exported artifact**. Zero duplication, zero leak.
2. **Promote-to-project (explicit copy)** — deliberately copy one chosen item's content into the project store, tagged `studio` or `client:<id>`, when it should become part of the deliverable.

Both stores can live in one Supabase org as separate schemas; the bridge is an MCP tool (`reference_personal_page`) available only in your personal session. Same scope guard enforces `project` *and* `visibility`.

Rule to hold onto: **personal data is referenced, never absorbed; only an explicit promotion makes something shareable.**

> In plain words: You keep a private collection of notes and inspiration (your Second Brain). You can *point to* those from a client project for your own eyes, but those pointers vanish from anything you share or hand off. If you actually want a piece of inspiration to become part of a client's design system, you consciously copy that one thing in. Private stays private unless you deliberately move it.

---

## 11. End-to-end workflows

**A) Onboard a new client (you, in Level 1).**
1. Create the project; drop their existing `design.md` / brand files as Level-3 pages.
2. Your own Claude Code drafts starter tokens + atoms from those docs; you review/edit in the UI.
3. Add usage rules, patterns, and conventions (the component-definition layer).
4. `dsk deploy <project>` → isolated Level-2 package + generated AI config + exported bundle.

**B) Client builds a feature (client, in their Claude Code).**
1. Client asks their Claude Code to build, say, a settings page.
2. The agent calls `ds.recommend_component` / `ds.component_guidance` / `ds.build_feature_prompt` to ground itself in the real design system.
3. It proposes a plan; `ds.lint_usage` checks it against the rules; the agent writes code using the exported tokens/components.
4. New organisms/templates it authors are saved back into the memory via the write tools.

**C) Push a design update (you → live clients).**
1. You bump a token or rule in the recipe.
2. Clients are *notified*; you trigger an explicit, diff-based merge.
3. Recipe-origin items update; client-authored work is untouched.

> In plain words: (A) You set a client up from their old files and ship them a copy. (B) The client tells their AI to build something; the AI checks the rulebook, gets its plan approved, builds it, and files what it made back into the rulebook. (C) When you improve the master design, you push it to clients on purpose, and it never wipes out what they've already built.

---

## 12. Build roadmap (lean, first-client-first)

| Phase | Goal | Proves |
|---|---|---|
| **0 — Kernel + isolation (wk 1)** | Fork Second Brain → kernel; trim kinds; add `DSK_ROLE`/`PROJECT_LOCK`; enforce the db-layer scope guard; write the red-team test; add `0001_pages.sql` | A locked copy can never see another project's data, by any path |
| **1 — Tokens + exporters (wk 2)** | DTCG token model; the one exporter the first client uses; `design.md` + skills regen on save | Edit a token → exported files change in lockstep (no drift) |
| **2 — Factory + first client (wk 3–4)** | `dsk deploy` CLI; local MCP package; component-definition layer + `recommend`/`lint_usage` tools | Client's own Claude Code builds a component honoring the tokens |
| **3 — Studio + onboarding (wk 5–7)** | L1 multi-project dashboard; doc→atoms drafting; `pattern`/`guideline` kinds + graph; one-component-per-page | A new client onboarded from the UI without touching the DB |
| **4 — Propagation + hardening (wk 8+)** | recipe_lock + versioning; diff-based per-atom merge; revisions/history; auth/RBAC/audit as needed | Push a token update to clients without clobbering their work |

Deferred for client #1 (per review): recipe-propagation engine, the atomic-graph refactor, the 4-format token hub, the L1 studio UI (use the CLI), and the schema-migration framework.

> In plain words: Build in order of "what proves the idea works." First: make the locked copy provably safe. Then: prove the rulebook drives the exported files. Then: ship one real client and watch their AI build against it. Only after that do we build the fancy dashboard and the update-pushing machinery — because those don't matter until you have a second client.

---

## 13. Open decisions

1. ~~Does the client need the GUI at all?~~ **RESOLVED:** Level 2 is one local core with three faces — a `dsk` CLI, a React visualizer (`dsk serve`), and a local MCP server (see §3.2). CLI for doing, React for seeing/playing/planning, MCP for the agent. Store is SQLite-per-project in the client's repo (§8).
2. **`pattern`/`guideline` as first-class kinds vs. richer `meta` on components.** First-class buys graph queries ("which components does this guideline govern") at the cost of more surface.
3. **First export target** — React+Tailwind / plain CSS vars / Vue+Web Components / decide-at-first-client.
4. **Isolation tier for client #1** — mostly moot now that L2 is local-first/SQLite-in-repo (isolation is the client's machine); the question only returns for a hosted L2 or for Level 1's multi-project store.
5. **Build stack** — lift the hyperscript renderers from Second Brain, or rebuild the visualizer in React? (The CLI + React-viz direction leans toward a real React app for L2's visualizer and a framework for L1.)
6. **Agent via CLI vs MCP** — ship both over the shared core (recommended), or pick one? Some teams prefer giving the agent a great CLI over MCP tools; both are cheap once the core exists.

> In plain words: A handful of forks we should settle as we go: how formal the "rules" storage is; which code format we export first; how strongly isolated the first client is; what we build the screens with; and whether the AI works through the command-line, the structured connection, or both. (The big one — "does the client get a screen?" — is settled: yes, a React app, plus a command-line toolkit, plus the AI connection.)

---

## 14. Top risks

1. **Isolation leak** — the entire enterprise promise rests on the scope guard. Mitigate: one chokepoint, route everything through it, gate CI on the red-team test. (Phase 0.)
2. **Update propagation** — "consistent builds" vs "fine-tuned per client" fight; silent overwrite destroys client work. Mitigate: explicit, diff-based, per-atom merge keyed by stable id; never auto-push structure.
3. **Token-model migration** — Second Brain is mid-migration (legacy → `meta.sets[]`); we're going to DTCG. Migrate cleanly and update the prompt builder, or the agent reads stale shapes.
4. **`app.js` scale** — 7,925-line single file, no tests. Build L1 fresh; lift only proven L2 renderers; add a smoke-test harness.

> In plain words: The things most likely to bite: a security hole that lets one client see another's data; an update that accidentally erases a client's work; a messy half-finished data format; and an old giant code file that's hard to grow. We have a specific plan for each.
