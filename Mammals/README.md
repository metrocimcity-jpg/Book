# Mammalia

Data, colour tokens, and images for the mammal sunburst. Open the repository root and choose **Mammals** (`/?group=mammals`).

Current build (MDD **v2.4**, retrieved 2026-09-19): **27 orders, 167 families, 1,360 genera, 6,871 species**. Arc angle is species count, so Rodentia and Chiroptera dominate — that is the real shape of mammal diversity.

<p>
  <img src="assets/img/order/carnivora.svg" alt="Carnivora silhouette (Nandinia binotata)" width="280">
  <img src="assets/img/order/didelphimorphia.webp" alt="Opossum plate, Didelphimorphia (Albertus Seba)" width="360">
</p>

*Left: Carnivora (PhyloPic). Right: Didelphimorphia (Seba). Gathered from free-licence sources; see [CREDITS.md](CREDITS.md).*

## Rebuild

From the repository root:

```bash
node Mammals/scripts/build-taxonomy.mjs --include-extinct
node Mammals/scripts/fetch-images.mjs
node Mammals/scripts/verify.mjs
```

## Data provenance

Taxonomy comes from the [ASM Mammal Diversity Database](https://www.mammaldiversity.org/).
The build script resolves the current Zenodo release from concept DOI
[10.5281/zenodo.4139722](https://doi.org/10.5281/zenodo.4139722) and records the pinned
version in `data/meta.json` and `NOTES.md`.

## Image provenance

Artwork is **gathered, never generated**. Sources, in preference order: PhyloPic,
Wikimedia Commons plates, Openverse, then a labelled photograph fallback. Every file
is listed in `CREDITS.md` with creator, licence, and source URL.

## Licence

Code in this folder is MIT (see the repository `LICENSE`). Images keep their upstream licences.
