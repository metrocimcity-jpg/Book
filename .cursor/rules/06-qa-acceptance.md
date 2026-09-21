# QA, performance, documentation

Work from the **repository root**. Do not add a per-pack `package.json` or serve
a deleted `Mammals/index.html`.

## Integrity

`Mammals/scripts/verify.mjs` and `Birds/scripts/verify.mjs` must fail on:

- Counts outside that pack’s asserted ranges.
- Genus `value` ≠ `species.length`.
- Credit pointing at a missing file, or missing `license` / `sourceUrl` /
  `creator` (creator may be `"Unknown"` only for PD-old).
- Image on disk with no credit (orphan).
- `licenseUrl` containing `nc` or `nd`.
- Duplicate taxon name at the same rank under different parents, except `(unplaced)`.

## Tests

`npm test` runs `Mammals/tests/*.test.mjs`, `Birds/tests/*.test.mjs`, and
`shared/tests/*.test.mjs` (`node --test`). Cover tree building, catalog,
`?group=` parsing, search/hash, palette wrap, Latin/English/Persian
`displayName`. No DOM framework.

UI changes: exercise the hub in the browser (`npm run serve`) for the groups
you touched — switcher, zoom, search, names, extinct filter.

## Performance (record in `NOTES.md` if you measure)

| Metric | Budget |
|---|---|
| Pack `*.json` gzipped (genus-leaf tree) | < 250 KB where feasible; plant/fish dumps may exceed — report the real size |
| Time to interactive, local server | < 1.5 s for mammals/birds |
| Zoom transition | ≥ 55 fps on mammals/birds |
| Images lazy-loaded | all except the focused centre disc |

If a budget is missed, report the number and cause. Do not rewrite the budget.

## Documentation

Root `README.md`: hub table, `/?group=` URLs, `npm run serve` / `test` / `data` /
`names`. Pack README: provenance, rebuild command, pointer to `CREDITS.md`, no
claim that the pack is a standalone app.

Append harvest notes to the pack `NOTES.md` and `shared/NOTES.md` when the hub
behaviour changes.

## Sweep

- No `console.log` left in `shared/src`.
- No absolute `/` asset paths; hub works from the site root.
- Network panel: no third-party runtime requests after load.
- Do not recreate independent shells in `Mammals/` or `Birds/`.

## Sign-off

Counts table (or pointer to `meta.json`), image coverage if harvested, test
output, and anything that missed its target with the reason.
