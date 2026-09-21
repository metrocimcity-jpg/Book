const UNPLACED = "(unplaced)";

export function titleCaseRank(value) {
  if (!value) return "";
  const raw = String(value).trim().replace(/_/g, " ");
  if (raw.toLowerCase().includes("incertae") || raw === "?" || raw.toLowerCase() === "na") {
    return UNPLACED;
  }
  return raw
    .split(/\s+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

export function speciesName(sciName, genus, epithet) {
  if (sciName) return sciName.replace(/_/g, " ").trim();
  return `${genus} ${epithet}`.trim();
}

function sortKids(nodes) {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  return nodes;
}

export function buildTrees(rows, { includeExtinct = false, className = "Taxa", rootRank = "class" } = {}) {
  const orders = new Map();

  for (const row of rows) {
    if (row.extinct && !includeExtinct) continue;
    const orderName = titleCaseRank(row.order) || UNPLACED;
    const familyName = titleCaseRank(row.family) || UNPLACED;
    const genusName = titleCaseRank(row.genus) || UNPLACED;
    const name = speciesName(row.sciName, genusName, row.epithet);
    if (!name) continue;

    if (!orders.has(orderName)) {
      orders.set(orderName, { name: orderName, rank: "order", children: new Map() });
    }
    const order = orders.get(orderName);
    if (!order.children.has(familyName)) {
      order.children.set(familyName, { name: familyName, rank: "family", children: new Map() });
    }
    const family = order.children.get(familyName);
    if (!family.children.has(genusName)) {
      family.children.set(genusName, { name: genusName, rank: "genus", species: [] });
    }
    const genus = family.children.get(genusName);
    genus.species.push({
      name,
      common: row.common || undefined,
      iucn: row.iucn || undefined,
      year: row.year || undefined,
      extinct: row.extinct || undefined,
      domestic: row.domestic || undefined
    });
  }

  const toObject = (orderMap) => ({
    name: className,
    rank: rootRank,
    children: sortKids(
      [...orderMap.values()].map((order) => ({
        name: order.name,
        rank: "order",
        children: sortKids(
          [...order.children.values()].map((family) => ({
            name: family.name,
            rank: "family",
            children: sortKids(
              [...family.children.values()].map((genus) => {
                genus.species.sort((a, b) => a.name.localeCompare(b.name));
                return {
                  name: genus.name,
                  rank: "genus",
                  value: genus.species.length,
                  species: genus.species
                };
              })
            )
          }))
        )
      }))
    )
  });

  const genusTree = toObject(orders);
  const speciesTree = JSON.parse(JSON.stringify(genusTree));
  const expand = (node) => {
    if (node.rank === "genus") {
      node.children = (node.species || []).map((s) => ({
        name: s.name,
        rank: "species",
        common: s.common,
        iucn: s.iucn,
        year: s.year,
        extinct: s.extinct,
        domestic: s.domestic,
        value: 1
      }));
      delete node.value;
      delete node.species;
      return;
    }
    for (const child of node.children || []) expand(child);
  };
  expand(speciesTree);

  return { genusTree, speciesTree };
}

/** Order → family leaves. Family.value is a source species count. No invented genera. */
export function buildFamilyCountTree(rows, { className = "Taxa", rootRank = "class" } = {}) {
  const orders = new Map();
  for (const row of rows) {
    const orderName = titleCaseRank(row.order) || UNPLACED;
    const familyName = titleCaseRank(row.family) || UNPLACED;
    const value = Number(row.value) || 0;
    if (!value) continue;
    if (!orders.has(orderName)) {
      orders.set(orderName, { name: orderName, rank: "order", children: new Map() });
    }
    const order = orders.get(orderName);
    const prev = order.children.get(familyName);
    order.children.set(familyName, {
      name: familyName,
      rank: "family",
      value: (prev?.value || 0) + value
    });
  }
  return {
    name: className,
    rank: rootRank,
    children: sortKids(
      [...orders.values()].map((order) => ({
        name: order.name,
        rank: "order",
        children: sortKids([...order.children.values()])
      }))
    )
  };
}

export function countTree(root) {
  const counts = { orders: 0, families: 0, genera: 0, species: 0 };
  const walk = (node) => {
    if (node.rank === "order") counts.orders += 1;
    if (node.rank === "family") {
      counts.families += 1;
      if (!node.children?.length) counts.species += node.value ?? 0;
    }
    if (node.rank === "genus") {
      counts.genera += 1;
      counts.species += node.species?.length ?? node.children?.length ?? node.value ?? 0;
    }
    if (node.rank === "species") counts.species += 1;
    for (const child of node.children || []) walk(child);
  };
  walk(root);
  return counts;
}

export function findPath(root, names) {
  const path = [root];
  let cur = root;
  for (const name of names) {
    const next = (cur.children || []).find((c) => c.name === name);
    if (!next) return null;
    path.push(next);
    cur = next;
  }
  return path;
}

export function stableStringify(value) {
  const seen = new WeakSet();
  const sorter = (key, val) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      if (seen.has(val)) return val;
      seen.add(val);
      const ordered = {};
      for (const k of Object.keys(val).sort()) ordered[k] = val[k];
      return ordered;
    }
    return val;
  };
  return JSON.stringify(value, sorter);
}
