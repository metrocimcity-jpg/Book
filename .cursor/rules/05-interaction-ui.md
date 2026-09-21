# Interaction shell (`shared/src`)

Chart module stays unaware of UI. Wire through `sunburst.on()`. Group metadata
lives in `shared/src/catalog.js`; `?group=` selects the pack.

## Group switcher

`#group-nav` links via `groupHref(id)`. Changing group reloads pack JSON, tokens,
credits. Do not keep a second `index.html` per folder.

## Breadcrumbs

`Mammalia › Carnivora › Felidae › Panthera` (or the group root). Buttons call
`sunburst.focus(node)`. Current crumb is `aria-current="location"`. Narrow
screens: collapse the middle with an ellipsis.

## Detail panel

`select` and, when idle, `hover`:

- Artwork from pack `credits.json` (`srcset` `@2x`), caption with creator,
  licence link, `resolvedFrom`, photo label.
- Name (italic serif genus/species), rank, vernacular for the current language.
- Counts via `countsUnder` (must work for insect family leaves with `value`).
- Genus focus: `species[]` list with IUCN chips; paginate if > 60.
- External links marked as leaving the page.
- Empty state: citation from pack `meta.json`.

## Search

Index scientific + checklist `common` + vernacular `en`/`fa`. Grouped by rank,
max 8 per group. Selecting a species focuses the nearest rendered ancestor
(genus, or family for insects) and highlights the species in the panel.
Keyboard: `/`, arrows, Enter, Esc. Full combobox ARIA.

## Controls

- **Names:** Latin / English / فارسی. Hash `?names=en` or `?names=fa`. Persian:
  `lang=fa`, `names-fa` class, document stays LTR. Missing → Latin; never invent.
- **Sizing:** species count / equal weight.
- **Show species ring:** only when focus is family or deeper; expand the focused
  subtree (`expandSpeciesUnder`). Global species ring is too heavy.
- **Include recently extinct:** client-side filter. Do not drop insect family
  leaves that have `value` and no children.
- **Reset view.**

## URL

- Group: `?group=birds` on the query string.
- Taxon: `#/Carnivora/Felidae/Panthera` plus `?species=` and `?names=` on the hash.
- `pushState` on user focus; `popstate` restores without animation.

## Accessibility

Keyboard paths, `--focus` ring, live region for focus changes, `<details>` text
tree of the taxonomy. Rank always in text, not colour alone. Test 320px, 200%
zoom, forced-colors.

## Definition of done

- Switch Mammals → Birds (and another harvested group) without a second shell.
- Search a known species; deep link restores view; keyboard-only path works.
- English uses `common` then Wikidata; Persian uses Wikidata only.
