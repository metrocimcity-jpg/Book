# Zoomable sunburst (`shared/src/sunburst.js`)

Reimplementation of Mike Bostock’s Zoomable Sunburst
(<https://observablehq.com/@d3/zoomable-sunburst>, ISC). Credit it in
`shared/NOTES.md` and a header comment. Do not invent a different zoom model.

```js
export function createSunburst(container, data, options)
// -> { focus, on, destroy, setRoot, setNames }
```

D3 is `shared/vendor/d3.v7.min.js`, loaded as a global before the module.

## Load-bearing mechanics

```js
const radius = width / 6;                       // 3 visible rings

const hierarchy = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

const root = d3.partition()
    .size([2 * Math.PI, hierarchy.height + 1])(hierarchy);

root.each(d => d.current = d);

const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

const arcVisible   = d => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
const labelVisible = d => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
```

`clicked` sets `parent.datum(p.parent || root)` and:

```js
root.each(d => d.target = {
  x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
  x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
  y0: Math.max(0, d.y0 - p.depth),
  y1: Math.max(0, d.y1 - p.depth)
});
```

Tween with `d3.interpolate(d.current, d.target)`. Toggle `fill-opacity` /
`pointer-events` (and **`stroke-opacity`**) from `arcVisible` / `labelVisible`.
Centre disc (radius `radius`) zooms out to `parent`.

## Adaptations

**Colour.** `shared/src/palette.js`: 27 muted earth tones; extra orders wrap with
modulo. Descendants interpolate toward the background in Lab. Ancestor:
`while (d.depth > 1) d = d.parent`.

**Size.** Default `value` = species count (or family `value` for insects). Option
`sizing: "species" | "equal"`.

**Centre.** Artwork via `<image>` + `clipPath`, name, rank, count. Clickable
zoom-out. Credits from the pack; placeholder if missing.

**Labels.** Current name-language on visible arcs. Hide only on needle slices
(Bostock area ≤ 0.03 or mid-arc ≲ 32px). Do **not** require the full string to
fit. Hidden labels zero `stroke-opacity`. Mouse clicks `blur()` the target;
keyboard `:focus-visible` keeps a circular stroke.

**Names.** `setNames(lang, vernacular)` is display-only. Identity keys stay
scientific.

The module emits `focus` / `hover` / `select` through `on()`. It must not import
panel, search, catalog, or URL helpers.

## Definition of done

- Hub renders the focused group; zoom in/out interpolates; fast clicks leave no
  orphaned arcs. Tab → Enter zooms in, Escape zooms out.
- Console clean. Honour `--motion-duration` / `prefers-reduced-motion`.
