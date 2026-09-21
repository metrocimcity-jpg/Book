// Hand-tuned 27-order palette: muted earth / naturalist-plate tones.
// Quantized rainbow was used only as a layout check, then replaced.

export const ORDER_PALETTE = [
  "#8b5a2b",
  "#6d7a45",
  "#4f6270",
  "#a3543a",
  "#6f4b63",
  "#8a7340",
  "#3f6b5c",
  "#9c6b4a",
  "#5a4e72",
  "#7a5e3a",
  "#4d6e82",
  "#8c4d55",
  "#66724a",
  "#b0793c",
  "#4a5a48",
  "#7c5c72",
  "#5e6d55",
  "#9a5b3c",
  "#3d5c6e",
  "#846848",
  "#6a4f3d",
  "#55706a",
  "#8f6a58",
  "#4e5470",
  "#7b6b3b",
  "#5c4a42",
  "#6e5a4e"
];

export function orderColorMap(orderNames, palette = ORDER_PALETTE) {
  const map = new Map();
  orderNames.forEach((name, i) => {
    map.set(name, palette[i % palette.length]);
  });
  return map;
}

export function colorForNode(d, colors, background = "#f3eee2") {
  let node = d;
  while (node.depth > 1) node = node.parent;
  const base = colors.get(node.data?.name) || ORDER_PALETTE[0];
  if (d.depth <= 1) return base;
  const d3 = globalThis.d3;
  const from = d3.color(base);
  const to = d3.color(background);
  if (!from || !to) return base;
  return d3.interpolateLab(from, to)(Math.min(0.55, 0.22 * (d.depth - 1)));
}
