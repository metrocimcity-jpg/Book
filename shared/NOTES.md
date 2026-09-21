# Shared sunburst UI — working notes

Append-only log.

## Hub (2026-09-20)

- One chart UI in `shared/` plus root `index.html`. Group packs (`Mammals/`, `Birds/`, `Fishes/`, `Tree/`, `Bushes/`, `Shrubs/`, `Flowers/`, `Amphibians/`, `Insects/`) store data, `styles/tokens.css`, and images.
- `?group=` selects the pack. Hash paths still serialise the taxon (`#/Carnivora/Felidae`).
- New packs are empty class/group stubs. Mammal taxa were not copied under other names.
- Folder `Amphibians/` is the spelling for the requested Amphabiant group.
- `Mammals/` and `Birds/` standalone pages were removed (2026-09-20): duplicate
  `index.html`, `src/`, `styles/app.css`, `vendor/d3`, and per-folder `package.json`
  are gone. Packs keep data, tokens, images, and harvest scripts. UI tests moved
  to `shared/tests/`.

## Taxonomy harvest (2026-09-20)

- `npm run data` → `scripts/build-group.mjs`. Sources: AmphibiaWeb snapshot, GBIF Backbone (fishes, insects), GlobalTreeSearch (trees), WCVP lifeforms (shrubs, subshrubs→bushes, herbaceous→flowers).
- Insecta is order → family with GBIF accepted-species counts. Genera/species names are not listed.
- Kew has no “bush” lifeform; bushes use `subshrub`.

## Names harvest (2026-09-20)

- `npm run names` → `scripts/fetch-names.mjs --group=all`. Wikidata `P225` + `en`/`fa` labels; nothing invented. Missing labels stay Latin. Species English still prefers checklist `common`.
- Wikidata Query Service and Action API both 429/maxlag under bulk load. First pass wrote whatever labels were already cached into every group’s `data/vernacular.json`. A slower higher-rank harvest is still filling orders/families/genera. Species-scale (~330k unique names) is not finished.

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
