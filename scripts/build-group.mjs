import { mkdir, readFile, writeFile, stat, appendFile, readdir, copyFile, mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { parseTsv, indexHeaders, pick } from "./lib/csv.mjs";
import { buildTrees, buildFamilyCountTree, countTree, findPath, stableStringify } from "./lib/taxonomy.mjs";
import { downloadTo, fetchText, fetchJson, mapPool, sleep } from "./lib/http.mjs";
import { gbifChildren, gbifFamilyLeaves, gbifMatchFamily, gbifSpeciesPages } from "./lib/gbif.mjs";
import { streamWcvpNames, wcvpAcceptedSpecies, lifeformGroups } from "./lib/wcvp.mjs";

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const today = () => new Date().toISOString().slice(0, 10);

const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--group="))?.split("=")[1] || "all";
const includeExtinct = !args.has("--exclude-extinct");

const NON_FISH_CHORDATES = new Set([
  "Amphibia",
  "Ascidiacea",
  "Aves",
  "Crocodylia",
  "Leptocardii",
  "Mammalia",
  "Sphenodontia",
  "Squamata",
  "Testudines",
  "Thaliacea",
  "Copelata"
]);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function appendNote(folder, text) {
  const path = join(repo, folder, "NOTES.md");
  await appendFile(path, `\n${text.trim()}\n`);
}

async function writeGroup(folder, dataFile, { genusTree, speciesTree, meta }) {
  const dataDir = join(repo, folder, "data");
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, dataFile), stableStringify(genusTree));
  const speciesName = dataFile.replace(/\.json$/, ".species.json");
  await writeFile(join(dataDir, speciesName), stableStringify(speciesTree));
  await writeFile(join(dataDir, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`Wrote ${folder}/data/${dataFile}`);
  console.table(meta.counts);
}

function iucnCode(raw) {
  const m = String(raw || "").match(/\(([A-Z]{2,3})\)\s*$/) || String(raw || "").match(/\b(EX|EW|CR|EN|VU|NT|LC|DD|NE)\b/);
  return m ? m[1] : "";
}

async function harvestAmphibians() {
  const folder = "Amphibians";
  const rawDir = join(repo, folder, "data", "raw");
  await mkdir(rawDir, { recursive: true });
  const dest = join(rawDir, "amphib_names_20260401.txt");
  const url = "https://raw.githubusercontent.com/AmphibiaWeb/taxonomy-archive/master/amphib_names_20260401.txt";
  if (!(await exists(dest))) {
    await downloadTo(url, dest);
  } else {
    console.log("Using cached AmphibiaWeb snapshot");
  }
  const text = await readFile(dest, "utf8");
  const table = parseTsv(text);
  const headers = indexHeaders(table[0]);
  const rows = table.slice(1).map((row) => {
    const genus = pick(headers, row, ["genus"]);
    const epithet = pick(headers, row, ["species"]);
    return {
      order: pick(headers, row, ["order"]),
      family: pick(headers, row, ["family"]),
      genus,
      epithet,
      sciName: `${genus} ${epithet}`.trim(),
      common: pick(headers, row, ["common_name"]),
      extinct: /extinct/i.test(pick(headers, row, ["iucn"])),
      iucn: iucnCode(pick(headers, row, ["iucn"])),
      year: Number.parseInt(pick(headers, row, ["year_described"]), 10) || null
    };
  }).filter((r) => r.sciName && r.order && r.family);
  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct, className: "Amphibia" });
  const counts = countTree(genusTree);
  const meta = {
    source: "AmphibiaWeb",
    version: "2026-04-01 snapshot",
    doi: "",
    url: "https://github.com/AmphibiaWeb/taxonomy-archive",
    retrievedAt: today(),
    note: "Monthly snapshot amphib_names_20260401.txt from AmphibiaWeb taxonomy-archive (CC BY 4.0). Daily amphibiaweb.org file is behind a human-check wall.",
    counts
  };
  await writeGroup(folder, "amphibians.json", { genusTree, speciesTree, meta });
  const rana = findPath(genusTree, ["Anura", "Ranidae"]);
  console.log(rana ? `Spot check Anura → Ranidae genera: ${rana.at(-1).children.length}` : "Ranidae missing");
  await appendNote(folder, `## Taxonomy harvest ${today()}\n\n- Source: AmphibiaWeb \`amphib_names.txt\` (${rows.length} species rows).\n- Counts: ${counts.orders} orders, ${counts.families} families, ${counts.genera} genera, ${counts.species} species.`);
}

