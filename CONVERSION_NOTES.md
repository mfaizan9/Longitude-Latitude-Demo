# Conversion Notes — Longitude/Latitude Demonstrator

## Behavior model (one paragraph)

The simulation shows a 3-D globe of the Earth. Coastlines, an equator, a prime
meridian, the international date line, twenty city markers, and a movable cursor are
projected onto the globe. Clicking (and dragging) on the globe sets the cursor's
**latitude/longitude**, which is read out in the panel and drawn on the globe as a
blue latitude arc and a red longitude arc (with reference circles). Shift-dragging
rotates the globe's orientation. The reader can switch the coordinate read-out between
decimal degrees and sexagesimal (degrees-and-minutes), toggle the city markers and the
named reference features on and off, and open the current point in Google Maps.

## Source → HTML5 mapping

The decompiled AS1 is a generic "CelestialSphere" 3-D engine reused as an Earth globe
via the `shoreDemo` object. For **this** sim the engine is exercised purely in the
**horizon coordinate system** with a single shared orientation `(theta, phi)`, so the
whole 3-D pipeline collapses to one orthographic projection (`doA` a-matrix, R = 150):

```
screenX = x*a0 + y*a1
screenY = x*a3 + y*a4 + z*a5
depth   = x*a6 + y*a7 + z*a8      (>= 0  =>  front hemisphere, visible)
```

Because the opaque white globe disc hides the back hemisphere, only front-facing
geometry (depth ≥ 0) is ever visible. The port therefore draws only the front-facing
portions — exactly the visible result the Flash version produced — which avoids
reproducing the engine's elaborate depth-sorting / masking machinery while remaining
behaviorally identical.

| Source (ActionScript) | HTML5 port |
|---|---|
| `doA` (orientation matrix), R=150 | `doA()` in `simulation.js`, verbatim |
| `parsePointInput` horizon→xyz | `horizonToXYZ()` |
| `StoMH`, `getMouseAltAz` (screen→lat/long) | `StoMH()`, `getMouseAltAz()`, verbatim |
| `shoreDemo.updateOnEnterFunc` coastline cull | `drawShores()`, verbatim front/back cull |
| `CSCircles` `doW` + `update` (great circles/arcs) | `doW()` + `drawCircle()` (front-facing sampler) |
| `CSCircles.setArcPoints` (IDL segments) | `circleFromArcPoints()`, verbatim |
| `setCircleParameters` | `circleFromParams()`, verbatim clamps |
| `shoreDemo.toFixed` (custom) | `toFixed()`, verbatim |
| `moveCursor` string/DMS formatting | `cursorStrings()`, verbatim |
| `updateStrings` (format switch) | `displayStrings()` |
| `shoreDemo.updateSimpleDragging` (shift-drag) | `doRotate()`, verbatim math |
| `City Dot` / `City Label` | canvas dots + HTML callout overlay |
| `Label` objects | `drawLabel()` (see divergence below) |
| `openGoogle` URL | `googleBtn` handler (URL verbatim; `http`→`https`) |
| `cityList`, `IDL`, `_root.shoreData` | `CITY_LIST`, `IDL`, `assets/shore-data.js` (verbatim) |
| FRadioButton / FCheckBox / FPushButton | native `<input type=radio/checkbox>`, `<button>` |

All constants, the city table, the IDL vertices, the coastline data, the angle
constants, the number formatting, and the great-circle algebra are copied **verbatim**.

## Reused vs. code-drawn assets

- **Reused as-is:** the globe background disc — exported Flash shape `13.svg`, copied to
  `assets/globe-background.svg` and drawn with `drawImage` (not redrawn).
- **Code-drawn (genuinely runtime geometry in the AS):** coastlines, the great
  circles/arcs, the radial shading "bowl" (`CSGradientDisk`, built with
  `beginGradientFill`), the cursor dot, and the city dots. These are drawn on the
  `<canvas>` with the same coordinates/colors as the AS.

## The `contents.json` entry

The masthead sim-id is **`longlat`**, and that entry **already exists** in the shared
`foundation/contents.json` (title "Longitude/Latitude Demonstrator", version 2.0, with
Help and About text). **No new entry was added.**

