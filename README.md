# Longitude/Latitude Demonstrator (Accessible HTML5)

An interactive globe that demonstrates latitude and longitude, ported from the
original Adobe Flash simulation to a self-contained, accessible HTML5 simulation
built on the KL-UNL foundation.

## It must be served over HTTP — it will NOT run from a double-clicked file

Opening `index.html` directly from your file system (a `file://` path) shows a
broken/empty masthead and the title/Help/About will not load.

**Why:** the KL-UNL masthead component (`foundation/kl-unl-masthead.js`) loads its
title and Help/About text with `fetch('foundation/contents.json')`. Browsers block
`fetch()` of local files under the `file://` protocol (same-origin policy), so the
fetch fails. Served over HTTP the fetch succeeds and the simulation loads normally.

## How to run it locally

Serve **from inside this `html5/` folder** (so `html5/` is the server root). Then the
foundation files resolve correctly (the masthead's internal `../foundation/...`
references and the `foundation/...` links line up at the server root).

From a terminal **inside `html5/`**:

```
# Python 3
python -m http.server 8123
#   then open  http://localhost:8123/

# Node
npx serve
#   (or)  npx http-server

# VS Code
#   use the "Live Server" extension and open index.html
```

Note: because you serve from inside `html5/`, the simulation is at the server root,
so the URL is `http://localhost:8123/` — not `.../html5/index.html`.

## Production

When deployed to the cloud host (served over HTTP/HTTPS) it just works. The
`file://` limitation only affects local double-clicking.

## Files

```
html5/
  index.html          page scaffold (KL-UNL masthead + globe + controls)
  foundation/         KL-UNL foundation, copied unchanged (see CONVERSION_NOTES.md)
  styles/styles.css   sim-specific styles only
  simulation.js       all simulation logic
  assets/
    globe-background.svg   reused exported globe disc (Flash shape 13)
    shore-data.js          coastline polygons, copied verbatim from the source
  README.md
  CONVERSION_NOTES.md
  ACCESSIBILITY.md
```
