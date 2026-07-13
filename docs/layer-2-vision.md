# Layer 2 — what I want from it

The isolated, per-client design-system tool. Layer 1 (the Studio) produces it; the client runs it. This is the requirements record, in my own framing, so we can build it fully after the Studio.

## What it is

- The **single-project, client-facing** tool. One project at a time — locked and isolated. I stamp it out of the Studio and hand it to a client; they run it **on their own machine** and use it **independently with their own Claude Code**.
- It exposes **fewer edit powers than Layer 1** — it's the delivered copy, not the control room.
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

- As a **repo of human-readable files** (markdown + text + assets) — git-like, portable, and later usable as a standalone CLI tool. Not a black-box database.

## The three ways to use it

1. A **CLI toolkit** — to do things; also drivable by the client's Claude Code.
2. A **visualizer** — to see and play: the ATOMs visualizer, the token editor, the component browser/editor, and the IA + user-flow visualizer.
3. Its **own MCP server** (single-project) — the client's Claude Code connects to it to read and write the memory and build their software consistently. (MCP comes later; for now the files + CLI.)

## How work happens in it

- **Tokens and simple, straightforwardly-programmable things** are edited directly in the tool.
- **Detailed components, organisms, and templates** are authored via **Claude Code / claude-design agents through the MCP** — not hand-built in the UI.
- The client's Claude Code **builds their actual software** using this design system, staying consistent with it.

## What it outputs (two forms, at once)

- The **running tool** itself.
- **Exportable skills + `design.md` / agents `.md`** files — so the design system travels into the client's codebase and steers their agent even outside the tool.

## Delivery + isolation

- **Local-first / on-prem** — it runs on the client's machine; their design data never leaves.
- **One project only, locked**, with fewer capabilities than the Studio.
- **Stamped and delivered by Layer 1's deploy**, with its own generated MCP config.

## The core promise

A **living design-system memory, per client**, that keeps *their* Claude Code building consistently — holding the real components, tokens, icons/assets, atoms→templates, the "when to use which" rules, and the **exact use-cases written for their product**.
