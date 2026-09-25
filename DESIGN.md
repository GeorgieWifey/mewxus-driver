---
name: Mewxus
description: Cutesy pastel pixel-art WebHID configurator for the Yodall Nexus 61S
colors:
  mauve: "#8839ef"
  mauve-deep: "#5b21b6"
  pink: "#ea76cb"
  pink-hot: "#d551b3"
  rosewater: "#dc8a78"
  peach: "#fe640b"
  yellow: "#df8e1d"
  green: "#40a02b"
  teal: "#179299"
  sky: "#04a5e5"
  sapphire: "#209fb5"
  blue: "#1e66f5"
  lavender: "#7287fd"
  red: "#d20f39"
  red-deep: "#8f0a27"
  maroon: "#e64553"
  ink: "#4c4f69"
  ink-soft: "#6c6f85"
  ink-faint: "#9ca0b0"
  ground: "#eff1f5"
  well: "#e6e9ef"
  crust: "#dce0e8"
  edge: "#ccd0da"
  border-soft: "#bcc0cc"
typography:
  display:
    fontFamily: '"Press Start 2P", "Silkscreen", monospace'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "normal"
  headline:
    fontFamily: '"Press Start 2P", "Silkscreen", monospace'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  title:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1.4
  body:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Nunito, ui-rounded, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.08em"
  data:
    fontFamily: '"JetBrains Mono", ui-monospace, Consolas, monospace'
    fontSize: "12px"
    fontWeight: 400
rounded:
  none: "0px"
spacing:
  unit: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  keycap:
    backgroundColor: "{colors.edge}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "2px"
  panel:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.mauve}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  button-danger:
    backgroundColor: "{colors.red}"
    textColor: "{colors.ground}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.well}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8px 12px"
  dial-hub:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    size: "128px"
---

# Design System: Mewxus

## Overview

**Creative North Star: "The Sprite Sheet Workbench"**

Mewxus is a hardware configurator that behaves like a piece of software from
1993 and runs like one from this decade. The visual world is a single, coherent
claim: this is a 16-colour sprite rendered at 1×, and every element obeys the
rules that medium actually has. There is no blur anywhere, nothing is rounded,
and depth is drawn as a hard offset — because that is the only kind of depth a
sprite sheet can express.

The palette is Catppuccin Latte, the light member of a pastel family. That
choice is load-bearing rather than decorative: Latte's ground is a soft cream
and its accents are high-chroma pastels, so the interface reads as warm and
toy-like while still giving data text a genuinely legible ink. The board itself
stays the loudest object on screen; the chrome stays quiet enough to not compete
with it.

Density is tuned for a tool someone uses for two minutes to change one thing.
Panels are compact, every control is a real focusable control, and the thing
being configured never leaves view — the board is the hub of the composition and
panels open beneath it rather than on top of it.

**Key Characteristics:**
- Hard 3px borders, zero border radius, everywhere including native controls
- Depth as a hard stepped offset (`Npx Npx 0 0`), never a blurred shadow
- Two-frame motion authored as `steps()`, never eased
- A mascot that reflects device state and nothing else
- Pastel accents carrying 30–60% of the chrome, with the board as the focus

## Colors

A warm cream ground with a committed mauve accent and a pastel family for
signalling. Every value is Catppuccin Latte; no colour is invented.

