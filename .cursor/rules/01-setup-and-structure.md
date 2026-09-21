# Hub and group-pack layout

Do not scaffold a second chart app. The shell is `index.html` + `shared/`. A life
group is a **pack**: data, tokens, images, credits — no `index.html`, `src/`,
`vendor/`, `styles/app.css`, or `package.json`.

## Hub (already present)

```
index.html                 # loads shared/styles/app.css + pack tokens.css via ?group=
package.json               # serve, test, data, names
scripts/
  build-group.mjs          # fishes, tree, bushes, shrubs, flowers, amphibians, insects
  fetch-names.mjs          # Wikidata vernaculars for --group=all or a list
  lib/                     # csv, gbif, http, taxonomy, wcvp
shared/
  src/                     # catalog, main, sunburst, panel, search, palette, util
  styles/app.css
  vendor/d3.v7.min.js
  tests/
```

Root `.gitignore` covers `node_modules/` and `**/data/raw/`.

## Pack shape (match `Fishes/`)

```
<Group>/
├── styles/tokens.css      # paper/ink tokens + order hues; light/dark
├── data/
│   ├── <group>.json       # genus-leaf tree (insects: family leaves with value)
│   ├── <group>.species.json
│   ├── vernacular.json
│   └── meta.json
├── assets/
│   ├── img/               # order/, family/, genus/, placeholder.svg
│   └── credits.json
├── CREDITS.md
├── NOTES.md               # append-only
└── README.md              # pack provenance; point at /?group=<id>
```

`Mammals/` and `Birds/` also keep their own `scripts/build-taxonomy.mjs`,
`fetch-images.mjs`, `verify.mjs`, and taxonomy tests. Other packs rebuild with
`node scripts/build-group.mjs --group=<id>` from the repo root.

## Adding a group

1. Copy the empty-pack files from an existing stub-like pack (tokens, placeholder,
   CREDITS/NOTES/README). Do not copy `shared/` into it.
2. Register it in `shared/src/catalog.js` **and** the token `folders` map in
   `index.html`.
3. Harvest real taxonomy (`02-data-pipeline.md`). Do not copy Mammalia/Aves taxa
   or invent names.
4. Serve from the repo root: `npm run serve` → `http://localhost:5173/?group=<id>`.

## Tokens

`:root` custom properties for background, text, border, panel, focus, shadow,
`--motion-duration` (collapse to `0ms` under `prefers-reduced-motion`). Sunburst
hues come from `shared/src/palette.js` (27 muted earth tones, extra orders wrap).
Type: serif for taxon names, sans for chrome; no webfont downloads.

## Definition of done

- Hub loads every catalog id without recreating a per-pack page.
- A new pack has no `src/`, `vendor/`, or `index.html`.
- Paste the pack directory tree (non-image files) and the hub URL that opens it.
