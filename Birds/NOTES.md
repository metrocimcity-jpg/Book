# Birds sunburst — working notes

Append-only log of resolved versions, API quirks, and decisions.

## Stage 1 — scaffold

- Copied from `Mammals/` on 2026-09-19. Same stack: vanilla ES modules, vendored
  D3 v7.9.0, no runtime network, no generated images.
- Folder lives at `Birds/` (Windows checkout). Paths in HTML/JS are relative.

## Stage 2 — taxonomy

- Source of truth: **AviList v2025b** (DOI `10.2173/avilist.v2025b`), official
  short workbook `AviList-v2025b-10Jun2026-short.xlsx`
  (`https://www.avilist.org/wp-content/uploads/2026/06/AviList-v2025b-10Jun2026-short.xlsx`).
- Sheet 1 columns used: `Taxon_rank`, `Order`, `Family`, `Scientific_name`,
  `English_name_AviList`, `Extinct_or_possibly_extinct`, `IUCN_Red_List_Category`,
  `Authority`. Genus is the first word of the scientific name on species rows.
- Only `Taxon_rank = species` rows enter the tree. Subspecies, genus, family, and
  order header rows are dropped. `--include-extinct` is the default npm script.
- XLSX is unpacked with system `tar` (no extra npm dependency) in `scripts/lib/xlsx.mjs`.
- GBIF Aves (`highertaxonKey=212`) remains a `--source=gbif` fallback only.
- Count ranges: orders 35–55, families 230–280, genera 2200–2600, species 10000–12000.
- Spot checks: `Accipitriformes → Accipitridae → Aquila` must include
  `Aquila chrysaetos`. Largest order should be Passeriformes.
- Parsed counts (include extinct): **46 orders, 252 families, 2 376 genera,
  11 131 species**. All inside the stage-2 ranges.
- Spot checks: `Accipitriformes → Accipitridae → Aquila` has 11 species including
  `Aquila chrysaetos`. Largest orders: Passeriformes 6705, Apodiformes 472,
  Psittaciformes 406.
- Palette is the 27 mammal tones, assigned with modulo so extra bird orders wrap.
- `birds.json` is 983 KB raw / **184 KB gzipped** (under the 250 KB budget).

## Image fetch

- User-Agent: `birds-sunburst/1.0 (+https://www.avilist.org/; local educational viz)`.
- Same harvest order as Mammals: PhyloPic (lowercase `filter_name`) → Commons
  (taxon must appear in title/description; reject portraits) → Openverse → iNaturalist.
- Commons/Openverse queries use `bird OR avian` instead of `mammal`.
- Order harvest 2026-09-19: **38/46** free images after rejecting Lingua Libre
  `.wav` pronunciation files and a PDF. Still missing: Apterygiformes,
  Eurypygiformes, Opisthocomiformes, Otidiformes, Phaethontiformes,
  Podicipediformes, Rheiformes, Tinamiformes. Not loosening licence filters.

## Zoom / labels (ported from Mammals)

- Click outline on the hub is suppressed; keyboard `:focus-visible` keeps a
  circular stroke. Mouse clicks blur the target.
- Hidden labels also set `stroke-opacity` to 0 so dark-mode halos do not leave
  black blobs.
- Tiny slices stay unlabelled: a name shows only if the arc is wider than the
  text (`midR * angle > nameLen * 6.2 + 10`).

## Image fetch — paintings (orders + families)

- User asked for top two ranks only, preferring **paintings of birds**
  (plates, watercolours, Audubon/Gould/Martinet/Naumann/Brehm) over PhyloPic
  silhouettes. Commons is tried first; silhouettes and photos are fallbacks.
  Existing silhouettes are treated as upgradeable. Licence filters unchanged.
