# Stage 4 — The zoomable sunburst

Implement `mammals/src/sunburst.js`, a reimplementation of Mike Bostock's
**Zoomable Sunburst** (<https://observablehq.com/@d3/zoomable-sunburst>, ISC) as a plain
ES module. Credit it in `NOTES.md` and in a header comment with the ISC notice.

Export a single factory:

```js
export function createSunburst(container, data, options) // -> { focus, on, destroy, setRoot }
```

## The reference algorithm — keep these mechanics

Do not improvise a different zoom model; this one is load-bearing.

```js
const radius = width / 6;                       // 3 visible rings, ring width = radius

const hierarchy = d3.hierarchy(data)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);

const root = d3.partition()
    .size([2 * Math.PI, hierarchy.height + 1])(hierarchy);

root.each(d => d.current = d);                  // `current` is the animated state

const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));
```

Visibility and labels:

```js
const arcVisible   = d => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
const labelVisible = d => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;

function labelTransform(d) {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
  const y = (d.y0 + d.y1) / 2 * radius;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}
```

`clicked(event, p)` sets `parent.datum(p.parent || root)`, computes each node's target
`current` relative to `p`:

```js
root.each(d => d.target = {
  x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
  x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
  y0: Math.max(0, d.y0 - p.depth),
  y1: Math.max(0, d.y1 - p.depth)
});
```

…then transitions arcs with `attrTween("d", d => () => arc(d.current))` driven by
`d3.interpolate(d.current, d.target)`, and fades labels/arcs with
`fill-opacity` / `pointer-events` toggled on `arcVisible` / `labelVisible`.
An invisible centre `circle` of radius `radius` handles zoom-out to `parent`.

## Adaptations for this dataset

**Colour.** Bostock's rainbow quantile is wrong for 27 orders — adjacent orders become
indistinguishable mush. Instead:

- Assign each **order** a colour from a hand-tuned 27-entry palette (muted earth /
  naturalist-plate tones: ochres, moss, slate, rust, plum). Generate it with
  `d3.quantize(d3.interpolateRainbow, n)` only as a placeholder, then replace with the
  curated array in `src/palette.js`.
- Family and genus arcs inherit their order's hue, lightened progressively by depth:
  `d3.color(base).brighter(0.25 * (depth - 1))` — or better, interpolate toward the
  background token in Lab space so ring 3 still passes 3:1 contrast against its neighbours.
- Ancestor lookup: `while (d.depth > 1) d = d.parent;`.

**Size encoding.** `value` = species count, so arc angle = share of mammal diversity.
This makes Rodentia and Chiroptera dominate — that is the correct and interesting result.
Add an option `sizing: "species" | "equal"`; `"equal"` sums 1 per leaf's *node* rather
than species count, for readers who want to browse structure. Default `"species"`.

**Centre disc.** Replace the invisible circle with a visible centre that shows, for the
current focus: the taxon's artwork (via `<image>` inside a `clipPath` circle of radius
`radius * 0.8`), the taxon name, rank, and species count. It stays clickable for zoom-out
and shows a `↰` affordance when `focus !== root`. Use `credits.json` to resolve the file;
fall back to `placeholder.svg`.

**Labels.** Show the current name-language on every visible arc. Hide a name only
on needle-thin slices (Bostock `(y1-y0)*(x1-x0) ≤ 0.03`, or mid-arc length under
~32px). Do **not** require the full name to fit — that hides almost every order
at the root. Hidden labels must also set `stroke-opacity` to 0 so dark-mode halo
strokes do not leave black blobs. Use `text-rendering: optimizeLegibility` and
`paint-order: stroke` with a 2px background-coloured stroke so names stay
legible over saturated arcs. Mouse clicks `blur()` the target so the UA
rectangular focus outline does not flash; keyboard `:focus-visible` keeps a
circular stroke.

## Rendering details

- `svg` with `viewBox="${-width / 2} ${-height / 2} ${width} ${width}"`,
  `style="max-width:100%;height:auto;font:11px var(--font-sans)"`,
  `preserveAspectRatio="xMidYMid meet"`. Resize via ResizeObserver → recompute `radius`
  and re-render (keep focus).
- Each arc gets `<title>` (`Order Carnivora · 313 species`) for a baseline tooltip, plus
  `role="img"`, `tabindex="0"` on focusable arcs, and `aria-label`.
- Transition duration from `--motion-duration`; if `prefers-reduced-motion: reduce`,
  jump with duration 0.
- Emit events through `on(name, fn)`: `focus` (node), `hover` (node|null),
  `select` (node). Stage 5 binds to these. The chart module itself must not know about
  the panel, search, or URL.

## Definition of done

- The chart renders Mammalia with 27 order arcs; clicking Carnivora zooms in with the
  ring interpolation, clicking the centre zooms back out, and nothing flickers or leaves
  orphaned arcs after fast repeated clicks.
- Keyboard: `Tab` reaches arcs, `Enter` zooms, `Escape` zooms out to parent.
- Console is clean. First render < 200 ms after JSON load on a mid-range laptop;
  transitions hold 60 fps (paste a Performance-panel frame summary).
- Paste a screenshot of the root view and of the zoomed `Chiroptera` view.