async function harvestFishes() {
  const folder = "Fishes";
  const FISH_CLASSES = new Set(["Elasmobranchii", "Holocephali", "Myxini", "Petromyzonti", "Coelacanthi", "Dipneusti"]);
  const kids = await gbifChildren(44);
  const fishTaxa = kids.filter((n) => {
    if (n.taxonomicStatus !== "ACCEPTED") return false;
    if (NON_FISH_CHORDATES.has(n.canonicalName)) return false;
    if (n.rank === "CLASS") return FISH_CLASSES.has(n.canonicalName);
    return n.rank === "ORDER";
  });
  console.log(`Fish higher taxa from GBIF Chordata children: ${fishTaxa.length}`);
  const rows = [];
  for (const taxon of fishTaxa) {
    console.log(`GBIF species under ${taxon.rank} ${taxon.canonicalName} (${taxon.key})`);
    const batch = await gbifSpeciesPages(taxon.key, {
      onPage: ({ offset, got, total }) => console.log(`  offset ${offset} +${got} / ~${total || "?"}`)
    });
    rows.push(...batch.filter((r) => r.order && r.family && r.genus));
  }
  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct, className: "Fishes", rootRank: "group" });
  const counts = countTree(genusTree);
  const meta = {
    source: "GBIF Backbone Taxonomy",
    version: "backbone live search",
    doi: "10.15468/39omei",
    url: "https://api.gbif.org/v1/species/search",
    retrievedAt: today(),
    note: "Accepted species under GBIF Chordata children that are fishes (bony-fish orders plus Elasmobranchii, Holocephali, Myxini, Petromyzonti, Coelacanthi, Dipneusti). Amphibia, Aves, Mammalia, reptiles, tunicates, and lancelets excluded. Fishes is a vernacular group, not a clade.",
    counts
  };
  await writeGroup(folder, "fishes.json", { genusTree, speciesTree, meta });
  const gadus = findPath(genusTree, ["Gadiformes", "Gadidae", "Gadus"]);
  console.log(gadus ? `Gadus species: ${gadus.at(-1).species.map((s) => s.name).join(", ")}` : "Gadus missing (order names may differ)");
  await appendNote(folder, `## Taxonomy harvest ${today()}\n\n- Source: GBIF Backbone, Chordata children minus non-fish classes.\n- Counts: ${counts.orders} orders, ${counts.families} families, ${counts.genera} genera, ${counts.species} species.`);
}

async function harvestInsects() {
  const folder = "Insects";
  console.log("GBIF Insecta order → family species counts (too large for a species-level dump; 1.1M accepted species).");
  const familyRows = await gbifFamilyLeaves(216);
  const tree = buildFamilyCountTree(familyRows, { className: "Insecta" });
  const counts = countTree(tree);
  const meta = {
    source: "GBIF Backbone Taxonomy",
    version: "backbone live search",
    doi: "10.15468/39omei",
    url: "https://api.gbif.org/v1/species/216/children",
    retrievedAt: today(),
    note: "Insecta has ~1.1 million accepted species on GBIF, which exceeds the species-search offset limit and the sunburst budget. This tree is order → family; family.value is the GBIF accepted-species count. Genera and species names are not invented and are not listed.",
    counts
  };
  await writeGroup(folder, "insects.json", { genusTree: tree, speciesTree: tree, meta });
  await appendNote(folder, `## Taxonomy harvest ${today()}\n\n- Source: GBIF Insecta children. Family leaves with species counts.\n- Counts: ${counts.orders} orders, ${counts.families} families, ${counts.species} species (counted, not listed).`);
}

async function unzipOne(zipPath, memberHint, destDir) {
  await mkdir(destDir, { recursive: true });
  try {
    await execFileAsync("tar", ["-xf", zipPath, "-C", destDir]);
  } catch {
    await execFileAsync("tar", ["-xf", zipPath, "-C", destDir, memberHint].filter(Boolean));
  }
}

