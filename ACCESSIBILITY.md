# Accessibility Notes — Longitude/Latitude Demonstrator

Target: WCAG 2.1 AA (AAA where reasonable). Human screen-reader QA (NVDA on
Windows, VoiceOver on macOS/iOS) is still required before release.

## Structure & semantics

- Single `<h1>` is the simulation title, rendered by the `<kl-unl-masthead>` component
  (shadow DOM). Panels use `<h2>` headings; no heading levels are skipped.
- `<main class="app-layout">` is the main landmark; each panel is a `<section>` with an
  `aria-labelledby` heading. The masthead provides the `<header>`/`<nav>` region and its
  own Reset / Help / About modal (focus trap, Escape, focus restoration handled by the
  component — the sim does not duplicate it).

## The canvas (informative image + live text)

- `<canvas role="img" aria-label="Interactive globe showing the cursor location"
  aria-describedby="globe-desc">`.
- `#globe-desc` is a continuously-updated, visually-hidden `aria-live="polite"` text
  equivalent of the diagram: it states the current cursor latitude and longitude
  (with units and hemisphere) and whether features and cities are shown. It is rebuilt
  from the single `render()`/state, so audio-only users get the same "what's shown".

## Keyboard operability (2.1.1 / 2.1.2 / 2.4.7)

Everything is operable by keyboard in a logical tab order, with the foundation's visible
`:focus-visible` ring. There are no keyboard traps.

- The Flash original was mouse-only. Two complementary keyboard paths were added:
  - **The globe canvas is itself focusable** (`tabindex="0"`, `role="application"`,
    `aria-roledescription="interactive globe"`) and is in the tab order. When focused,
    the **arrow keys move the cursor location** on the surface: Up/Down = latitude
    north/south, Left/Right = longitude east/west; hold **Shift** (or use Page Up/Down
    for latitude) for a larger 10° step. A clear focus ring is shown on keyboard focus.
    **Clicking the globe moves focus to it**, so a pointer user can switch straight to
    the arrow keys. Tab always moves away cleanly (no trap).
  - Native **sliders** give explicit, standard per-axis control, each using
    `<input type="range">` (Arrow = step, Page Up/Down = larger step, Home/End = min/max
    for free): **cursor latitude** (−90…90) and **cursor longitude** (−180…180), plus
    **globe rotation** (0…360) and **globe tilt** (−90…90), the keyboard equivalent of
    shift-drag.
  - **Typable value fields.** Each value (latitude, longitude, rotation, tilt) is a real
    labelled `<input>` the user can type into and commit with Enter (or by tabbing away).
    Parsing is tolerant: a signed decimal (`-45`), a value with a direction (`45 N`,
    `96.7 W`), or degrees-and-minutes (`40 47 N`) all work; out-of-range values clamp and
    unparseable text reverts to the current value. The field, its slider, the canvas, and
    the live region all stay in sync because they share one state object.
- The pointer paths, the canvas arrow keys, and the sliders all mutate the **same** state
  object, so mouse, touch, and keyboard never disagree.
- Radio group (coordinate format), checkboxes (show cities / show features), and the
  "open Google Maps" button are native controls.

## Speaking units with every number (supervisor requirement)

Every value that has a unit is announced with its quantity name **and** unit — never a
bare number:

- Each slider sets `aria-valuetext` to the full spoken value, e.g.
  *"Latitude 40.8 degrees North"*, *"Longitude 96.7 degrees West"*,
  *"Globe rotation 290 degrees"*, *"Globe tilt 25 degrees"*. Units are spelled as words
  ("degrees", "North/South/East/West") so they are not mis-read or dropped. The degree
  symbol is shown visually in the read-outs while the spoken form carries full words.
- The `aria-live="polite"` status region announces committed changes **with units**,
  e.g. *"Cursor at latitude 40.8 degrees North, longitude 96.7 degrees West."*
  Announcements fire on **commit** (pointer release, slider `change`, toggle), not on
  every drag tick, to avoid flooding. Toggles announce
  *"Cities shown/hidden"*, *"Features shown/hidden"*, *"Decimal degrees"*,
  *"Sexagesimal degrees, minutes"*.

## Color & contrast (1.4.1 / 1.4.3 / 1.4.11)

- Text and UI use the KL-UNL palette CSS variables; body copy is ≥ 1.125rem.
- The educational map colors (blue latitude arc, red longitude arc, green equator,
  orange prime meridian / date line) are kept from the original for physical meaning,
  but **color is never the only signal**: every colored element is also labeled in text
  on the globe and described in the read-outs and the live region (e.g. the latitude is
  labeled "40.8° N" next to the blue arc).

## Larger, zoomable text & reflow (1.4.4 / 1.4.10)

- Body text is ≥ 1.125rem (18px) and sized in `rem`/`em`, so it tracks the browser font
  setting. The layout reflows without clipping at 200% zoom (relative units, wrapping,
  no fixed px text heights).
- The globe is on a `<canvas>` that keeps its **original internal stage coordinates**;
  CSS scales the element while preserving aspect ratio, so the physics/projection math
  is unchanged at any display size. Coordinate labels that must stay legible live in
  surrounding HTML (the read-outs); only the few in-globe map labels are canvas-drawn.

  *Canvas-baked text that cannot move to HTML:* the in-globe labels (Equator, Prime
  Meridian, International Date Line, and the latitude/longitude value labels) are drawn
  on the canvas because they are positioned in 3-D on the rotating sphere. They scale
  with the canvas rather than the browser font setting. Their information is fully
  available as zoomable HTML in the read-outs and in the live description, so no
  information is lost.

## Motion (2.2.2 / 2.3.3)

- There is **no continuous animation** — the globe redraws only in response to user
  input — so there is nothing that moves for more than 5 seconds and nothing flashes.
  `prefers-reduced-motion` therefore needs no special handling, and no Pause control is
  required. (Reset is provided by the masthead via the `sim-reset` event.)

## Touch / pointer

- Pointer Events drive a single mouse+touch path; the globe canvas sets
  `touch-action: none` so dragging it does not scroll/zoom the page. No hover-only
  affordances are required to operate the sim (city callouts are a hover/tap
  enhancement; city names are also in the live description). Interactive targets
  (buttons, sliders) meet the ≥ 44px (2.75rem) minimum.

## Known items for human QA

- Verify slider `aria-valuetext` is announced (not just the raw value) on NVDA and
  VoiceOver, and that the live region is not duplicated or truncated.
- Verify the canvas description is announced when toggling features/cities and after
  cursor moves.
- Confirm color contrast of the map arcs against the shaded globe at the edges.
