# Trees sunburst — working notes

Append-only log of resolved versions, API quirks, and decisions.

## Scaffold

- Created 2026-09-20 as a data/styles/images pack for the shared UI at the repository root.
- UI lives in `shared/` and `index.html`. This folder does not duplicate `src/` or vendored D3.
- `data/tree.json` is a root stub with no children. Taxonomy was not copied from Mammalia and was not invented.
- Switch to this group from the hub: `/?group=tree`.

## Taxonomy harvest 2026-09-20

- Source: GlobalTreeSearch DwC-A (57596 species with an order).
- Counts: 61 orders, 267 families, 4161 genera, 57596 species.
- Licence: CC-BY-NC 4.0 (BGCI).

## Names — Latin / English / فارسی (2026-09-20)

- Wikidata harvest via `scripts/fetch-names.mjs` (`P225` + `rdfs:label` in `en`/`fa`).
- Missing vernaculars fall back to Latin; nothing is invented. Species English still prefers checklist `common` when present.
- Mammals/data/vernacular.json: 718 taxa, 334 English, 559 Persian (8426 names in tree)
- Birds/data/vernacular.json: 908 taxa, 202 English, 852 Persian (13806 names in tree)
- Fishes/data/vernacular.json: 637 taxa, 170 English, 588 Persian (53371 names in tree)
- Tree/data/vernacular.json: 188 taxa, 84 English, 176 Persian (62085 names in tree)
- Bushes/data/vernacular.json: 327 taxa, 185 English, 279 Persian (47127 names in tree)
- Shrubs/data/vernacular.json: 271 taxa, 134 English, 239 Persian (62160 names in tree)
- Flowers/data/vernacular.json: 595 taxa, 366 English, 450 Persian (112168 names in tree)
- Amphibians/data/vernacular.json: 14 taxa, 3 English, 13 Persian (9700 names in tree)
- Insects/data/vernacular.json: 151 taxa, 32 English, 140 Persian (2156 names in tree)
