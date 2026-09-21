# Book of life — shared sunburst hub

One UI, several life groups. Each group folder holds **data**, **colour tokens**, and **images**. The chart, search, panel, and name switcher live once in `shared/` and `index.html`.

<p>
  <img src="Mammals/assets/img/order/carnivora.svg" alt="Carnivora silhouette" width="280">
  <img src="Birds/assets/img/family/trochilidae.webp" alt="Hummingbirds, Trochilidae (Ernst Haeckel)" width="360">
</p>

*Left: Carnivora (mammals). Right: Trochilidae, Haeckel plate (birds).*

| Group | Folder | Taxonomy | URL |
| --- | --- | --- | --- |
| [Mammalia](Mammals/README.md) | `Mammals/` | ASM Mammal Diversity Database v2.4 · 27 orders, 6,871 species | `/?group=mammals` |
| [Aves](Birds/README.md) | `Birds/` | AviList v2025b · 46 orders, 11,131 species | `/?group=birds` |
| [Fishes](Fishes/README.md) | `Fishes/` | GBIF Backbone · 63 orders, 46,114 species | `/?group=fishes` |
| [Trees](Tree/README.md) | `Tree/` | BGCI GlobalTreeSearch · 61 orders, 57,596 species | `/?group=tree` |
| [Bushes](Bushes/README.md) | `Bushes/` | WCVP lifeform *subshrub* · 64 orders, 43,398 species | `/?group=bushes` |
| [Shrubs](Shrubs/README.md) | `Shrubs/` | WCVP lifeform *shrub* · 66 orders, 57,321 species | `/?group=shrubs` |
| [Flowers](Flowers/README.md) | `Flowers/` | WCVP herbaceous lifeforms · 63 orders, 106,477 species | `/?group=flowers` |
| [Amphibia](Amphibians/README.md) | `Amphibians/` | AmphibiaWeb 2026-04-01 · 3 orders, 9,014 species | `/?group=amphibians` |
| [Insecta](Insects/README.md) | `Insects/` | GBIF Backbone · 42 orders, 2,113 families, 1,102,569 species counted | `/?group=insects` |

`Mammals/` and `Birds/` are data packs like the other groups (taxonomy, tokens, images). The hub at the repository root is the only UI.

Click an arc to zoom in, the centre disc to zoom out. Search and `#/Order/Family/Genus` deep links jump to a taxon. Artwork is gathered from free-licence sources (never generated); licences are listed per file in each folder’s `CREDITS.md`.

Rebuild a group checklist with `node scripts/build-group.mjs --group=fishes` (or `--group=all`). Raw downloads stay in `data/raw/` (gitignored). Insecta stops at family: GBIF has ~1.1 million accepted species, which is too large for a genus/species dump. Kew has no lifeform “bush”; that pack uses **subshrub**. GlobalTreeSearch is CC-BY-NC.

## Serve the hub

```bash
npm run serve    # http://localhost:5173
npm test
```
