---
name: Körbchen
description: A shelf of fired enamel tins on cold iron — exactly one open at a time.
colors:
  paper: "#101215"
  paper-raised: "#191c21"
  ink: "#f2ece1"
  muted: "#a49c90"
  rim: "rgba(242, 236, 225, 0.82)"
  rim-soft: "rgba(242, 236, 225, 0.24)"
  line: "rgba(242, 236, 225, 0.12)"
  line-strong: "rgba(242, 236, 225, 0.22)"
  recess-scored: "rgba(0, 0, 0, 0.24)"
  recess-tray: "rgba(0, 0, 0, 0.3)"
  recess-well: "rgba(0, 0, 0, 0.42)"
  iron: "#101215"
  oxblood: "#a8402f"
  oxblood-ink: "#f0a48f"
  star: "#d9a63a"
  enamel-sky: "#16304d"
  enamel-mint: "#123a2e"
  enamel-coral: "#4a2118"
  enamel-teal: "#0f3639"
  enamel-gold: "#402c0d"
  enamel-olive: "#33391c"
  enamel-grape: "#2c1f47"
  enamel-iron: "#33322d"
  accent-sky: "#6ea8dd"
  accent-mint: "#5cb493"
  accent-coral: "#d08163"
  accent-teal: "#56b0b3"
  accent-gold: "#d9a63a"
  accent-olive: "#a8b072"
  accent-grape: "#9c8ad0"
  accent-iron: "#a8a496"
typography:
  display:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
    fontFeature: "tabular-nums"
  display-code:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "2.6rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.26em"
    fontFeature: "tabular-nums"
  wordmark:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "0.08em"
  headline:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    letterSpacing: "0.14em"
  title:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.16em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  input:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
  label:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    letterSpacing: "0.18em"
  control:
    fontFamily: "Archivo Narrow, Archivo, ui-sans-serif, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.09em"
rounded:
  press: "6px"
  tray: "8px"
  control: "9px"
  vessel-lip: "10px"
  vessel-base: "13px"
  vessel: "10px 10px 13px 13px"
  tin: "14px"
  full: "999px"
spacing:
  tight: "8px"
  snug: "12px"
  stack: "16px"
  loose: "20px"
  record: "20px"
  feature: "24px"
components:
  panel:
    backgroundColor: "{colors.enamel-sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tin}"
    padding: "{spacing.feature}"
  panel-record:
    backgroundColor: "{colors.enamel-sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tin}"
    padding: "{spacing.record}"
  button-primary:
    backgroundColor: "{colors.enamel-sky}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "12px 20px"
  button-primary-disabled:
    backgroundColor: "{colors.iron}"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "rgba(242, 236, 225, 0.05)"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.tray}"
    padding: "0.4rem 0.7rem"
    height: "2.75rem"
  input-field:
    backgroundColor: "{colors.recess-tray}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.tray}"
    padding: "0.7rem 0.85rem"
    width: "100%"
  badge:
    backgroundColor: "{colors.recess-scored}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "5px 10px"
  badge-escalation:
    backgroundColor: "{colors.oxblood}"
    textColor: "#fbf3f1"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "5px 10px"
  badge-done:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "5px 10px"
  chip:
    backgroundColor: "rgba(242, 236, 225, 0.05)"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  chip-selected:
    backgroundColor: "{colors.enamel-sky}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "8px 14px"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.control}"
    rounded: "{rounded.tray}"
    padding: "8px 14px"
  tab-selected:
    backgroundColor: "{colors.enamel-sky}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.tray}"
    padding: "8px 14px"
  ack:
    backgroundColor: "{colors.oxblood}"
    textColor: "#fbf3f1"
    rounded: "{rounded.full}"
    size: "2.25rem"
---

# Design System: Körbchen

## Overview

**Creative North Star: "The Shelf of Enamel Tins"**

Körbchen is fired household enamel — the Riess / graniteware language of a German kitchen — standing on cold rolled iron. Every surface is one deep body colour with a bone hairline where the coat wraps the steel edge, a faint irregular fleck from spattered slip, and stencilled utility caps the way a Vorratsdose says MEHL. Nothing glows, nothing tilts, nothing bounces. Enamel is heavy: it settles.

