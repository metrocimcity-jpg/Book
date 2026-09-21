import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT, rateLimit, sleep } from "./lib/http.mjs";
import { CATEGORIES, categoryById } from "../shared/src/catalog.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const rankArg = process.argv.find((a) => a.startsWith("--rank="));
const onlyRanks = rankArg ? new Set(rankArg.split("=")[1].split(",")) : null;
const groupArg = process.argv.find((a) => a.startsWith("--group="))?.split("=")[1] || "all";
const force = process.argv.includes("--force");
const skipNotes = process.argv.includes("--no-notes");
const flushOnly = process.argv.includes("--flush-only");
const BATCH = 20;
const CACHE_PATH = join(repo, "data", "raw", "wikidata-vernacular-cache.json");

const RANK_WEIGHT = { class: 0, group: 1, order: 2, family: 3, genus: 4, species: 5 };

function walk(node, fn) {
  fn(node);
  for (const child of node.children || []) walk(child, fn);
  for (const species of node.species || []) fn({ ...species, rank: "species" });
}

function collectNames(tree) {
  const seen = new Map();
  walk(tree, (node) => {
    if (!node?.name || node.name === "(unplaced)") return;
    if (onlyRanks && !onlyRanks.has(node.rank || "")) return;
    if (!seen.has(node.name)) seen.set(node.name, node.rank || "");
  });
  return [...seen.entries()]
    .map(([name, rank]) => ({ name, rank }))
    .sort((a, b) => (RANK_WEIGHT[a.rank] ?? 9) - (RANK_WEIGHT[b.rank] ?? 9) || a.name.localeCompare(b.name));
}

function pickBest(scientific, values) {
  const sci = scientific.trim().toLowerCase();
  const unique = [...new Set(values.map((v) => String(v || "").trim()).filter(Boolean))];
  const distinct = unique.filter((v) => v.toLowerCase() !== sci);
  if (!distinct.length) return undefined;
  distinct.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return distinct.find((v) => v.length <= 40) || distinct[0];
}