### IMPORTANT — pre-existing JSON defects fixed in the copied `contents.json`

The supplied `foundation/contents.json` is **not valid JSON** as delivered, which makes
the masthead's `fetch(...).json()` throw and breaks the title/Help/About for **every**
sim (not just this one). The defects, all in **sibling** entries (none in `longlat`),
were:

- 5 raw control characters inside string values (4 stray newlines, 1 tab) —
  near the `ce_hc`, `celhorcomp`, and similar entries;
- 2 unescaped `"` quotes inside `href="..."` HTML in the `phasesofvenus` /
  `venusphases` entries (`<a href="../ptolemaic">`, `<a href="../venusphases">`).

To make this deliverable load, the **copied** `html5/foundation/contents.json` was
corrected with **syntactic-only** fixes (stray control chars → a single space; the two
`href` quote pairs → `\"`). No entry's visible text was changed, and the `longlat`
entry is byte-identical to the source. **These same fixes should be applied upstream to
the shared `contents.json`,** since the defect affects all sims in the pipeline. This is
the only foundation file content that was changed; `kl-unl.js`, `kl-unl.css`, and
`kl-unl-masthead.js` are byte-for-byte unchanged.

## MathJax

This demonstrator contains **no equations, variables, subscripts, or mathematical
notation** — only latitude/longitude coordinate read-outs (e.g. `40° 48' N`). The
foundation ships **no local MathJax** file and the project rules forbid CDN
dependencies (must be self-contained). Per direction, MathJax is therefore **not
loaded**; the coordinate read-outs are rendered as accessible HTML text with full
spoken units (see ACCESSIBILITY.md). If equation content is ever added, a local MathJax
build should be vendored and wired through `klunlShowEquation`.

## Deviations from the original

1. **Only front-facing geometry is drawn** (see above). Visually identical, because the
   opaque disc always hid the back hemisphere in the original.
2. **In-globe label orientation.** The AS `Label` objects lie "flat" on the sphere
   (skewed/rotated to the surface). The port draws them upright at the same projected
   position for legibility and zoomability. The text/positions are otherwise faithful,
   and the same information is in the screen-reader description. (See ACCESSIBILITY.md.)
3. **Cursor / city dots** are drawn on canvas to match the exported symbol renders
   (`sprites/DefineSprite_70_Cursor Dot`, `sprites/DefineSprite_79_City Dot`): the cursor
   is a solid black dot (radius ~5), city markers are `#666666` dots (radius ~3.5) that
   grow to radius ~4.5 on hover (the original's frame-2 highlight), exactly as measured
   from those renders.
4. **Keyboard controls added.** The original only supported mouse click/drag. To make
   the draggable cursor and the globe rotation keyboard-operable (WCAG 2.1.1), native
   sliders were added for cursor latitude, cursor longitude, globe rotation, and globe
   tilt. They mutate the same state object as the pointer paths, so mouse, touch, and
   keyboard stay in sync.
5. **Google Maps URL** uses `https` instead of the original `http` (the query string is
   otherwise byte-for-byte the original `openGoogle` pattern).
6. **Layout** follows the KL-UNL shell (panels, classes, palette) rather than the Flash
   pixel layout, but matches the arrangement and proportions of the provided original
   screenshot: a large globe on the left, the "point location" read-outs and a compact
   controls column on the right (with the decimal/sexagesimal radios inline), and the
   instructions beneath the globe. The sim-specific column proportions are set in
   `styles/styles.css` (layered on the foundation `.app-layout` grid; the 56rem
   single-column collapse is preserved). One intentional visual difference: the original
   slants the on-globe latitude/longitude value labels along their arcs, whereas the port
   draws them upright for legibility/zoomability (the same values are in the read-out
   panel and live region).

## Browser/OS notes

Standards-only HTML/CSS/JS (Canvas 2D, Pointer Events, CSS grid, `<output>`,
`accent-color`). No Chrome-only APIs and no prefix-only CSS. `accent-color` is a
progressive enhancement (sliders/checkboxes still work without it on older Safari).
Verified functionally in the preview (Chromium). Human QA on Safari (desktop + iOS),
Firefox, and Edge is still recommended.
