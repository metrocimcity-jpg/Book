import { fetchJson, mapPool, sleep } from "./http.mjs";

export async function gbifJson(path) {
  const url = path.startsWith("http") ? path : `https://api.gbif.org/v1${path}`;
  return fetchJson(url);
}

export async function gbifChildren(key, { rank } = {}) {
  const results = [];
  let offset = 0;
  let end = false;
  while (!end) {
    const rankQ = rank ? `&rank=${rank}` : "";
    const json = await gbifJson(`/species/${key}/children?limit=1000&offset=${offset}${rankQ}`);
    results.push(...(json.results || []));
    offset += 1000;
    end = json.endOfRecords || !(json.results || []).length || offset > 20000;
  }
  return results;
}

export async function gbifSpeciesCount(higherKey) {
  const json = await gbifJson(
    `/species/search?highertaxonKey=${higherKey}&rank=SPECIES&status=ACCEPTED&limit=0`
  );
  return json.count || 0;
}

export async function gbifMatchFamily(name, kingdom) {
  const q = new URLSearchParams({ name, rank: "FAMILY" });
  if (kingdom) q.set("kingdom", kingdom);
  const json = await gbifJson(`/species/match?${q}`);
  if (json.matchType === "NONE" || !json.family) return null;
  return {
    family: json.family,
    order: json.order || "",
    className: json.class || "",
    key: json.usageKey
  };
}

export function rowFromGbifSpecies(r) {
  const vernacular = (r.vernacularNames || []).find((v) => /^en/i.test(v.language || ""))
    || r.vernacularNames?.[0];
  return {
    order: r.order || "",
    family: r.family || "",
    genus: r.genus || "",
    epithet: r.specificEpithet || "",
    sciName: r.canonicalName || r.scientificName || "",
    common: vernacular?.vernacularName || "",
    extinct: Boolean(r.extinct),
    domestic: false,
    iucn: "",
    year: null
  };
}

export async function gbifSpeciesPages(higherKey, { maxOffset = 100000, onPage } = {}) {
  const rows = [];
  let offset = 0;
  let end = false;
  while (!end) {
    const json = await gbifJson(
      `/species/search?highertaxonKey=${higherKey}&rank=SPECIES&status=ACCEPTED&limit=1000&offset=${offset}`
    );
    const batch = (json.results || []).map(rowFromGbifSpecies);
    rows.push(...batch);
    if (onPage) onPage({ offset, got: batch.length, total: json.count });
    offset += 1000;
    end = json.endOfRecords || !(json.results || []).length || offset >= maxOffset;
    if (!end) await sleep(80);
  }
  return rows;
}

export async function gbifFamilyLeaves(classKey) {
  const orders = (await gbifChildren(classKey)).filter(
    (n) => n.rank === "ORDER" && n.taxonomicStatus === "ACCEPTED"
  );
  const rows = [];
  for (const order of orders) {
    const families = (await gbifChildren(order.key)).filter(
      (n) => n.rank === "FAMILY" && n.taxonomicStatus === "ACCEPTED"
    );
    const counts = await mapPool(families, 4, async (family) => {
      const value = await gbifSpeciesCount(family.key);
      await sleep(40);
      return { order: order.canonicalName || order.scientificName, family: family.canonicalName || family.scientificName, value };
    });
    rows.push(...counts);
    console.log(`  ${order.canonicalName}: ${families.length} families`);
  }
  return rows;
}
