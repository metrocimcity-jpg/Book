# Aves — a zoomable sunburst

A self-contained static chart of the bird taxonomy: **class → order → family → genus**,
with species listed in the detail panel. The zoom model is a reimplementation of
[Mike Bostock’s Zoomable Sunburst](https://observablehq.com/@d3/zoomable-sunburst) (ISC).

Current build (AviList **v2025b**, retrieved 2026-09-19): **46 orders, 252 families,
2,376 genera, 11,131 species**. Arc angle is species count, so Passeriformes
dominates — that is the real shape of bird diversity.

<p>
  <img src="assets/img/order/aegotheliformes.webp" alt="Owlet-nightjar plate, Aegotheliformes (Keulemans)" width="360">
  <img src="assets/img/family/trochilidae.webp" alt="Hummingbirds, Trochilidae (Ernst Haeckel)" width="360">
</p>

*Left: Aegotheliformes (Keulemans). Right: Trochilidae (Haeckel). Gathered from free-licence sources; see [CREDITS.md](CREDITS.md).*

Open `index.html` through a local static server (`npm run serve`). There is no bundler
and no runtime network after the first load.

## Rebuild

```bash
npm run data      # download AviList checklist, write data/*.json
npm run images    # gather free-licence taxon artwork
npm run verify    # integrity checks
npm test          # pure logic tests
npm run serve     # http://localhost:5173
```

## Data provenance

Taxonomy comes from [AviList: The Global Avian Checklist](https://www.avilist.org/).
The build script downloads the official short workbook
(`AviList-v2025b-10Jun2026-short.xlsx`, DOI
[10.2173/avilist.v2025b](https://doi.org/10.2173/avilist.v2025b)) and records the
pinned version in `data/meta.json` and `NOTES.md`. Only species rows are kept;
subspecies and higher-rank rows are dropped.

## Image provenance

Artwork is **gathered, never generated**. Sources, in preference order: Wikimedia
Commons plates and paintings, Openverse, PhyloPic silhouettes, then a labelled
photograph fallback. Every file is listed in `CREDITS.md` with creator, licence,
and source URL. Image licences are separate from this repository’s code licence
and apply per file.

## Licence

Code in this folder is MIT (see the repository `LICENSE`), except D3 (ISC) and the
Bostock zoomable-sunburst interpolation (ISC). Images keep their upstream licences.
