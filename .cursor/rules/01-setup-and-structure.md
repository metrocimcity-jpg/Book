# Stage 1 — Scaffold the `mammals/` subfolder

Create the following structure inside the current repository. Do not touch files outside
`mammals/`.

```
mammals/
├── index.html
├── styles/
│   ├── tokens.css          # colour, spacing, type scale, light/dark
│   └── app.css
├── src/
│   ├── main.js             # entry: loads data, mounts chart + UI
│   ├── sunburst.js         # the D3 chart module (stage 4)
│   ├── panel.js            # detail panel (stage 5)
│   ├── search.js           # (stage 5)
│   └── util/
│       ├── format.js       # number + name formatting
│       └── dom.js          # tiny helpers, no framework
├── data/
│   ├── raw/                # downloaded source files, gitignored
│   └── mammals.json        # generated tree (stage 2)
├── assets/
│   ├── img/                # taxon artwork (stage 3)
│   │   ├── order/
│   │   ├── family/
│   │   ├── genus/
│   │   └── placeholder.svg
│   └── credits.json        # generated (stage 3)
├── scripts/
│   ├── build-taxonomy.mjs  # stage 2
│   ├── fetch-images.mjs    # stage 3
│   └── lib/
├── vendor/
│   └── d3.v7.min.js
├── package.json            # type: module; scripts only, zero runtime deps
├── NOTES.md
├── CREDITS.md              # generated/updated by stage 3
└── README.md
```

## Tasks

1. `npm init -y` inside `mammals/`, then set `"type": "module"` and `"private": true`.
   Scripts:
   - `"data": "node scripts/build-taxonomy.mjs"`
   - `"images": "node scripts/fetch-images.mjs"`
   - `"serve": "npx --yes serve . -l 5173"` (any static server is fine)
2. Vendor D3: download `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js` into
   `mammals/vendor/d3.v7.min.js`. Record the exact version in `NOTES.md`.
3. `index.html`: semantic shell only — `<header>` with title and search slot,
   `<main>` with `<figure id="chart">`, `<aside id="panel">`, `<footer>` linking
   `CREDITS.md`. Load `src/main.js` as `<script type="module">`.
4. `styles/tokens.css`: define CSS custom properties on `:root`, redefine under
   `@media (prefers-color-scheme: dark)`. Palette should read as natural-history
   print: warm paper background, ink text, muted earth accents. The sunburst's own
   hues come from the order-level scale defined in stage 4 — tokens define
   background, text, border, panel, focus ring, shadow only.
5. `.gitignore` inside `mammals/`: `node_modules/`, `data/raw/`.
6. `main.js` for now: fetch `data/mammals.json`, log the node count, render a
   "data not built yet" message if the file is missing. It must fail gracefully.

## Design notes

- Type: one serif for taxon names (system stack: `ui-serif, Georgia, "Iowan Old Style", serif`),
  one sans for UI chrome. No webfont downloads at runtime.
- Layout: chart is square and centred, capped at `min(90vmin, 900px)`; panel is a
  right-hand column on `>=900px`, a bottom sheet below that.
- Respect `prefers-reduced-motion` from the start — a token `--motion-duration`
  that collapses to `0ms` is enough for now.

## Definition of done

- `cd mammals && npm run serve` serves a page that renders the shell without console errors.
- `mammals/vendor/d3.v7.min.js` exists and `index.html` works with the network throttled
  to offline after first load.
- Paste the directory tree and the browser console output.
