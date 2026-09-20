# Stage 2 — Build the mammal taxonomy tree

Write `mammals/scripts/build-taxonomy.mjs`, which downloads an authoritative mammal
checklist, normalises it, and emits `mammals/data/mammals.json` in the exact shape the
D3 sunburst consumes.

## Source of truth

**Mammal Diversity Database (MDD)** — American Society of Mammalogists.
Site: <https://www.mammaldiversity.org/> · Repo:
<https://github.com/mammaldiversity/mammaldiversity.github.io> · Versioned releases on
Zenodo: <https://doi.org/10.5281/zenodo.4139722>

As of MDD v2.2 the checklist covers roughly **6,800 species, 1,350+ genera,
167 families, 27 orders** of living and recently-extinct mammals. Treat those numbers
as a sanity range, not a target — print the real counts you parse.

**Instructions:**

1. Resolve the current release programmatically (Zenodo API record for the MDD concept
   DOI, or the CSV in the GitHub repo). Do not hardcode a version URL that will rot —
   resolve, then log and pin the resolved version + URL into `NOTES.md`.
2. Download the species-level CSV into `data/raw/`. Cache it: if the file is present and
   its recorded version matches, skip the download.
3. Columns vary between MDD versions. Detect them case-insensitively, accepting the usual
   spellings: `order`, `family`, `genus`, `specificEpithet`/`species`, `sciName`,
   `mainCommonName`/`commonName`, `extinct`, `domestic`, `iucnStatus`, `authorityYear`,
   `continentDistribution`. If a required column is missing, fail loudly with the header
   list printed.
4. Fallback source if MDD is unreachable: GBIF Backbone Taxonomy via
   `https://api.gbif.org/v1/species/search?highertaxonKey=359&rank=SPECIES` (Mammalia).
   Implement it behind `--source=gbif` but keep MDD as the default.

## Normalisation rules

- Capitalise ranks consistently: `Carnivora`, `Felidae`, `Panthera`, `Panthera leo`.
- Skip rows flagged `extinct = 1` **unless** `--include-extinct` is passed; recently
  extinct species get `"extinct": true` and are rendered muted, not dropped, when included.
- Keep domestic forms but mark `"domestic": true`.
- Trim incertae sedis / unnamed genera into a sibling node `"(unplaced)"` rather than
  discarding them.
- Sort children alphabetically at build time; the chart re-sorts by value.

## Output shape

`data/mammals.json` — one object, D3 `hierarchy`-ready:

```json
{
  "name": "Mammalia",
  "rank": "class",
  "children": [
    {
      "name": "Carnivora",
      "rank": "order",
      "common": "Carnivorans",
      "children": [
        {
          "name": "Felidae",
          "rank": "family",
          "common": "Cats",
          "children": [
            {
              "name": "Panthera",
              "rank": "genus",
              "value": 5,
              "species": [
                { "name": "Panthera leo", "common": "Lion", "iucn": "VU", "year": 1758 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Key decisions, follow them exactly:

- **The rendered tree stops at genus.** Genus nodes are leaves with
  `value = number of species`. Their species live in a `species[]` array that the chart
  ignores and the detail panel reads. This keeps the sunburst at ~1,550 arcs instead of
  ~8,400 — the difference between a fluid chart and a janky one.
- Also emit `data/mammals.species.json` containing the same tree **with** species as a
  fifth ring, for the optional "show species" toggle in stage 5.
- Emit `data/meta.json`: `{ source, version, doi, retrievedAt, counts: { orders, families, genera, species } }`.
  The footer renders this as the citation line.
- Pretty-print with 0 indentation (minified) but keep key order stable so diffs are readable.

## Vernacular names

Do not invent English or Persian names, and do not fold them into the taxonomy JSON.
`scripts/fetch-names.mjs` writes `data/vernacular.json` from Wikidata (`wdt:P225`
taxon name, `rdfs:label` and `wdt:P1843` in `en`/`fa`). Species English names already
live on each species as `common` from MDD / AviList. The UI falls back to Latin when
a vernacular is missing.

## Definition of done

- `npm run data` prints a counts table and writes all three JSON files.
- Assert in the script (and fail non-zero) that: root has 20–30 order children, total
  families 150–190, genera 1,200–1,500, species 6,000–7,500.
- Spot check printed to stdout: the path `Carnivora → Felidae → Panthera` exists with
  5 species including `Panthera leo`, and `Chiroptera` is the second-largest order by
  species count.
- `NOTES.md` records the resolved MDD version, URL, and retrieval date.