function titleCaseEn(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mergeEntry(prev, next) {
  const out = { ...(prev || {}) };
  if (next?.en) out.en = next.en;
  if (next?.fa) out.fa = next.fa;
  return out;
}

function isHit(entry) {
  return Boolean(entry && (entry.en || entry.fa));
}

function sparqlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

async function sparql(query) {
  await rateLimit("query.wikidata.org", 2000);
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch("https://query.wikidata.org/sparql", {
        method: "POST",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/sparql-results+json",
          "Content-Type": "application/sparql-query"
        },
        body: query,
        signal: AbortSignal.timeout(30000)
      });
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        const raw = res.headers.get("retry-after");
        const retryAfter = raw ? Number(raw) : NaN;
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(60000, retryAfter * 1000)
          : Math.min(60000, Math.max(2000, 2 ** attempt * 2000));
        console.warn(`retry ${res.status} SPARQL in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw new Error(`${res.status} SPARQL`);
    } catch (err) {
      if (attempt < 6) {
        const backoff = Math.min(60000, Math.max(2000, 2 ** attempt * 2000));
        console.warn(`retry ${err.cause?.code || err.message} SPARQL in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

async function lookupBatchSparql(taxa) {
  const names = taxa.map((t) => t.name);
  const values = names.map(sparqlString).join(" ");
  const query = `SELECT ?taxonName ?en ?fa WHERE {
    VALUES ?taxonName { ${values} }
    ?item wdt:P225 ?taxonName.
    OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en)="en") }
    OPTIONAL { ?item rdfs:label ?fa FILTER(LANG(?fa)="fa") }
  }`;
  const json = await sparql(query);
  const grouped = new Map();
  for (const row of json.results?.bindings || []) {
    const name = row.taxonName?.value;
    if (!name) continue;
    const cur = grouped.get(name) || { en: [], fa: [] };
    if (row.en?.value) cur.en.push(row.en.value);
    if (row.fa?.value) cur.fa.push(row.fa.value);
    grouped.set(name, cur);
  }
  const out = {};
  for (const name of names) {
    const hits = grouped.get(name);
    if (!hits) continue;
    const en = titleCaseEn(pickBest(name, hits.en));
    const fa = pickBest(name, hits.fa);
    if (en || fa) out[name] = { ...(en ? { en } : {}), ...(fa ? { fa } : {}) };
  }
  return out;
}

function normTitle(value) {
  return String(value || "").replace(/_/g, " ").trim().toLowerCase();
}

function p225Values(entity) {
  return (entity.claims?.P225 || [])
    .map((c) => c.mainsnak?.datavalue?.value)
    .filter(Boolean)
    .map((v) => String(v).replace(/_/g, " ").trim());
}

function namesFromEntity(entity) {
  const en = [];
  const fa = [];
  if (entity.labels?.en?.value) en.push(entity.labels.en.value);
  if (entity.labels?.fa?.value) fa.push(entity.labels.fa.value);
  for (const claim of entity.claims?.P1843 || []) {
    const v = claim.mainsnak?.datavalue?.value;
    if (!v || typeof v !== "object") continue;
    if (v.language === "en" && v.text) en.unshift(v.text);
    if (v.language === "fa" && v.text) fa.unshift(v.text);
  }
  return { en, fa };
}

async function wikiGet(params) {
  await rateLimit("www.wikidata.org", 5000);
  const search = new URLSearchParams({ format: "json", maxlag: "5", ...params });
  const url = `https://www.wikidata.org/w/api.php?${search}`;
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(30000)
      });
      if ((res.status === 429 || res.status >= 500) && attempt < 6) {
        const raw = res.headers.get("retry-after");
        const retryAfter = raw ? Number(raw) : NaN;
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(120000, retryAfter * 1000)
          : Math.min(120000, Math.max(5000, 2 ** attempt * 3000));
        console.warn(`retry ${res.status} Wikidata API in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      if (!res.ok) throw new Error(`${res.status} Wikidata API`);
      const json = await res.json();
      if (json.error?.code === "maxlag" && attempt < 6) {
        const backoff = Math.min(120000, Math.max(5000, 2 ** attempt * 3000));
        console.warn(`retry maxlag Wikidata API in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      if (json.error) throw new Error(json.error.info || json.error.code || "Wikidata API");
      return json;
    } catch (err) {
      if (attempt < 6) {
        const backoff = Math.min(120000, Math.max(5000, 2 ** attempt * 3000));
        console.warn(`retry ${err.cause?.code || err.message} Wikidata API in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

async function lookupBySite(site, names) {
  if (!names.length) return {};
  const json = await wikiGet({
    action: "wbgetentities",
    sites: site,
    titles: names.join("|"),
    props: "labels|claims|sitelinks",
    languages: "en|fa"
  });
  const wanted = new Map(names.map((n) => [normTitle(n), n]));
  for (const row of json.normalized || []) {
    const orig = wanted.get(normTitle(row.from));
    if (orig) wanted.set(normTitle(row.to), orig);
  }
  for (const row of json.redirects || []) {
    const orig = wanted.get(normTitle(row.from));
    if (orig) wanted.set(normTitle(row.to), orig);
  }
  const out = {};
  for (const entity of Object.values(json.entities || {})) {
    if (!entity || entity.missing) continue;
    const siteTitle = entity.sitelinks?.[site]?.title;
    const orig = (siteTitle && wanted.get(normTitle(siteTitle))) || wanted.get(normTitle(entity.title));
    if (!orig) continue;
    const taxon = p225Values(entity);
    if (!taxon.some((v) => normTitle(v) === normTitle(orig))) continue;
    const hits = namesFromEntity(entity);
    const en = titleCaseEn(pickBest(orig, hits.en));
    const fa = pickBest(orig, hits.fa);
    if (en || fa) out[orig] = { ...(en ? { en } : {}), ...(fa ? { fa } : {}) };
  }
  return out;
}

async function lookupBatch(taxa) {
  const names = taxa.map((t) => t.name);
  try {
    const found = await lookupBySite("specieswiki", names);
    const missing = taxa.filter((t) => !found[t.name] && t.rank !== "species").map((t) => t.name);
    if (missing.length) Object.assign(found, await lookupBySite("enwiki", missing));
    return found;
  } catch (err) {
    console.warn(`Wikidata API failed (${err.message}); SPARQL fallback`);
    return lookupBatchSparql(taxa);
  }
}

function selectedCategories() {
  if (groupArg === "all") return CATEGORIES;
  const ids = groupArg.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const cats = ids.map((id) => categoryById(id));
  const missing = ids.filter((id, i) => !cats[i]);
  if (missing.length) {
    throw new Error(`Unknown group(s): ${missing.join(", ")}. Use ${CATEGORIES.map((c) => c.id).join(", ")}, or all.`);
  }
  return cats;
}

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function loadCache() {
  const raw = await loadJson(CACHE_PATH, null);
  const hits = {};
  const misses = new Set();
  if (raw && typeof raw === "object") {
    if (raw.hits && typeof raw.hits === "object") {
      for (const [name, entry] of Object.entries(raw.hits)) {
        if (isHit(entry)) hits[name] = { ...(entry.en ? { en: entry.en } : {}), ...(entry.fa ? { fa: entry.fa } : {}) };
      }
    }
    for (const name of raw.misses || []) misses.add(name);
  }
  return { hits, misses };
}

async function saveCache(hits, misses) {
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  const payload = {
    updated: new Date().toISOString(),
    hits,
    misses: [...misses]
  };
  await writeFile(CACHE_PATH, JSON.stringify(payload));
}

function vernacularFromHits(names, hits) {
  const out = {};
  for (const { name } of names) {
    const entry = hits[name];
    if (isHit(entry)) out[name] = { ...(entry.en ? { en: entry.en } : {}), ...(entry.fa ? { fa: entry.fa } : {}) };
  }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

function countLang(map) {
  const values = Object.values(map);
  return {
    taxa: values.length,
    en: values.filter((e) => e.en).length,
    fa: values.filter((e) => e.fa).length
  };
}

async function writeGroupVernacular(cat, names, hits) {
  const outPath = join(repo, cat.folder, "data", "vernacular.json");
  const subset = vernacularFromHits(names, hits);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(subset, null, 2) + "\n");
  return countLang(subset);
}

async function appendNote(folder, text) {
  await appendFile(join(repo, folder, "NOTES.md"), `\n${text.trim()}\n`);
}

async function main() {
  const cats = selectedCategories();
  const { hits, misses } = await loadCache();

  const perGroup = [];
  for (const cat of cats) {
    const treePath = join(repo, cat.folder, "data", cat.dataFile);
    const tree = JSON.parse(await readFile(treePath, "utf8"));
    const existing = await loadJson(join(repo, cat.folder, "data", "vernacular.json"), {});
    for (const [name, entry] of Object.entries(existing || {})) {
      if (isHit(entry)) hits[name] = mergeEntry(hits[name], entry);
    }
    const names = collectNames(tree);
    perGroup.push({ cat, names });
  }

  const todoMap = new Map();
  for (const { names } of perGroup) {
    for (const taxon of names) {
      if (todoMap.has(taxon.name)) continue;
      const cur = hits[taxon.name];
      if (!force && isHit(cur)) continue;
      if (!force && misses.has(taxon.name)) continue;
      todoMap.set(taxon.name, taxon);
    }
  }
  const todo = [...todoMap.values()].sort(
    (a, b) => (RANK_WEIGHT[a.rank] ?? 9) - (RANK_WEIGHT[b.rank] ?? 9) || a.name.localeCompare(b.name)
  );

  const uniqueNames = new Set(perGroup.flatMap((g) => g.names.map((n) => n.name))).size;
  console.log(
    `vernacular lookup: ${todo.length} to query, ${Object.keys(hits).length} cached hits, ${misses.size} cached misses, ${uniqueNames} unique names across ${cats.map((c) => c.id).join(", ")}`
  );

  let queried = 0;
  let batchHits = 0;
  if (flushOnly) {
    console.log("flush-only: writing cached hits into per-group vernacular.json");
  } else {
    for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    process.stdout.write(`names ${i + 1}–${Math.min(i + BATCH, todo.length)} / ${todo.length} (${batch[0].rank}) … `);
    try {
      const found = await lookupBatch(batch);
      for (const taxon of batch) {
        queried += 1;
        const next = found[taxon.name];
        if (isHit(next)) {
          hits[taxon.name] = mergeEntry(hits[taxon.name], next);
          misses.delete(taxon.name);
          batchHits += 1;
        } else if (!isHit(hits[taxon.name])) {
          misses.add(taxon.name);
        }
      }
      console.log(`${Object.keys(found).length} hits`);
    } catch (err) {
      console.log(`failed (${err.message})`);
    }
    const flushed = i + BATCH;
    if (flushed % (BATCH * 5) === 0 || flushed >= todo.length) {
      await saveCache(hits, misses);
      for (const { cat, names } of perGroup) {
        await writeGroupVernacular(cat, names, hits);
      }
    }
  }
  }

  if (flushOnly || !todo.length) {
    for (const { cat, names } of perGroup) {
      await writeGroupVernacular(cat, names, hits);
    }
  }

  const lines = [];
  console.log("");
  for (const { cat, names } of perGroup) {
    const stats = await writeGroupVernacular(cat, names, hits);
    const line = `${cat.folder}/data/vernacular.json: ${stats.taxa} taxa, ${stats.en} English, ${stats.fa} Persian (${names.length} names in tree)`;
    console.log(line);
    lines.push(line);
  }

  const today = new Date().toISOString().slice(0, 10);
  const note = `
## Names — Latin / English / فارسی (${today})

- Wikidata harvest via \`scripts/fetch-names.mjs\` (\`P225\` + \`rdfs:label\` in \`en\`/\`fa\`).
- Missing vernaculars fall back to Latin; nothing is invented. Species English still prefers checklist \`common\` when present.
- ${lines.join("\n- ")}
`.trim();

  if (!skipNotes) {
    for (const { cat } of perGroup) {
      await appendNote(cat.folder, note);
    }
    await appendNote("shared", note);
  }

  console.log(`\nqueried ${queried} names this run; ${batchHits} new or updated hits`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
