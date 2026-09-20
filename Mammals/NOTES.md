# Mammals sunburst — working notes

Append-only log of resolved versions, API quirks, and decisions.

## Stage 1 — scaffold

- D3 vendored as `vendor/d3.v7.min.js` from `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`.
  Header records **v7.9.0**. File size 279706 bytes.
- Folder lives at `Mammals/` (Windows checkout). Paths in HTML/JS are relative so the
  page also works from a `/mammals/` subpath.
- No runtime dependencies. `npm run serve` uses `npx serve` as a static server only.
- `sharp` was not installed: image derivatives are requested at 640px from the source
  APIs, and SVGs are stored as-is. CSS handles display sizing.

## Stage 2 — taxonomy

- Source of truth: ASM Mammal Diversity Database, resolved via the Zenodo concept
  DOI `10.5281/zenodo.4139722` → latest record at build time.
- `npm run data` passes `--include-extinct` so recently-extinct taxa are present in
  the committed JSON with `"extinct": true`. The UI filters them client-side
  (stage 5). Running the script without the flag still skips extinct rows.
- Latest Zenodo record resolved as **MDD v2.5** (record `21654811`,
  DOI `10.5281/zenodo.21654811`, file `MDD_v2.5_6904species.csv`, 9.3 MB).
  Direct transfer from Zenodo stalled at ~10 KB/s and reset. Built instead from
  the official **MDD v2.4** species CSV (`MDD_v2.4_6871species.csv`, 9 133 256
  bytes) retrieved 2026-09-19 from the GitHub mirror
  `PaulESantos/rmdd` / `data-raw/MDD/` (same ASM dataset). Re-run `npm run data`
  when Zenodo is reachable to pin v2.5.
- Parsed counts (include extinct): **27 orders, 167 families, 1 360 genera,
  6 871 species**. All inside the stage-2 ranges.
- Spot checks: `Carnivora → Felidae → Panthera` has 5 species including
  `Panthera leo`. Largest orders: Rodentia 2808, **Chiroptera 1509** (second),
  Eulipotyphla 618.
- `mammals.json` is 700 KB raw / **125 KB gzipped** (budget 250 KB).
- MDD species CSV has no order/family common-name column in v2.4. Higher-taxon
  `common` is left missing rather than invented.
- Incertae sedis / unnamed genera collapse to `(unplaced)`.

## Stage 5 — species ring

- Global species ring (~6 800 extra arcs) is too heavy for a fluid zoom.
  The toggle is enabled only when focus is a **family or genus**, and expands
  species just under that subtree (`expandSpeciesUnder`). Documented here as
  required.

## Image fetch

- User-Agent: `mammals-sunburst/1.0 (+https://www.mammaldiversity.org/; local educational viz)`.
  No project contact address was supplied.
- `sharp` not installed; APIs are asked for 640 px derivatives, SVGs stored as-is.
- First Wikimedia query (`Name illustration OR plate OR lithograph`) returned the
  same public-domain portrait (*Ole Rasmussen Apeness litografi*) for most orders
  because "lithograph" matched a person, not a taxon. Those files were deleted.
  The harvester now: (1) uses PhyloPic `filter_name` (lowercase) + clade images,
  (2) requires the taxon name in the Commons title/description, (3) rejects
  portraits, (4) refuses to reuse a source URL on another taxon.

## Zoom / click

- `#chart-status` uses `display: grid` and `position: absolute; inset: 0`. That
  author rule beat the `hidden` attribute’s UA `display: none`, so an empty
  overlay sat on top of the SVG and ate every click. `.chart-status[hidden]`
  is now `display: none !important`.
- Centre artwork and caption use `pointer-events: none` so they do not steal
  clicks from the parent-zoom disc (Bostock model: click an arc to zoom in,
  click the centre to zoom out).
- Leaf arcs zoom too, matching Observable’s Zoomable Sunburst; they no longer
  short-circuit to a panel-only select.
- Clicking an arc or the centre focused the SVG node and Chrome drew a
  rectangular outline around the hub. Outline is suppressed; keyboard
  `:focus-visible` keeps a circular stroke. Mouse clicks blur the target.
- Label halo used `stroke: var(--paper)` with hide-via-`fill-opacity` only.
  In dark mode that left black stroke-only names on the rings. Hidden
  labels now also set `stroke-opacity` to 0.
- Tiny slices no longer get labels: a name shows only if the arc is wider
  than the text (`midR * angle > nameLen * 6.2 + 10`). Hidden labels also
  set `stroke-opacity` to 0 so dark-mode halos do not leave black blobs.
