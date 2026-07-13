# Viewer visual + editor spec (ported from Second Brain work mode)

Reference for building the `dsk serve` viewer — the React visualizer for a single design system. It boots straight into the current project (one folder = one design system); there is no project picker or home screen. Aesthetic: "terminal / brutalist research-lab", Linear-Midnight dark.

## Palette (CSS vars)
```css
--bg:#08090a; --paper:#0f1011; --paper-2:#161718;
--fg:#f7f8f8; --muted:#8a8f98; --faint:#62666d;
--line:#23252a; --line-soft:rgba(255,255,255,0.08); --line-vsoft:rgba(255,255,255,0.04);
--accent:#5e6ad2; --accent-bg:rgba(94,106,210,0.14);
--cta:#e4f222; --cta-fg:#08090a;           /* rationed acid-lime — ONLY the Create/CTA */
--input-bg:#383b3f; --hover:rgba(255,255,255,0.04); --selected:rgba(255,255,255,0.07);
--pos:#27a644; --warn:#d6b24a; --alert:#eb5757;
/* kind colors */
--k-ia:#0284c7; --k-flow:#4f46e5; --k-screen:#0d9488; --k-comp:#9333ea; --k-token:#ca8a04;
```

## Type + spacing
- Fonts: `Inter` (sans), `JetBrains Mono` (mono). `font-feature-settings:"cv01" 1,"ss03" 1`.
- Scale (cozy): body 13px, mini 11px, h1 22px, h2 15px, row-h 26px. Compact/comfortable variants exist.
- Labels are UPPERCASE, letter-spacing 0.04–0.14em. Radii: card 12px, btn/input 6px, badge 2px, pill 9999px.
- Borders are hairlines (`--line` / `--line-soft`). Cards: `1px solid --line`, bg `--paper`, shadow `0 2px 4px rgba(0,0,0,.4)`.

## App shell
Grid: `232px 1fr [log 340px]` cols; rows `38px topbar / 1fr / 22px status`. Sidebar = Create button (lime) + nav groups (uppercase headings + items). The viewer has no mode switch and no project picker — it opens directly into the one design system, so the top of the sidebar simply shows the project name (the current design system), then the nav groups below. (In the Second Brain source this slot held a segmented mode control persisted to localStorage; the single-project viewer drops it.)

## Token gallery (grouped by group)
- color: `repeat(auto-fill,minmax(96px,1fr))` grid; chip 56px tall swatch + name + mono value.
- type: list rows, sample text at the token's px (cap 56px) + mono meta on the right.
- space: horizontal bar (gold `--k-token`), width = min(px,320) + mono meta.
- radius: 64×64 box, `border:2px solid --k-token`, bg color-mix 22%, border-radius = value + mono meta.
- Section headers: 11px uppercase, letter-spacing .14em, with a trailing hairline rule.

## Flow / IA editor (the centerpiece)
Constants: `GUTTER=132, CARD_W=196, CARD_H=60, BAND_HEAD=30`.
Data: `meta = { sections:[{id,label}], nodes:[{id,section,x,y,title,subtitle,type,shape,details,refs[],shots[]}], edges:[{id,from,to,type,trigger_type,trigger,condition,label}] }`.
- Vertical PHASE BANDS per section (absolute positioned, alternating faint bg, label at left).
- NODES: absolute at `GUTTER+x, offset+BAND_HEAD+y`; draggable (pointerdown→move updates x/y→queueSave); 9 shapes (rectangle/pill/parallelogram/diamond/triangle/hexagon/oval/square/circle) as SVG; fill = color-mix(type 7%, paper); title 13/500 + subtext 11 muted.
- EDGES: SVG cubic bezier, control points on midline; colored by type — main `#5b5b5b`, normal `#9aa0a6`, error `#dc2626`, retry `#d97706`; arrowhead markers.
- EDGE ANNOTATION pills at arrow midpoint: grammar `trigger [condition] → outcome`. `trigger_type` ∈ gesture|system|condition swaps preset vocab (gesture: tap/double-tap/long-press/swipe*/scroll/drag/back; system: on-load/after-response/timeout/success/failure/redirect; condition: if-valid/if-invalid/if-empty/if-signed-in/otherwise), each with a glyph. Empty pills are dashed/faint.
- NODE INSPECTOR (420px panel): title, subtext, shape (9 btns), type (main|normal|error|retry), images (upload/paste), details textarea, references (autocomplete → chips), connections (edges touching node), delete.
- EDGE INSPECTOR: trigger-type selector, preset list, custom input, guard condition, outcome, line type, source→target, delete.
- TOOLBAR: `+ Section`, `+ Block` (lime), `Connect` toggle (crosshair cursor; click src then dst → create edge → open edge inspector), legend (main/error/retry).

## Screen / IA node
`meta = { purpose, states:[{name}], ui_elements:[{id,label,description}] }`; components-used = mentions; reached-from = backlinks. Structured form, NOT a pixel canvas.

## Feature builder
3 steps: pick components (checkable grid) → set props/size per component → include tokens (swatches) → generate a scoped markdown prompt (assembled from picked components' props/sizes/tokens + target).

## Page model
Everything is a Page: `{ id(ULID), kind, title, slug, body(md), tags[], mentions[], meta{}, updated }`. Work kinds: `ia | flow | screen | component | token`. Mentions form the graph.

## Implementation note
Original is hyperscript `h()`; port to React + hooks. Debounced `queueSave()` (600ms). `AutocompleteInput` for mentions/refs.