async function harvestTreesGts() {
  const folder = "Tree";
  const rawDir = join(repo, folder, "data", "raw");
  await mkdir(rawDir, { recursive: true });
  const zip = join(rawDir, "globaltreesearch-dwca.zip");
  if (!(await exists(zip))) {
    await downloadTo("https://ipt.brc.ac.uk/archive.do?r=globaltreesearch", zip, { timeout: 180000 });
  }
  const unpack = join(rawDir, "dwca");
  if (!(await exists(join(unpack, "taxon.txt"))) && !(await exists(join(unpack, "taxon.txt.gz")))) {
    await unzipOne(zip, null, unpack);
  }
  const files = await readdir(unpack);
  const core = files.find((n) => /^taxon/i.test(n) && !n.endsWith(".xml")) || files.find((n) => n.endsWith(".txt") || n.endsWith(".tsv"));
  if (!core) throw new Error(`No taxon table in ${unpack}: ${files.join(", ")}`);
  const text = await readFile(join(unpack, core), "utf8");
  const table = parseTsv(text);
  const headers = indexHeaders(table[0]);
  const rawRows = table.slice(1).map((row) => {
    const rank = pick(headers, row, ["taxonrank", "taxon_rank"]).toLowerCase();
    if (rank && rank !== "species") return null;
    const sciName = pick(headers, row, ["scientificname", "scientific_name"]);
    const genus = pick(headers, row, ["genus"]) || sciName.split(/\s+/)[0];
    const family = pick(headers, row, ["family"]);
    const order = pick(headers, row, ["order"]);
    return {
      order,
      family,
      genus,
      epithet: pick(headers, row, ["specificepithet", "specific_epithet"]) || sciName.split(/\s+/).slice(1).join(" "),
      sciName,
      common: pick(headers, row, ["vernacularname", "vernacular_name"])
    };
  }).filter((r) => r && r.sciName && r.family);

  const families = [...new Set(rawRows.map((r) => r.family).filter(Boolean))];
  const orderMap = await loadFamilyOrderMap(families, "Plantae");
  const rows = rawRows.map((r) => ({ ...r, order: r.order || orderMap.get(r.family) || "" })).filter((r) => r.order);
  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct: true, className: "Trees", rootRank: "group" });
  const counts = countTree(genusTree);
  const meta = {
    source: "BGCI GlobalTreeSearch",
    version: "IPT / GBIF checklist 7cfcd73b-03ae-476b-a61c-872d36b6c38f",
    doi: "10.13140/RG.2.2.14427.68644",
    url: "https://ipt.brc.ac.uk/archive.do?r=globaltreesearch",
    license: "CC-BY-NC 4.0",
    retrievedAt: today(),
    note: "Accepted tree species from GlobalTreeSearch. Family→order mapped with GBIF match. GTS data are CC-BY-NC; code licence is separate.",
    counts
  };
  await writeGroup(folder, "tree.json", { genusTree, speciesTree, meta });
  await appendNote(folder, `## Taxonomy harvest ${today()}\n\n- Source: GlobalTreeSearch DwC-A (${rows.length} species with an order).\n- Counts: ${counts.orders} orders, ${counts.families} families, ${counts.genera} genera, ${counts.species} species.\n- Licence: CC-BY-NC 4.0 (BGCI).`);
}

const familyOrderCachePath = join(repo, "data", "raw", "family-order-plantae.json");

async function loadFamilyOrderMap(families, kingdom) {
  await mkdir(dirname(familyOrderCachePath), { recursive: true });
  let cache = {};
  try { cache = JSON.parse(await readFile(familyOrderCachePath, "utf8")); } catch { cache = {}; }
  const missing = families.filter((f) => !cache[f]);
  console.log(`Family→order: ${families.length - missing.length} cached, ${missing.length} to match`);
  let i = 0;
  await mapPool(missing, 4, async (family) => {
    i += 1;
    try {
      const hit = await gbifMatchFamily(family, kingdom);
      cache[family] = hit?.order || "";
    } catch {
      cache[family] = "";
    }
    if (i % 25 === 0) {
      await writeFile(familyOrderCachePath, JSON.stringify(cache, null, 2));
      console.log(`  matched ${i}/${missing.length}`);
    }
    await sleep(50);
  });
  await writeFile(familyOrderCachePath, JSON.stringify(cache, null, 2));
  return new Map(Object.entries(cache));
}

