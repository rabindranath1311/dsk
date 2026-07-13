# Design System Platform — How It Works

*A design system that a team's AI coding assistant actually understands.*

## The problem

Teams now build software with AI coding assistants (like Claude Code). But the assistant has no reliable place to learn a product's design rules — the colors, the components, and "when to use which." Those rules usually live in scattered documents that quickly go stale. So the AI guesses, and the product slowly drifts out of consistency.

## The idea

We give a product's design system a single, living memory — one place that holds every color, component, rule, screen, and user flow. Think of it as a shared brain for the design system that both designers *and* AI assistants work from.

Instead of reading stale documents, the AI assistant reads from (and writes back to) this memory while it builds. The result: software that stays on-brand and consistent, because everyone — human and AI — is working from the same source of truth.

## One toolkit, three faces

It's a single, self-contained toolkit for **one** product's design system — one folder you can keep right alongside the code. There's no separate "studio" managing many projects; the toolkit *is* the design system, and you use it three ways:

1. **The builder** — a command-line toolkit (`dsk`) to create and shape the design system: its tokens, its components, and the rules for using them. This is the machine that helps you *build* the design system.
2. **The viewer** — a visual app (`dsk serve`) that opens straight into this design system: browse the tokens, the components atom-to-template with their usage rules, and map out screens and user flows.
3. **The agent's live connection** — an "MCP" link the product's AI assistant plugs into, so that *after* the design system is built, the AI reads from and writes back to it while it codes.

Alongside it sits **the data** — supporting material like brand guides and product specs — so the AI has the full picture, not just the parts.

## What's inside

Everything that defines the product's look lives in one place — and, just as importantly, so do the *rules for using it*:

- **Design tokens** — the core values: colors, spacing, fonts, sizes. Change them once here and they update everywhere in the code.
- **Building blocks, from atoms to full components** — the smallest pieces (a color, a button, an input — the "atoms") all the way up to complete components. Each one carries its own usage rules: when to use it, when *not* to, what to use instead, and which tokens it should use. **This is the part that lets the AI choose the right component and the right token instead of guessing.**
- **Icons & assets** — a built-in library for icons, logos, and images, like a lightweight content system, so the AI always pulls the right, approved asset.

> In short: it's not just a box of parts — it's a box of parts *with instructions*, so both people and AI know exactly what to use and when.

## How the AI plugs in

The client's AI assistant connects through a live link — an "MCP" connection, the standard way AI assistants use outside tools. Through it, while it builds, the AI can:

- **Look things up** — "which component fits here?", "what's the right spacing value?"
- **Get its plan checked** — the tool flags anything that breaks the design rules *before* a line of code is written.
- **Write back** — anything new the AI builds is saved into the shared memory for next time.

Because the link is live, the AI always works from the current design system, not a stale copy. (For simpler cases the design system is also exported as plain files in the codebase that the AI can just read — the live connection is what powers the real back-and-forth.)

## How it works in practice

1. Set up the design system with the builder — start from existing notes, then shape the components and the rules for using them.
2. Open the visual app to explore the system and plan a new feature — sketching the screens and flows, and picking the components it needs.
3. The tool bundles up exactly what's relevant and hands it to the AI assistant.
4. The AI builds the feature — checking each choice against the design rules as it goes — and files anything new back into the shared memory.
5. The updated design system is automatically written into the codebase as ready-to-use design files.

It's a loop: **plan → build → remember → repeat.** Every feature makes the system richer.

## Going further: architecture & flows

Beyond the design system itself, the tool can also map the *product* — its screens (the information architecture) and how people move between them (user flows). A designer can sketch a new feature's flow visually, and the tool turns it into a precise brief for the AI to build from.

This goes further than most design systems do. It's a richer layer we add on top of the essentials rather than a day-one requirement — but it's what makes planning and building a *whole new feature* feel seamless, instead of just dropping in a single component.

## Why it's different

- **A living memory, not stale docs.** The design system updates itself as the product grows, so it never falls out of date.
- **The AI makes consistent decisions.** It doesn't just store components — it knows *when to use which*, and checks the AI's plan against the rules *before* any code is written.
- **The data stays with you.** It's one self-contained folder on your own machine — the design system lives beside the code and never leaves your hands.

---

*In one line: it turns a product's design system into a shared memory that keeps a team's AI assistant building consistently — and gets smarter with every feature.*
