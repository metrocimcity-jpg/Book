export function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en").format(n);
}

export function formatPercent(part, whole) {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export { displayName } from "./names.js";

export function italicRank(rank) {
  return rank === "genus" || rank === "species";
}

export function titleRank(rank) {
  if (!rank) return "";
  return rank.charAt(0).toUpperCase() + rank.slice(1);
}

export function speciesCount(node) {
  if (!node) return 0;
  if (Array.isArray(node.species)) return node.species.length;
  if (typeof node.value === "number" && !node.children) return node.value;
  let total = 0;
  for (const child of node.children || []) total += speciesCount(child);
  return total;
}

export function iucnClass(code) {
  const known = new Set(["LC", "NT", "VU", "EN", "CR", "EW", "EX", "DD"]);
  const c = String(code || "DD").toUpperCase();
  return known.has(c) ? c : "DD";
}
