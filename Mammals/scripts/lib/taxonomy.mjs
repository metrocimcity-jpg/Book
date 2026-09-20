import { parseCsv, indexHeaders, pick } from "./csv.mjs";

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

export function isTruthyFlag(value) {
  const v = String(value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function rowsFromCsv(text) {
  const table = parseCsv(text);
  if (!table.length) throw new Error("CSV is empty");
  const headers = indexHeaders(table[0]);
  const required = ["order", "family", "genus"];
  const missing = required.filter((k) => !headers.has(k));
  if (missing.length) {
    throw new Error(`Missing required columns: ${missing.join(", ")}. Headers: ${table[0].join(", ")}`);
  }
  return table.slice(1).map((row) => ({
    order: titleCaseRank(pick(headers, row, ["order"])),
    family: titleCaseRank(pick(headers, row, ["family"])),
    genus: titleCaseRank(pick(headers, row, ["genus"])),
    epithet: pick(headers, row, ["specificepithet", "species"]),
    sciName: pick(headers, row, ["sciname", "scientificname"]),
    common: pick(headers, row, ["maincommonname", "commonname", "common"]),
    extinct: isTruthyFlag(pick(headers, row, ["extinct"])),
    domestic: isTruthyFlag(pick(headers, row, ["domestic"])),
    iucn: pick(headers, row, ["iucnstatus", "iucn"]) || "",
    year: Number.parseInt(pick(headers, row, ["authorityyear", "authorityspeciesyear", "year"]), 10) || null,
    continent: pick(headers, row, ["continentdistribution", "continent"])
  }));
}

function sortKids(nodes) {
  nodes.sort((a, b) => a.name.localeCompare(b.name));
  return nodes;
}

export function buildTrees(rows, { includeExtinct = false } = {}) {
  const orders = new Map();

  for (const row of rows) {
    if (row.extinct && !includeExtinct) continue;
    const orderName = row.order || UNPLACED;
    const familyName = row.family || UNPLACED;
    const genusName = row.genus || UNPLACED;
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
    name: "Mammalia",
    rank: "class",
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

export function countTree(root) {
  const counts = { orders: 0, families: 0, genera: 0, species: 0 };
  const walk = (node) => {
    if (node.rank === "order") counts.orders += 1;
    if (node.rank === "family") counts.families += 1;
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

export const COUNT_RANGES = {
  orders: [20, 30],
  families: [150, 190],
  genera: [1200, 1500],
  species: [6000, 7500]
};

export function assertCounts(counts) {
  const errors = [];
  for (const [key, [min, max]] of Object.entries(COUNT_RANGES)) {
    const n = counts[key];
    if (n < min || n > max) errors.push(`${key}=${n} outside ${min}–${max}`);
  }
  return errors;
}
