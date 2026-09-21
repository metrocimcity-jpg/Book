# Book of life — Cursor prompt pack

A multi-file prompt for **Cursor Desktop**. Attach one file at a time with `@` when
changing that area. The hub already exists; do **not** scaffold a second app.

Windows checkouts use capitalised folder names. Paths in HTML/JS are relative.

## Layout

| Path | Role |
|---|---|
| `index.html` + `shared/` | The only UI (chart, search, panel, names, group switcher) |
| `Mammals/` … `Insects/` | Data packs: taxonomy JSON, tokens, images, credits, harvest scripts |
| `scripts/build-group.mjs` | Taxonomy harvest for fishes, trees, bushes, shrubs, flowers, amphibians, insects |
| `scripts/fetch-names.mjs` | Wikidata English/Persian vernaculars → each pack’s `data/vernacular.json` |
| `.cursor/rules/cursor-rules.mdc` | Always-on agent rules |

| Group | Folder | Taxonomy | URL |
|---|---|---|---|
| Mammalia | `Mammals/` | ASM Mammal Diversity Database | `/?group=mammals` |
| Aves | `Birds/` | AviList | `/?group=birds` |
| Fishes | `Fishes/` | GBIF Backbone (Chordata minus non-fish) | `/?group=fishes` |
| Trees | `Tree/` | BGCI GlobalTreeSearch | `/?group=tree` |
| Bushes | `Bushes/` | WCVP lifeform *subshrub* | `/?group=bushes` |
| Shrubs | `Shrubs/` | WCVP lifeform *shrub* | `/?group=shrubs` |
| Flowers | `Flowers/` | WCVP herbaceous lifeforms | `/?group=flowers` |
| Amphibia | `Amphibians/` | AmphibiaWeb | `/?group=amphibians` |
| Insecta | `Insects/` | GBIF order → family + species counts | `/?group=insects` |

`Mammals/` and `Birds/` used to be standalone pages. Those shells are gone. Packs
must not grow `index.html`, `src/`, `vendor/`, or `styles/app.css`.

## When to attach which file

| File | Use when |
|---|---|
| `01-setup-and-structure.md` | Adding a group pack or changing hub/pack file layout |
| `02-data-pipeline.md` | Harvesting or reshaping taxonomy JSON |
| `03-image-harvesting.md` | Gathering taxon artwork |
| `04-sunburst-d3.md` | Changing zoom, arcs, labels, colour |
| `05-interaction-ui.md` | Search, panel, breadcrumbs, names, URL, a11y |
| `06-qa-acceptance.md` | Tests, verify scripts, README, sign-off |

## Hard constraints

- Visual model: Mike Bostock’s Zoomable Sunburst (ISC). Reimplement as ES modules;
  do not import the Observable runtime.
- **Images gathered, never generated.** Mammals prefer illustrations. Birds use
  Wikipedia lead images. Licence: CC0 / CC-BY / CC-BY-SA / PD only; reject NC, ND,
  fair use.
- Names: Latin / English / فارسی. Never invent vernaculars. Missing → scientific name.
- Never invent taxa or species counts. Insecta has no genus/species name list.
- Serve from the repo root (`npm run serve`). D3 is vendored at
  `shared/vendor/d3.v7.min.js`. No runtime network after first load.

## Ground rules for the agent

- Ask before installing any dependency that is not already in use.
- Run the verification command and paste real output. Never claim done from inspection.
- If a remote API differs from a prompt, trust the live API, fix the script, append
  `NOTES.md` in the pack you changed (never rewrite NOTES).
- Keep zoom maths commented where non-obvious (`d.current` / `d.target`).