async function ensureWcvp() {
  const rawDir = join(repo, "data", "raw");
  await mkdir(rawDir, { recursive: true });
  const zip = join(rawDir, "wcvp.zip");
  const csv = join(rawDir, "wcvp_names.csv");
  if (!(await exists(csv))) {
    if (!(await exists(zip))) {
      await downloadTo("https://sftp.kew.org/pub/data-repositories/WCVP/wcvp.zip", zip, { timeout: 300000 });
    }
    console.log("Unpacking WCVP names table…");
    const dir = await mkdtemp(join(tmpdir(), "wcvp-"));
    try {
      await execFileAsync("tar", ["-xf", zip, "-C", dir]);
      const names = await readdir(dir);
      const file = names.find((n) => /wcvp_names\.csv$/i.test(n)) || names.find((n) => /names\.csv$/i.test(n));
      if (!file) throw new Error(`wcvp_names.csv missing in zip (${names.join(", ")})`);
      await copyFile(join(dir, file), csv);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  return csv;
}

async function harvestWcvpGroups(which) {
  const csv = await ensureWcvp();
  const buckets = { tree: [], bushes: [], shrubs: [], flowers: [] };
  const wanted = new Set(which);
  await streamWcvpNames(csv, (headers, row) => {
    const rec = wcvpAcceptedSpecies(headers, row);
    if (!rec) return;
    const groups = lifeformGroups(rec.lifeform);
    for (const g of groups) {
      if (wanted.has(g) && buckets[g]) buckets[g].push(rec);
    }
  });

  const config = {
    tree: { folder: "Tree", file: "tree.json", title: "Trees", rank: "group" },
    bushes: { folder: "Bushes", file: "bushes.json", title: "Bushes", rank: "group" },
    shrubs: { folder: "Shrubs", file: "shrubs.json", title: "Shrubs", rank: "group" },
    flowers: { folder: "Flowers", file: "flowers.json", title: "Flowers", rank: "group" }
  };

  for (const id of which) {
    const recs = buckets[id];
    if (!recs) continue;
    console.log(`WCVP ${id}: ${recs.length} accepted species with a matching lifeform`);
    const families = [...new Set(recs.map((r) => r.family).filter(Boolean))];
    const orderMap = await loadFamilyOrderMap(families, "Plantae");
    const rows = recs.map((r) => ({
      order: orderMap.get(r.family) || "",
      family: r.family,
      genus: r.genus,
      epithet: r.epithet,
      sciName: r.sciName,
      year: r.year
    })).filter((r) => r.order && r.family && r.genus);
    const cfg = config[id];
    const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct: true, className: cfg.title, rootRank: cfg.rank });
    const counts = countTree(genusTree);
    const meta = {
      source: "World Checklist of Vascular Plants (WCVP / POWO, RBG Kew)",
      version: "wcvp.zip from sftp.kew.org",
      doi: "10.1093/botlinnean/boab007",
      url: "https://sftp.kew.org/pub/data-repositories/WCVP/",
      retrievedAt: today(),
      note: id === "bushes"
        ? "Kew has no lifeform token 'bush'. Bushes are accepted species whose WCVP lifeform includes subshrub — the closest published term, not an invented split from shrubs."
        : `Accepted WCVP species whose lifeform_description maps to this group. Species without a lifeform or without a GBIF order for their family are omitted, not invented.`,
      counts
    };
    await writeGroup(cfg.folder, cfg.file, { genusTree, speciesTree, meta });
    await appendNote(cfg.folder, `## Taxonomy harvest ${today()}\n\n- Source: WCVP names table, lifeform filter for ${id} (${rows.length} species with order).\n- Counts: ${counts.orders} orders, ${counts.families} families, ${counts.genera} genera, ${counts.species} species.`);
  }
}

const jobs = {
  amphibians: harvestAmphibians,
  fishes: harvestFishes,
  insects: harvestInsects,
  tree: harvestTreesGts,
  bushes: () => harvestWcvpGroups(["bushes"]),
  shrubs: () => harvestWcvpGroups(["shrubs"]),
  flowers: () => harvestWcvpGroups(["flowers"])
};

async function main() {
  const names = only === "all"
    ? ["amphibians", "fishes", "insects", "tree", "bushes", "shrubs", "flowers"]
    : only.split(",");
  for (const name of names) {
    const job = jobs[name];
    if (!job) throw new Error(`Unknown group ${name}`);
    console.log(`\n=== ${name} ===`);
    await job();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
