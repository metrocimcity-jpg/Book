import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { USER_AGENT, rateLimit, sleep } from "./lib/http.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rankArg = process.argv.find((a) => a.startsWith("--rank="));
const onlyRanks = rankArg ? new Set(rankArg.split("=")[1].split(",")) : null;
const force = process.argv.includes("--force");
const BATCH = 40;

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
  const rankWeight = { class: 0, order: 1, family: 2, genus: 3, species: 4 };
  return [...seen.entries()]
    .map(([name, rank]) => ({ name, rank }))
    .sort((a, b) => (rankWeight[a.rank] ?? 9) - (rankWeight[b.rank] ?? 9) || a.name.localeCompare(b.name));
}

function sparqlString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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

async function sparql(query) {
  await rateLimit("query.wikidata.org", 1000);
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
        signal: AbortSignal.timeout(90000)
      });
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        const backoff = 2 ** attempt * 1000;
        console.warn(`retry ${res.status} SPARQL in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw new Error(`${res.status} SPARQL`);
    } catch (err) {
      if (attempt < 4) {
        const backoff = 2 ** attempt * 1000;
        console.warn(`retry ${err.cause?.code || err.message} SPARQL in ${backoff}ms`);
        await sleep(backoff);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

async function lookupBatch(names) {
  const values = names.map(sparqlString).join(" ");
  const query = `SELECT ?taxonName ?enLabel ?faLabel ?enCommon ?faCommon WHERE {
    VALUES ?taxonName { ${values} }
    ?item wdt:P225 ?taxonName.
    OPTIONAL { ?item rdfs:label ?enLabel FILTER(LANG(?enLabel)="en") }
    OPTIONAL { ?item rdfs:label ?faLabel FILTER(LANG(?faLabel)="fa") }
    OPTIONAL { ?item wdt:P1843 ?enCommon FILTER(LANG(?enCommon)="en") }
    OPTIONAL { ?item wdt:P1843 ?faCommon FILTER(LANG(?faCommon)="fa") }
  }`;
  const json = await sparql(query);
  const grouped = new Map();
  for (const row of json.results?.bindings || []) {
    const name = row.taxonName?.value;
    if (!name) continue;
    const cur = grouped.get(name) || { en: [], fa: [] };
    if (row.enCommon?.value) cur.en.push(row.enCommon.value);
    if (row.enLabel?.value) cur.en.push(row.enLabel.value);
    if (row.faCommon?.value) cur.fa.push(row.faCommon.value);
    if (row.faLabel?.value) cur.fa.push(row.faLabel.value);
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

async function main() {
  const treePath = join(root, "data", "birds.json");
  const tree = JSON.parse(await readFile(treePath, "utf8"));
  const outPath = join(root, "data", "vernacular.json");
  let existing = {};
  try { existing = JSON.parse(await readFile(outPath, "utf8")); } catch { existing = {}; }

  const taxa = collectNames(tree);
  const todo = taxa.filter((t) => {
    if (force) return true;
    const cur = existing[t.name];
    return !cur || !cur.fa;
  });

  console.log(`vernacular lookup: ${todo.length} of ${taxa.length} names`);
  await mkdir(join(root, "data"), { recursive: true });

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    process.stdout.write(`names ${i + 1}–${Math.min(i + BATCH, todo.length)} / ${todo.length} … `);
    try {
      const found = await lookupBatch(batch.map((t) => t.name));
      Object.assign(existing, found);
      await writeFile(outPath, JSON.stringify(existing, null, 2));
      console.log(`${Object.keys(found).length} hits`);
    } catch (err) {
      console.log(`failed (${err.message})`);
    }
  }

  const fa = Object.values(existing).filter((e) => e.fa).length;
  const en = Object.values(existing).filter((e) => e.en).length;
  console.log(`\nvernacular.json: ${Object.keys(existing).length} taxa, ${en} English, ${fa} Persian`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