The whole answer to "too loud" is the one-tin rule. Eight sections each own a firing, but exactly one is ever painted: the open section's body colour floods the shelf label and everything below it, and the other seven labels sit unlit in bone on iron. The result is a dark, one-handed, ten-second surface that reads calm in a dark room without reading clinical, and colourful without ever showing two hues at once.

Depth is carried entirely by the rim. A 1.5px bone hairline is the edge, the focus ring, the fill line, the divider and the disabled state, so the world needs no glow, no coloured under-shadow and no elevation stack. Explicitly refused: the pastel wellness tracker — glowing cards, progress rings, capsule progress bars, foil-sticker rewards, handwritten script, and the mono/typewriter face that was the last survivor of the previous world.

**Key Characteristics:**
- One lit tin per screen; seven unlit bone labels beside it.
- A 1.5px bone rim on every edge, focus, fill line and state.
- Stencilled Archivo Narrow caps for every label, control, badge and count.
- Fired oxblood reserved solely for escalation.
- Fill level carries value; no rings, no chrome.
- Flat, level, square: no tilt, no bounce, no overshoot.

Known headroom the world names but has not spent: label wear on the stencil (a real Vorratsdose's plate is never uniform), the chipped rim used as general wear rather than only for `:disabled`, and set-down weight on the jug fill. These are available moves, not defects.

## Colors

A dark palette of one iron ground, one bone ink, eight enamel body firings of which only one is ever visible, and a single reserved escalation red.

### Primary
- **Enamel Body** (eight firings; cobalt night `#16304d`, fir `#123a2e`, burnt coral `#4a2118`, deep teal `#0f3639`, fired ochre `#402c0d`, olive drab `#33391c`, aubergine `#2c1f47`, undyed graniteware `#33322d`): the body colour of the open tin. It paints the lit shelf label, the tabpanel region, panels, primary buttons, selected chips and ticked boxes — everything inside one section at once. Each body ships with a lifted counterpart (`accent-*`) used where the body colour would be invisible on iron: icon holders, the jug fill, small ink marks. Every firing pairs with bone ink, never with its own tint.

### Secondary
- **Fired Oxblood** (`#a8402f`, ink form `#f0a48f`): the one escalation mark. It carries `knapp!`, `fällig!`, an unacknowledged Ruf and its unread counter, a dropped live stream, every error line, and destructive controls. The plate form is the solid disc or pill; the ink form is the same firing lifted to read as a word on an enamel body (5.2:1 on the darkest tin).

### Tertiary
- **Fired Ochre** (`#d9a63a`): a Stern. The same glaze wherever it appears, including on tins that are not the Sterne tin, so it deliberately does not ride the per-section accent.

### Neutral
- **Iron** (`#101215`): the shelf the tins stand on, the page ground, and what shows through a chipped rim.
- **Bone** (`#f2ece1`): all ink, all rims, all hairlines. Its alpha steps are the rim (0.82), the soft rim (0.24), the divider line (0.12) and the strong line (0.22).
- **Recess** (three depths of black: scored `0.24`, tray `0.3`, well `0.42`): the shadow inside a place where the coat is pressed into the steel. See Elevation & Depth.
- **Worn Bone** (`#a49c90`): secondary prose, unlit shelf labels, placeholders, sublabels. 6.6:1 on an enamel body.

### Named Rules
**The One Lit Tin Rule.** Exactly one firing is painted per screen. `TAB_FEAT` in `App.tsx` is the only place it is decided, and the class goes on both the shelf label and the tabpanel region. A panel that carries its own `feat-*` can light a hue its label does not, and is a defect.

**The Oxblood Reserve Rule.** Oxblood is escalation and nothing else. No section body may be fired in the oxblood family — Ruf was moved from wine to olive drab precisely so its oxblood plate and unread count read against the body instead of as part of it.

**The Inverted Ramp Rule.** The Tailwind ramps `rose`, `amber`, `green` and `red` are redefined in `@theme` to run dark→light (50 darkest, 900 lightest), so incumbent `text-rose-800 on bg-rose-100` markup keeps meaning "light ink on a dark tint". The trap is the middle: `bg-rose-500` is worn steel, not pink — it once shipped a grey acknowledge button. Reach for the semantic variables (`--enamel`, `--accent`, `--oxblood`, `--ink`, `--muted`) and use a numbered ramp step only for ink-on-tint pairs at the ends.

## Typography

**Display / Stencil Font:** Archivo Narrow (self-hosted via fontsource, weights 500/600/700)
**Body Font:** Archivo (self-hosted via fontsource, weights 400/500/600/700)

**Character:** A quiet grotesk for prose and its condensed sibling for everything sprayed through a plate. There is no third face and no mono face — a code, a count and a millilitre reading are all stencilled with tabular figures, not typewritten.

### Hierarchy
- **Display** (Archivo Narrow 700, 3.75rem, line-height 1, tabular figures): the one number a section exists to show — today's millilitres. At most one per panel.
- **Display Code** (700, 2.6rem, 0.26em, tabular figures): the invite code only. The wide tracking is what makes a string of characters read as stamped on a tin rather than typed; the smaller step is what lets it hold that tracking on a phone.
- **Wordmark** (700, 1.25rem, 0.08em, uppercase): the Körbchen name in the header, and any stamped numeric reading.
- **Headline / Tin Label** (700, 1.05rem, 0.14em, uppercase, bone): the tin's name. It replaces the `<h2>` entirely.
- **Title / Sublabel** (700, 0.78rem, 0.16em, uppercase, worn bone): a division inside a tin, below the tin's own name.
- **Body** (Archivo 400–500, 0.875–0.95rem, 1.5): all prose and all history rows. Sentence case, German.
- **Input** (Archivo 500, 1rem): the value typed into a field. This step is a floor, not a preference: below 16px iOS zooms the whole page on focus, which is a real defect in an app opened one-handed a dozen times a day.
- **Label** (Archivo Narrow 700, 0.72rem, 0.18em, uppercase, worn bone): field labels, the header identity line, badges (0.72rem/0.1em), the unread count and tab labels (0.78rem/0.1em). Every small stencil sits on the 0.72rem step; nothing sits just under it.
- **Control** (600, 0.875rem, 0.09em, uppercase): every button and segmented control.

### Named Rules
**The One Stencil Per Tin Rule.** `.tin-label` is a tin's only name. A stencil above a heading that repeats it is a kicker, not a label, and is banned — `EINSTELLUNGEN / Einstellungen` was removed everywhere it appeared.

**The One Voice Rule.** Every control is sprayed through the same plate as every label: uppercase Archivo Narrow at 0.09em. A sentence-case button beside a stencilled tab is the world speaking two voices.

## Layout

A phone-first single column, by product requirement rather than as a starting point: the app is used one-handed, ten seconds at a time, on a phone installed to the home screen.

`.shelf-col` sets one width for header and panels alike (100%, max 28rem, centred), so the wordmark, the shelf labels and the tins share an edge. The header is sticky, iron at 92% with a backdrop blur and a hairline bottom edge, and respects `env(safe-area-inset-top)`. Panels stack 16px apart inside a 16px-padded tabpanel that pads its bottom to `max(1.5rem, env(safe-area-inset-bottom))`.

Spacing is three roles on Tailwind's 4px base: **tight** (8px) inside one group, **snug** (12px) between a heading and what it introduces, **loose** (20px) between blocks a person scans between. Every section runs identity → controls → history, loose at the two seams. Two panel paddings only: 24px for a feature panel (one per tab) and 20px for a record card (one bag, plushie, or inline form).

**Responsive.** One breakpoint, 768px. Below it the tab shelf scrolls horizontally under an edge mask that fades the first 10px and last 26px, with `scroll-padding-inline: 14px 30px` so the lit label never parks under a fade; the open tin stretches to the fold (`max-md:min-h-[calc(100dvh-8.75rem)]`, its only child flexing) so the primary control stays inside the thumb arc. At and above 768px the shelf wraps to a second row with the mask removed — all eight labels readable at once — and `.shelf-board` draws a lit plane `min(100%, 31rem)` wide behind the column, rim-edged with its own shadow thrown onto the iron either side, so a narrow column on a wide screen reads as a shelf rather than a margin.

## Elevation & Depth

There is no elevation stack. Depth is a rim and a recess: light catches the top edge of a raised thing and darkness collects inside a sunk one. Shadows exist only as tight, near-black contact shadows under a tin — never a glow, never coloured, never an offset block. Texture does the rest: the iron ground carries a fine milled lattice of two radial-gradient dots (13×17px and 23×11px, 0.4 opacity), while tin bodies and the jug carry `public/fleck.svg` — generated `feTurbulence` fractal noise, tiled at 240px, 0.55 opacity — because graniteware speckle is irregular and a lattice reads as a pattern the moment two flecks line up.

### The Recess Ladder
The rim's counterpart. Where the rim is the coat standing proud of the steel, the recess is the coat pressed into it — a flat black fill, three depths and no others, because the app had drifted to seven ad-hoc black alphas all doing this one job.
- **Scored** (`--recess-scored`, `rgba(0,0,0,0.24)`): a disc or plate scored into the enamel — icon holders, emoji tokens, badges, tickboxes, empty stars, and the pressed state of a secondary button or compartment.
- **Tray** (`--recess-tray`, `rgba(0,0,0,0.3)`): something a value goes into — form fields and the segmented control's track.
- **Well** (`--recess-well`, `rgba(0,0,0,0.42)`): the jug's empty wall, the deepest step, so the fill reads against it.

The black alphas inside `box-shadow` declarations are not part of this ladder; they belong to the shadow roles below.

### Shadow Vocabulary
- **Tin** (`box-shadow: 0 0 0 1.5px var(--rim-soft), inset 0 1px 0 rgba(242,236,225,0.14), 0 10px 20px -14px rgba(0,0,0,0.9)`): every panel. Soft rim, lit top edge, contact shadow.
- **Dipped control** (`box-shadow: 0 0 0 1.5px var(--rim), inset 0 1px 0 rgba(242,236,225,0.22), 0 4px 10px -6px rgba(0,0,0,0.9)`): the primary button at rest. On press it becomes `inset 0 2px 5px rgba(0,0,0,0.5)` with a 1px translate — the rim highlight sinks; nothing drops out from underneath.
- **Scored** (`box-shadow: inset 0 0 0 1.5px var(--rim-soft)`): secondary buttons, chips, badges, tickboxes, icon holders — a shape scored into the enamel rather than dipped.
- **Recess** (`box-shadow: inset 0 0 0 1.5px var(--rim), inset 0 2px 6px rgba(0,0,0,0.45)` over `rgba(0,0,0,0.42)`): the jug; and at 0.3 alpha with a 0.38 bone border, the form field.
- **Set down** (`box-shadow: 0 0 0 1.5px var(--rim), inset 0 1px 0 rgba(242,236,225,0.16), 0 14px 26px -16px rgba(0,0,0,0.95)`): a toast — a smaller tin placed on the shelf.

### Named Rules
**The Rim Is The System Rule.** A 1.5px bone hairline carries every edge, focus ring, fill line, divider and state. If a new element needs to be distinguished, give it a rim before you give it a colour, a shadow or a background.

**The Rim And Recess Rule.** The world has exactly two depth devices. A thing either stands proud (bone rim) or is pressed in (one of the three recess steps). A new surface picks one; it never invents a fourth black alpha and never reaches for a gradient, a tint or a border to say the same thing.

**The No Glow Rule.** No coloured shadow, no bloom, no hard offset block shadow, no tilt. A hard block shadow shipped here once as `0 6px 0 var(--accent-deep)` — a token this world never defined — and rendered as nothing at all.

## Shapes

Level, square, softly cornered. Radii are a short ladder: 6px on a pressable compartment, 8px on trays and holders (fields, icon discs, tab labels, emoji tokens), 9px on buttons, 14px on a tin, and full round on badges, chips, tickboxes, stars, the acknowledge disc and the unread count. The jug is the one asymmetric shape — a 10px lip over a 13px base — so it reads as a vessel; the 13px is deliberately one pixel tighter than the tin's 14px, so the jug sits seated inside the panel rather than tangent to it.

Everything is applied square: a badge is a stamped plate pressed level into the rim line, never rotated, never askew. Icons are a self-drawn 24×24 line set on a common grid (20 glyphs, `currentColor`, 1.7 stroke, round caps and joins) — no icon font, no glyph characters, no third-party icon package. A user's own emoji is data the app cannot redraw, so it is contained rather than floated: seated in a scored disc at `filter: saturate(0.82) contrast(1.02)`, level with everything else.

## Components

### Buttons
- **Shape:** softly cornered rectangle (9px).
- **Primary (`.btn3d`):** the dipped control — enamel body, full bone rim, lit top edge, stencilled caps in bone. Its background is the open tin's body colour, so it changes hue with the section and never with intent.
- **Hover / Focus:** hover brightens only the inner top highlight (0.22 → 0.34). Focus is the global doubled rim, `outline: 2px solid var(--rim)` at 2px offset.
- **Active:** 1px translate down, rim highlight replaced by an inner shadow. No scale, no bounce.
- **Disabled:** a chipped rim — iron background, worn-bone text, soft rim only.
- **Secondary (`.btn3d-soft`):** the shape scored into the enamel — 5% bone wash under an inset soft rim, bone text; hover fills to 9% and the rim goes full.
- **Ghost (`.ghost`):** header-weight stencil in worn bone, 2.75rem minimum height for a thumb; hover lifts to bone over a 6% wash.
- **Destructive:** oxblood ink on a transparent ground, hovering to a 20% oxblood wash. Never a solid oxblood button.

### Chips
- **Style:** full-round, Archivo body face (not stencilled — a chip carries a user's word, not a system label), 5% bone wash under an inset soft rim.
- **State:** `aria-pressed="true"` fills with the tin's enamel and takes the full bone rim with a lit top edge. The same treatment carries `.tickbox`: an empty tick is a bare soft rim over a dark well, a packed one is enamel with a full rim.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** a near-flat 178° gradient between the firing's two panel stops, plus the fleck overlay at 0.55; content is lifted to `z-index: 1` above it.
- **Shadow Strategy:** the Tin shadow above.
- **Border:** none — the soft rim ring is the edge.
- **Internal Padding:** 24px feature panel, 20px record card.

### Inputs / Fields
- **Style:** a recessed enamel tray — the tray recess step, a 1.5px bone border at 0.38 alpha, 8px radius, Archivo 500 at the 1rem input step. The rim sits at 0.38 rather than the usual 0.24 because at the lower value the tray disappeared into the body colour.
- **Focus:** the border goes to the full rim and an inner soft rim doubles it. No glow, no colour shift.
- **Error:** the message is oxblood ink beside or beneath the field, never a red border.
- **Placeholder:** worn bone at 0.75 opacity.

### Navigation
- **Style:** a horizontal shelf of stencilled section labels, each with a drawn icon. Unlit labels are worn bone on transparent; hover lifts to bone. The selected label fills with its own firing, takes the full bone rim and a lit top edge, and is the only saturated thing on the screen.
- **Behaviour:** roving tabindex with Arrow/Home/End keys, the active label scrolled into view, edge-masked overflow on phones, wrapping to two rows at ≥768px.
- **Unread count:** an oxblood pill riding *inside* the label rather than pinned to its corner, because the strip scrolls and a corner bubble would be clipped.

### The Jug (signature)
`Jug` is exported from `features/drink/DrinkCard.tsx` and read by both roles. It is a graduated measuring vessel, not a progress bar: a dark recess with a full bone inner rim, filled by a full-height slab of the tin's *accent* (light, because the panel is already the body colour) that is translated on the compositor — `transform: translateY(calc((1 - var(--level, 0)) * 100%))`, never animated by height or width, so the 2px bone meniscus keeps its true weight at every level. It holds 1.25× the goal, is scored in quarters as short ticks off the right wall (the half mark longer), and the goal is the one full-width dashed line at 80% of the capacity. Graduation ticks are bone at 0.4 alpha so the scale reads on the unfilled wall. The numeric reading stands *beside* the jug, never over the fill, and it is stencilled in both roles — the Caregiver's smaller jug (h-28 w-16) carries the same caps as the Pupp's, because one component may not speak in two voices.

### Compartments
A list inside a tin is `.compartments`: rows that share the body colour, divided by 1.5px soft-rim hairlines. A pressable row (`.compartment-press`) bleeds 0.6rem into the padding and lights its own floor on hover (5% bone) and press (20% black). Nested rounded cards inside a panel are banned — a card in a card reads as a hole punched in the enamel.

### Toasts
A toast is a small tin set down beside the open one on the iron, so it carries its own firing rather than inheriting the section's: a Ruf is fired olive drab (`feat-bubble`), a reminder ochre, a change fir. Full-round, stencilled bone text, accent-ink icon, a quiet dismiss button; polite live region, newest on top, never more than three.

### Motion
One authored moment. `tin-flood` (0.44s, `cubic-bezier(0.16, 0.84, 0.32, 1)`) plays when a tin opens: the enamel arrives from under the rim via a clip-path inset and a 6px rise, keyed on the section id so it fires once per switch and never on a re-render inside a section. `tin-set-down` (0.42s, same curve) settles a toast downward. Everything else is a 0.14–0.18s ease on colour, rim and shadow; the jug fill is 0.85s on the same exponential curve. `prefers-reduced-motion` collapses every animation to 0.001ms and removes every transition.

## Do's and Don'ts

### Do:
- **Do** decide the firing in `TAB_FEAT` and apply it to both the shelf label and the tabpanel region; let panels inherit it.
- **Do** reach for the semantic variables (`--enamel`, `--accent`, `--accent-ink`, `--ink`, `--muted`, `--rim`) so a new element follows whichever tin is open.
- **Do** give every new edge, state and division the 1.5px bone rim before considering any other treatment.
- **Do** pick a recess depth from the three tokens (`--recess-scored`, `--recess-tray`, `--recess-well`) for any inset fill; a literal `rgba(0,0,0,α)` background is drift.
- **Do** set every text input at the 1rem step or larger, so iOS never zooms the page on focus.
- **Do** stencil every label, control, badge and count in uppercase Archivo Narrow, and set every number with tabular figures.
- **Do** keep escalation to oxblood: the plate (`.badge-low`, `.ack`, `.tabbadge`) for a state, the ink (`--oxblood-ink`) for a word.
- **Do** carry value with fill level and rim marks — a vessel that fills, scored in quarters — rather than a ring, a bar or a percentage.
- **Do** animate position and opacity on the compositor with the exponential ease-out (`cubic-bezier(0.16, 0.84, 0.32, 1)`), and let `prefers-reduced-motion` remove it.
- **Do** give every panel a loading skeleton with the tin's own footprint and an error state that names the problem and offers a retry.

### Don't:
- **Don't** paint a second firing on screen. No panel carries its own `feat-*`, and no approval, success or status may arrive in a hue the open tin is not.
- **Don't** fire a section body in the oxblood family, and don't spend oxblood on anything that is not escalation.
- **Don't** trust a mid-ramp Tailwind colour utility: the ramps are inverted, `bg-rose-500` is worn steel, and that trap has already shipped a grey button.
- **Don't** put a stencil above a heading that repeats it, and don't add a kicker or eyebrow line over a tin's name — `.tin-label` is the tin's only name.
- **Don't** invent a fourth recess depth or a raw black background alpha; the ladder is three steps.
- **Don't** use raw white anywhere — a highlight is bone (`rgba(242,236,225,α)`), including the lit edge of a Stern.
- **Don't** nest a rounded card inside a panel; divide with compartment hairlines.
- **Don't** add a glow, a coloured under-shadow, a hard offset block shadow, a tilt, a bounce or any overshoot. Enamel settles.
- **Don't** introduce a third typeface — no mono, no script, no system display face; a code is stencilled, not typewritten.
- **Don't** use emoji or glyph characters as interface icons; draw them into the 24×24 set in `lib/icons.tsx`. A user's own emoji is contained in a scored disc, never floated with a drop shadow.
- **Don't** animate the jug by height or width, and don't set text over its fill.
