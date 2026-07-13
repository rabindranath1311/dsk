# The toolkit — what I want from it

One self-contained CLI toolkit per design system — one folder is one design system. This is the requirements record, in my own framing, of what the toolkit needs to be.

## What it is

- The **single design-system** tool. One folder = one design system — self-contained and local. I run it **on my own machine** and use it **with my own Claude Code**.
- It is **self-contained** — the CLI, the viewer, and the store all live in the one folder over a shared core (`@dsk/core`). Full authoring powers; nothing external to install or connect to.
- Its **main job is to be the design-system MEMORY** — a better, structured replacement for scattered `design.md` files. Not just a visualizer.
- It is **human-readable AND agent-readable**, equally.

## What it holds (the memory)

- The **full atomic hierarchy**: atoms → molecules → organisms → templates — for a generic enterprise product I can reshape into any product.
- **Design tokens** (colors, spacing, type, radius, …).
- **Icons and assets** — a CMS-like place to keep icons, images, logos.
- **Naming conventions.**
- **Patterns and guidelines** — the cross-cutting rules.
- **Detailed usage instructions per component** — exactly *when to use which*, when not, and what to use instead — plus the **exact use-cases on the specific project** it's being used on (written in detail, as prose).
- **Information architecture** (screens) and **user flows** — visualized, borrowed from my Second Brain work mode.
- A **data layer**: documents, markdown + text files, and reference material tied to the project.

## How it's stored

- As a **repo of human-readable files** (markdown + text + assets, via `dsk init --files`) — git-like and portable — or SQLite. Not a black-box database.

## The three ways to use it

1. A **CLI toolkit** — the `dsk` CLI, to do things (init, token set, component new, pattern, guideline, import, export, feature, recommend, lint); also drivable by my Claude Code.
2. A **visualizer** (`dsk serve`) — to see and play: the ATOMs visualizer, the token editor, the component browser/editor, and the IA + user-flow visualizer. It boots straight into the current project.
3. Its **own MCP server** — served over HTTP from `dsk serve`; my Claude Code connects to it to read and write the memory and build software consistently.

## How work happens in it

- **Tokens and simple, straightforwardly-programmable things** are edited directly in the tool.
- **Detailed components, organisms, and templates** are authored via **Claude Code / claude-design agents through the MCP** — not hand-built in the UI.
- My Claude Code **builds the actual software** using this design system, staying consistent with it.

## What it outputs (two forms, at once)

- The **running tool** itself.
- **Exports** — `design.md`, `AGENTS.md`, `tokens.css`, `SKILL.md`, `.mcp.json` — so the design system travels into the codebase and steers the agent even outside the tool.

## Local-first + footprint

- **Local-first / on-prem** — it runs on my machine; the design data never leaves.
- **One folder = one design system** — self-contained, with nothing external to connect to.
- Its **own generated MCP config** (`.mcp.json`) travels with it.

## The core promise

A **living design-system memory** that keeps Claude Code building consistently — holding the real components, tokens, icons/assets, atoms→templates, the "when to use which" rules, and the **exact use-cases written for the product**.