### Primary
- **Committed Mauve** (#8839ef): the single accent. Active tabs, primary
  buttons, selected keycaps, the dial's active seat, focus rings. Its deep
  variant (#5b21b6) exists only as the hard offset under the button, never as
  a fill.

### Secondary
- **Signalling Peach** (#fe640b): warnings, the demo-mode badge, "this was
  changed" dots on remapped keys.
- **Status Teal** (#179299): live depth meters and success confirmations.
- **Alert Red** (#d20f39): destructive actions, firmware warnings, error toasts.
  Paired with #8f0a27 for the stepped offset.
- **Blossom Pink** (#ea76cb): the mascot's nose, recording state, macro accents.

### Neutral
- **Ink** (#4c4f69): all body and data text. This is the only text colour on
  grounds lighter than `edge`.
- **Ink Soft** (#6c6f85): labels, secondary prose.
- **Ink Faint** (#9ca0b0): captions only. Never body copy.
- **Ground** (#eff1f5): panel and page surfaces.
- **Well** (#e6e9ef): recessed regions, chips, unselected tabs.
- **Crust** (#dce0e8): the deepest inset, and the page ground behind panels.
- **Edge** (#ccd0da): keycap resting fill; **Border Soft** (#bcc0cc) is
  separators only.

### Named Rules
**The Server-Rack Rule.** Latte's softest tones — `overlay0` (#9ca0b0),
`overlay1`, `surface2` (#acb0be) — fail contrast as text on a light ground. They
are registered for chrome: separators, dots, insets, disabled states. They never
carry body copy.

**The One Loud Thing Rule.** The keyboard render is the most saturated object on
the screen. Chrome uses mauve sparingly enough that the accent still reads as an
accent after a user has been staring at the page for a minute.

## Typography

**Display Font:** Press Start 2P (with Silkscreen, monospace)
**Body Font:** Nunito (with ui-rounded, system-ui)
**Data Font:** JetBrains Mono

**Character:** A deliberate collision. The pixel face is unmistakably arcade and
carries every heading and the mascot's voice; Nunito is round and friendly and
carries anything a person has to actually read. The split is the point: the
world is cute, the values are clear.

### Hierarchy
- **Display** (400, 18px, 1.7): the wordmark and panel titles. Press Start 2P is
  large-per-em, so 18px reads like 26px of a normal face; the loose line-height
  keeps it from feeling cramped.
- **Headline** (400, 14px): section headings inside panels. Same face, one step
  down.
- **Title** (800, 14px): sub-section headings, key names. Nunito, not the pixel
  face — once a heading wraps onto two lines, the arcade face stops being
  charming.
- **Body** (400, 14px, 1.6): all prose, help text, descriptions.
- **Label** (700, 11px, 0.08em, uppercase): field labels, table headers, the
  small caps-like furniture.
- **Data** (400, 12px, tabular): keycodes, byte values, offsets, addresses.
  Anything a user might compare column-wise.

**Keycap legend** is the exception: keycap labels are Nunito 800 sized in
container units (`clamp(7px, 1.25cqw, 11px)`) so they scale with the board rather
than the viewport.

### Named Rules
**The Arcade-Only-In-Headings Rule.** Press Start 2P never sets a paragraph. It
is legible at 8px and exhausting at 200 words.

**The Verdana Rule.** Press Start 2P is built on an 8×8 grid and has no
antialiasing-friendly curves; `-webkit-font-smoothing: none` is applied to it so
the glyph edges stay hard. Smoothing it makes it look like a cheap imitation of
itself.

## Layout

A 4px sprite grid (`--u: 4px`). Every gap, pad, and offset is a multiple of 4,
so borders and stepped shadows land on whole pixels.

The composition is a **compound dial**: the board sits at the hub, six concerns
ride a ring around it, and the open panel unfolds beneath the board on the
board's own side of the page. The ring is 380px tall with a 132px radius and
76px seats, which is sized so a seat never overlaps the hub or leaves the
column. Below 1024px the radius drops to 108px and the seats to 68px; on mobile
the panel drops below the dial and the grid reorders via explicit `order-*`.

Page container caps at 1400px. The board caps at 880px wide and never shrinks
below 660px — past that the legends collide, so the wrapper scrolls instead of
the board deforming. Keycap and label sizes use **container query units**
(`cqw`) so they scale with the board's own width at any viewport with no
breakpoints and no JavaScript.

## Elevation & Depth

**There are no blurred shadows in this system.** Depth is drawn as a hard
offset in the surface's own border colour: `box-shadow: Npx Npx 0 0 <color>`.
This is what a sprite's edge actually looks like, and a soft drop shadow would
be a different medium pasted onto this one.

State is expressed by moving the element onto its own edge rather than by
changing its lighting. A pressed button translates by exactly its shadow offset
and drops the shadow, so the control physically lands. A hovered keycap lifts
one pixel inwards and grows its shadow by one.

### Shadow Vocabulary
- **Resting panel** (`box-shadow: 4px 4px 0 0 #ccd0da`): cases, sheets, dial cards.
- **Resting control** (`box-shadow: 3px 3px 0 0 #4c4f69`): buttons, dial seats.
- **Keycap** (`box-shadow: 2px 2px 0 0 #9ca0b0`): lighter, because 61 of them
  sharing one screen must not read as noise.
- **Pressed** (`box-shadow: none` + `translate(2px, 2px)`): the universal press.
- **Inset** (`box-shadow: inset 2px 2px 0 0 #ccd0da`): recessed wells and fields.

### Named Rules
**The Drawn-Not-Blurred Rule.** If a pixel-art surface needs depth, it gets a
hard step. `blur`, `backdrop-filter`, and soft shadows are not part of this
world.

**The Land-On-Your-Own-Edge Rule.** A press is the shadow's offset applied as a
translation, with the shadow removed. The element never shrinks, tints, or fades
to signal activation.

## Shapes

**Radius is zero, everywhere, including native controls.** `input[type=range]`,
`input[type=checkbox]`, and `input[type=color]` are all re-skinned with square
thumbs and swatches, because a rounded native control inside this world reads as
a rendering bug.

Borders are 3px on interactive surfaces and 2px on separators and inset wells.
The 3px weight is the minimum that survives at 1× without looking like a hairline
antialiased into two greys.

Tonal emphasis replaces the coloured side-stripe: a surface that needs signalling
changes its **entire** border to the accent and gains a 4px dithered ground
(`radial-gradient` at 4px) in the same colour. A thick bar down one side of a
card is the most recognisable tell of a generated interface and is banned here.

Dithering is the shading primitive. Where a modern design would use a gradient
or an opacity ramp, this world uses a 4px dot pattern.

## Components

### Buttons
- **Shape:** square (0px). 3px ink border, 3px stepped shadow.
- **Primary:** mauve fill, ground text, 8px 12px padding.
- **Danger:** red fill, ground text, deep-red stepped offset.
- **Ghost:** no border, no shadow, well fill on hover — for tertiary actions like
  "close" and "deselect".
- **Hover / Focus:** hover lifts the fill one step (`surface0` → `surface1`);
  focus is a mauve border plus a 25% lavender wash, never an outline ring.
- **Active:** translates 3px into its shadow and drops it.

### Chips
- **Style:** well fill, 2px border-soft border, mono text at 11px.
- **State:** read-only. Chips here are data displays (byte values, counts), not
  filters; anything selectable is a tab.

### Cards / Containers
- **Corner Style:** square (0px).
- **Background:** ground for panels, well for recessed regions.
- **Border:** 3px ink on panels; 2px border-soft on wells.
- **Internal Padding:** 12–16px.

### Inputs / Fields
- **Style:** ground fill, 3px ink border, inset 2px shadow. Square.
- **Focus:** the border shifts to mauve and the inset tint goes lavender.
- **Disabled:** 45% opacity, cursor not-allowed, and the hover state is
  suppressed so a disabled control never invites a click.
- **Ranges:** 12px track with a 2px border, 16px square mauve thumb with its own
  stepped shadow.

### Navigation
- **Tabs:** square, 3px border, well fill. Selected state is a mauve fill with a
  deep-mauve inset bar at the bottom edge — an inset shadow, not a border, so the
  tab does not change size when it activates.
- Layout navigation is the dial, not a nav bar: six seats at fixed angles, the
  ring rotating to bring the active concern to the top. Seat buttons counter-rotate
  against the ring's angle so their labels stay upright.

### Keycap (signature component)
The signature component. Each cap is absolutely positioned from the vendor
layout's own x/y/w/h units, so the on-screen board is the physical board rather
than a redrawn approximation.

- **Resting:** edge fill, 3px ink border, 2px stepped shadow.
- **Hover:** lifts 1px, shadow grows to 3px.
- **Selected:** mauve border, 18% mauve fill, mauve stepped shadow.
- **Remapped:** a 6px peach square with a 2px ink border in the top-right corner.
- **Live:** a three-frame `key-flash` (`steps(3)`) driven by the device's
  asynchronous `0xA0` travel feed, so pressing a physical key flashes its cap.
- **Label:** the assigned keycode when remapped, the physical cap legend
  otherwise, with the stored type byte below in mono.

### Mascot
A 16×16 inline SVG cat, no asset pipeline, coloured from CSS variables so it
takes the palette directly. `data-state` selects exactly two frames of motion:
a 3px idle bob, and a 1.08 scale blip while working. Eyes are open bars when
idle and flat lines otherwise.

## Do's and Don'ts

### Do:
- **Do** keep every radius at 0, including on native form controls, which must be
  re-skinned rather than shipped rounded.
- **Do** express depth with `box-shadow: Npx Npx 0 0 <color>` and express a press
  by translating exactly that offset and removing the shadow.
- **Do** author motion as `steps()` — 2 to 4 frames. Default transitions are
  `steps(2)` at 60ms; the dial is a 420ms `cubic-bezier(0.34, 1.4, 0.4, 1)`
  because a ring genuinely turns and an instant snap would lose the seat's
  arrival.
- **Do** size keycap text in `cqw` so the board scales as one object.
- **Do** keep the board visible while a panel is open. It is the hub of the
  composition, and hiding it makes every edit blind.
- **Do** use `ink-faint` only for captions and `ink-soft` for labels; both are
  below AA for sustained reading.

### Don't:
- **Don't** use a blurred shadow, `backdrop-filter`, or any gradient as a
  shading device. Dithering is the shading primitive here.
- **Don't** put a thick coloured border on one side of a card. Emphasis changes
  the whole border colour and adds a dithered ground.
- **Don't** use `overlay0`, `overlay1`, or `surface2` as text colours on light
  grounds.
- **Don't** set body copy in Press Start 2P.
- **Don't** use emoji as interface icons. The mascot is a drawn SVG and the dial
  glyphs are geometric characters; emoji render at the platform's own weight and
  break the 1× illusion instantly.
- **Don't** shrink the keyboard below 660px wide. Let the wrapper scroll.
- **Don't** signal activation by shrinking, tinting, or fading a control. It
  lands on its edge or it does not move.
