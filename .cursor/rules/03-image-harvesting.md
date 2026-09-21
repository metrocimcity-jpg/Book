# Gather artwork (no generation)

Images are *found and downloaded* from free-licence sources. Nothing is generated
by an image model. If no acceptable file exists, keep `placeholder.svg` and log the
gap — do not substitute a lookalike taxon, and do not invent a file.

Pack-local harvesters: `Mammals/scripts/fetch-images.mjs`, `Birds/scripts/fetch-images.mjs`.
Walk that pack’s taxonomy JSON; store under that pack’s `assets/img/`.

## Preference order

**Mammals (illustrations first):**

1. PhyloPic API v2 (`https://api.phylopic.org`) — taxon-name silhouettes.
2. Wikimedia Commons — illustration/plate/lithograph/drawing; PD / CC-BY / CC-BY-SA.
   Seams: *Brehms Tierleben*, Lydekker, Audubon quadrupeds, Wolf, Mützel, Haeckel.
3. Openverse `license_type=commercial,modification`.
4. Photograph last: iNaturalist CC0/CC-BY/CC-BY-SA or Commons taxon lead. Mark
   `"kind": "photo"`.

**Birds (order + family):** English Wikipedia `pageimages`, then Commons `imageinfo`
for licence metadata. Painting vs photograph does not matter. Commons / Openverse /
PhyloPic / iNaturalist remain fallbacks. Non-Wikipedia credits are upgradeable.
The 70% illustration target does **not** apply to the Wikipedia harvest.

Reject NC, ND, unclear rights, and fair use. When in doubt, skip.

## Resolution per node

- Query the node’s scientific name first.
- If empty, climb: genus → type species (`species[0].name`) → family. Set
  `resolvedFrom` so the UI can caption inheritance honestly.
- Never climb past family for a genus, or past order for a family.

## Processing

- Rate-limit ≤ 2 req/s per host, descriptive `User-Agent`, backoff on 429/5xx.
- Resume: skip names already in `assets/credits.json` unless `--force`.
- Ask before installing `sharp`. Else store source pixels and size in CSS.
  Prefer 640px derivatives from the API. Keep SVG as-is.
- Filenames: `assets/img/<rank>/<name-lowercased-hyphenated>.webp` (and `@2x`).
- Every file needs `credits.json` (creator, licence, licence URL, source URL) and
  a line in `CREDITS.md`. An image on disk without a credit is a bug.

## Placeholder

`assets/img/placeholder.svg`: neutral `currentColor` silhouette. UI captions
“No free illustration found yet”. Log misses to `data/raw/missing-images.txt`.

## Definition of done

- Harvester reports: total nodes, resolved, inherited, photo fallbacks, missing.
- Mammals targets: **100% orders**, **≥95% families**, **≥80% genera**, **≥70%
  illustrations** — or state the real numbers and do not loosen licences.
- Birds Wikipedia harvest: all orders and families, or list the missing names.
- `CREDITS.md` regenerated; assert every credit has `license` + `sourceUrl`.
