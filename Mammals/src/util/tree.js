export function walk(node, fn, parent = null, depth = 0) {
  fn(node, parent, depth);
  for (const child of node.children || []) walk(child, fn, node, depth + 1);
}

export function cloneTree(node) {
  const copy = { ...node };
  if (node.species) copy.species = node.species.map((s) => ({ ...s }));
  if (node.children) copy.children = node.children.map(cloneTree);
  return copy;
}

export function findChild(node, name) {
  return (node.children || []).find((c) => c.name === name) ?? null;
}

export function findPath(root, names) {
  const path = [root];
  let cur = root;
  for (const name of names) {
    const next = findChild(cur, name);
    if (!next) return null;
    path.push(next);
    cur = next;
  }
  return path;
}

export function pathNames(path) {
  return path.filter((n) => n.rank && n.rank !== "class").map((n) => n.name);
}

export function countsUnder(node) {
  let families = 0;
  let genera = 0;
  let species = 0;
  if (node.rank === "family") families += 1;
  if (node.rank === "genus") {
    genera += 1;
    species += node.species?.length ?? node.value ?? 0;
  }
  if (node.rank === "species") species += 1;
  for (const child of node.children || []) {
    const inner = countsUnder(child);
    families += inner.families;
    genera += inner.genera;
    species += inner.species;
  }
  return { families, genera, species };
}

export function isExtinctNode(node) {
  if (node.extinct) return true;
  if (node.rank === "genus" && node.species?.length) return node.species.every((s) => s.extinct);
  if (node.children?.length) return node.children.every(isExtinctNode);
  return false;
}

export function filterExtinct(node, includeExtinct) {
  if (includeExtinct) return cloneTree(node);
  const copy = { ...node };
  if (node.species) {
    copy.species = node.species.filter((s) => !s.extinct);
    if (typeof node.value === "number") copy.value = copy.species.length;
  }
  if (node.children) {
    copy.children = node.children
      .map((c) => filterExtinct(c, false))
      .filter((c) => {
        if (c.rank === "genus") return (c.species?.length ?? c.value ?? 0) > 0;
        return (c.children?.length ?? 0) > 0;
      });
  }
  return copy;
}

export function expandSpeciesUnder(node, focusNames = []) {
  const focus = new Set(focusNames);
  const expand = (n, lineage) => {
    const copy = { ...n };
    const nextLine = n.rank && n.rank !== "class" ? [...lineage, n.name] : lineage;
    const inFocus = focus.size === 0 || nextLine.some((name) => focus.has(name)) || focus.has(n.name);
    if (n.species && inFocus && n.rank === "genus") {
      copy.children = n.species.map((s) => ({
        name: s.name,
        rank: "species",
        common: s.common,
        iucn: s.iucn,
        year: s.year,
        extinct: s.extinct,
        domestic: s.domestic,
        value: 1
      }));
      delete copy.value;
    } else if (n.children) {
      copy.children = n.children.map((c) => expand(c, nextLine));
    }
    return copy;
  };
  return expand(node, []);
}

export function flattenIndex(root) {
  const items = [];
  const walkIndex = (node, lineage) => {
    const path = node.rank && node.rank !== "class" ? [...lineage, node.name] : lineage;
    items.push({
      name: node.name,
      common: node.common || "",
      rank: node.rank,
      path,
      node,
      key: `${node.name} ${node.common || ""}`.toLowerCase()
    });
    for (const species of node.species || []) {
      items.push({
        name: species.name,
        common: species.common || "",
        rank: "species",
        path,
        node,
        species,
        key: `${species.name} ${species.common || ""}`.toLowerCase()
      });
    }
    for (const child of node.children || []) walkIndex(child, path);
  };
  walkIndex(root, []);
  return items;
}

export function searchIndex(items, query, perRank = 8) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const groups = new Map();
  for (const item of items) {
    if (!(item.key.startsWith(q) || item.key.includes(q))) continue;
    const list = groups.get(item.rank) || [];
    if (list.length >= perRank) continue;
    list.push(item);
    groups.set(item.rank, list);
  }
  const order = ["order", "family", "genus", "species"];
  return order.flatMap((rank) => (groups.get(rank) || []).map((item) => item));
}
