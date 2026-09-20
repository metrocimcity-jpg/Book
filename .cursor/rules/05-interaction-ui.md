# Stage 5 — Interaction shell: breadcrumbs, search, detail panel, deep links

Build the surrounding UI in `src/main.js`, `src/panel.js`, `src/search.js`. The chart
module from stage 4 stays unaware of all of it — wire everything through its `on()` events.

## 1. Breadcrumb bar

Above the chart: `Mammalia › Carnivora › Felidae › Panthera`. Each crumb is a button that
calls `sunburst.focus(node)`. Current crumb is `aria-current="location"`, not a link.
On narrow screens, collapse the middle with an ellipsis menu.

## 2. Detail panel

Driven by `select` (click) and, when nothing is selected, by `hover`. Contents:

- **Artwork**, `credits.json` entry, rendered at up to 640px with `srcset` for `@2x`.
  Caption underneath in small type: title, creator, licence with link, and the
  "representing" note when `resolvedFrom` is set. Label photographs as such.
- Taxon name (italic serif for genus/species, roman for higher ranks), rank, common name.
- Counts: families / genera / species beneath this node, plus its share of all mammals
  as a percentage with one decimal.
- **When the focus is a genus:** the species list from `species[]` — scientific name,
  common name, IUCN code as a small coloured chip (`LC` `NT` `VU` `EN` `CR` `EW` `EX` `DD`),
  authority year. Virtualise or paginate if > 60 entries (Myotis has ~140).
- A "View on Wikipedia / GBIF / MDD" row of external links built from the name — clearly
  marked as leaving the page.
- Empty state before anything is selected: a short orienting sentence and the
  citation from `data/meta.json`.

## 3. Search

Type-ahead over every node name **and** every species name (~8,400 strings).

- Build the index once at load from `mammals.json` + species arrays; a flat array with a
  lowercased key and a prefix/substring match is plenty — no fuzzy library unless it
  proves necessary, and ask before adding one.
- Results grouped by rank, max 8 per group, showing the lineage as dimmed context.
- Selecting a result focuses the nearest *rendered* ancestor (genus for a species) and
  opens the panel with that species highlighted in the list.
- Keyboard: `/` focuses the input, `↑`/`↓` move, `Enter` selects, `Esc` closes.
  Full combobox ARIA (`role="combobox"`, `aria-expanded`, `aria-activedescendant`,
  `role="listbox"`/`option`).

## 4. Controls

A small control cluster:

- **Sizing:** *By species count* / *Equal weight* (chart `sizing` option).
- **Show species ring:** loads `data/mammals.species.json` and rebuilds with a fourth
  taxonomic ring. Warn in a tooltip that this is heavier; measure it and if interaction
  drops below ~30 fps, only enable the toggle once the focus is at or below family level
  (build the species tree lazily from the focused subtree instead of globally). Explain
  in `NOTES.md` which approach you ended up with and why.
- **Include recently extinct** (re-runs nothing; the flag is already in the data —
  filter client-side and render those arcs with a hatched pattern).
- **Reset view.**

## 5. Deep links and history

- Serialise focus as a hash path: `#/Carnivora/Felidae/Panthera`, plus
  `?species=Panthera+leo` when a species is selected.
- `pushState` on user-initiated focus changes, `popstate` restores them without animation.
- Sharing a URL must reproduce the exact view, including panel contents.

## 6. Accessibility and polish

- Every interactive element reachable by keyboard with a visible focus ring built from
  `--focus` token.
- A visually-hidden live region announcing focus changes:
  "Focused Felidae, family, 41 species."
- Provide a text alternative to the whole chart: a `<details>` element containing a
  nested `<ul>` of the taxonomy (orders → families, genera lazily) so screen-reader and
  no-JS users get the data.
- Colour must never be the only signal — rank is always stated in text.
- Test at 320px width, at 200% browser zoom, and in forced-colors mode.

## Definition of done

- Search for "Panthera" → selecting it zooms to `Carnivora › Felidae › Panthera` and the
  panel lists 5 species with IUCN chips.
- Reloading a copied deep link restores the identical view.
- Keyboard-only walkthrough from page load to a selected species works; paste the steps.
- Lighthouse accessibility ≥ 95; paste the score and any remaining flags.
