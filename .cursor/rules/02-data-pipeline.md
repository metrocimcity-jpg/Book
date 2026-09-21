# Taxonomy pipelines

Do not hand-edit generated `data/*.json`. Fix the harvest script and regenerate.
Never invent taxa, counts, or vernaculars.

## Which script

| Group | Script | Source |
|---|---|---|
| Mammals | `Mammals/scripts/build-taxonomy.mjs --include-extinct` | ASM MDD (Zenodo concept DOI `10.5281/zenodo.4139722`; pin the resolved version) |
| Birds | `Birds/scripts/build-taxonomy.mjs --include-extinct` | AviList official short workbook; species rows only |
| Fishes, Tree, Bushes, Shrubs, Flowers, Amphibians, Insects | `scripts/build-group.mjs --group=<id>` or `--group=all` | see below |

Root `npm run data` runs `build-group.mjs --group=all` (not MDD/AviList).

## Other-group sources (live API wins over this list)

- **Fishes:** GBIF Chordata children minus non-fish classes (mammals, birds, amphibians, reptiles, tunicates, lancelets). Fishes is a vernacular group, not a clade.
- **Tree:** BGCI GlobalTreeSearch Darwin Core archive. Dataset is CC-BY-NC (taxonomy only; still reject NC for images).
- **Shrubs / Bushes / Flowers:** WCVP names table. Shrub = lifeform shrub. Bush = Kew **subshrub** (there is no “bush” lifeform). Flowers = herbaceous lifeforms. Family→order from a cached map, then GBIF match.
- **Amphibians:** AmphibiaWeb taxonomy snapshot (`amphib_names_YYYYMMDD.txt` from the GitHub taxonomy-archive). The daily site URL may be Cloudflare HTML — use the archive file.
- **Insects:** GBIF Insecta children. **Stop at family.** Leaves are `{ rank: "family", value: acceptedSpeciesCount }`. Do not dump ~1.1 million species names.

Cache downloads under `data/raw/` (gitignored). `--include-extinct` is the default for MDD/AviList; `build-group` includes GBIF extinct flags unless `--exclude-extinct`.

## Tree shape

Genus-leaf tree (mammals, birds, fishes, plants, amphibians):

- Root `rank` is `class` or `group`. Children: order → family → genus.
- Genus is a leaf: `value` = species count; species live in `species[]` for the panel.
- Also write `<group>.species.json` with species as a fifth ring (optional UI toggle).
- `meta.json`: `{ source, version, doi?, retrievedAt, counts }`.
- `(unplaced)` for incertae sedis. Sort children alphabetically at build; the chart re-sorts by value.
- Capitalise ranks: `Carnivora`, `Felidae`, `Panthera leo`.

Insect exception: order → family leaves with `value`. `shared/src/util/tree.js`
`countsUnder` / `filterExtinct` must keep those family leaves.

## Vernaculars

Do not fold English/Persian into the taxonomy JSON.

`scripts/fetch-names.mjs --group=all` (or `--group=fishes,flowers`) writes each pack’s
`data/vernacular.json` from Wikidata. Resume via `data/raw/wikidata-vernacular-cache.json`.
English display prefers checklist `common`, then Wikidata. Persian is Wikidata only.
Missing → Latin.

Mammals/Birds still have pack-local `scripts/fetch-names.mjs`; prefer the root script
for hub-wide harvests.

## Definition of done

- Script prints a counts table and writes `<group>.json`, `.species.json`, `meta.json`.
- Spot-check a known path (e.g. mammals `Carnivora → Felidae → Panthera` includes
  `Panthera leo`). If a target range cannot be met, say the real number and why.
- Append source, URL, version, and date to that pack’s `NOTES.md`.
