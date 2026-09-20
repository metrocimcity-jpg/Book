# Stage 6 — QA, performance, documentation, sign-off

## 1. Data integrity checks

Add `scripts/verify.mjs`, run by `npm run verify`. It must fail non-zero on any of:

- `mammals.json` node counts outside the ranges asserted in stage 2.
- A genus whose `value` ≠ `species.length`.
- A `credits.json` entry pointing at a file that does not exist on disk, or missing
  `license` / `sourceUrl` / `creator` (creator may be "Unknown" only for PD-old works).
- An image file present on disk with no `credits.json` entry (orphan = licence risk).
- Any `licenseUrl` containing `nc` or `nd`.
- Any taxon name appearing twice at the same rank under different parents without the
  `(unplaced)` marker.

## 2. Functional tests

Plain Node test runner (`node --test`) for the pure logic — tree building, search index,
hash serialisation, colour derivation, and the Latin/English/Persian display-name
helper. No DOM framework needed for these.

For the chart, one Playwright spec (ask before installing) covering:

1. Root renders 27 order arcs.
2. Click Carnivora → breadcrumb depth 2, centre disc shows Carnivora artwork.
3. Click centre → back to root.
4. Search "lion" → panel shows *Panthera leo*.
5. Deep link `#/Rodentia/Muridae` loads focused on Muridae.
6. `prefers-reduced-motion` emulation → no transitions, state still correct.

## 3. Performance budget

Measure and record in `NOTES.md`:

| Metric | Budget |
|---|---|
| `mammals.json` transferred | < 250 KB gzipped |
| Total page weight, first view (no panel images) | < 600 KB |
| Time to interactive, local server | < 1.5 s |
| Zoom transition | ≥ 55 fps sustained |
| Images lazy-loaded | all except the root centre disc |

If a budget is missed, report the real number and the cause. Do not adjust the budget
to match the result.

## 4. Documentation

`mammals/README.md` must contain:

- What this is, with a screenshot.
- **Data provenance:** MDD version, DOI, retrieval date, and the full citation
  (ASM Mammal Diversity Database, with its Zenodo DOI).
- **Image provenance:** a statement that all artwork was gathered from free-licence
  sources and none was AI-generated, a pointer to `CREDITS.md`, and the per-source
  licence summary.
- **Attribution for the visualisation technique:** Mike Bostock's Zoomable Sunburst,
  Observable, ISC licence, with link.
- How to rebuild: `npm run data`, `npm run images`, `npm run names`, `npm run verify`, `npm run serve`.
- Known gaps: the list from `missing-images.txt`, and any taxa where the MDD and common
  usage disagree.
- Licence for the repo's own code, and the note that image licences are *separate and
  per-file*.

## 5. Final sweep

- Remove dead code, `console.log`s, and any unused dependency.
- Confirm the page works served from a subpath (`/mammals/`) — no absolute `/` asset paths.
- Confirm it works fully offline after first load.
- Confirm no runtime request leaves the origin (check the Network panel; screenshot it).

## Sign-off report

Post a single summary containing: the counts table, image coverage percentages,
illustration-vs-photo ratio, perf numbers, test results, Lighthouse scores, and an
explicit list of anything that did not meet its target with the reason why.
