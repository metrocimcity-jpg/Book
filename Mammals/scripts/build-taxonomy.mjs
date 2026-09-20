import { mkdir, readFile, writeFile, stat, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  rowsFromCsv,
  buildTrees,
  countTree,
  findPath,
  stableStringify,
  assertCounts
} from "./lib/taxonomy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rawDir = join(root, "data", "raw");
const pinPath = join(rawDir, "source.json");

const args = new Set(process.argv.slice(2));
const includeExtinct = args.has("--include-extinct");
const sourceArg = [...args].find((a) => a.startsWith("--source="));
const sourceName = sourceArg ? sourceArg.split("=")[1] : "mdd";

const UA = "mammals-sunburst/1.0 (taxonomy build; local static viz)";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(45000)
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res;
}

const GITHUB_MDD_MIRROR = {
  source: "ASM Mammal Diversity Database",
  version: "v2.4",
  doi: "10.5281/zenodo.17033774",
  recordId: "github-mirror-v2.4",
  url: "https://cdn.jsdelivr.net/gh/PaulESantos/rmdd@main/data-raw/MDD/MDD_v2.4_6871species.csv",
  filename: "MDD_v2.4_6871species.csv",
  retrievedAt: new Date().toISOString().slice(0, 10),
  note: "GitHub/jsDelivr mirror of the official MDD v2.4 species CSV. Used when Zenodo is unreachable."
};

async function resolveMddRelease() {
  try {
    const api = "https://zenodo.org/api/records/?q=conceptrecid:4139722&sort=mostrecent&size=5";
    const json = await (await fetchText(api)).json();
    const hit = (json.hits?.hits || []).find((h) =>
      (h.files || []).some((f) => /MDD_v.*species\.csv$/i.test(f.key))
    ) || json.hits?.hits?.[0];
    if (!hit) throw new Error("Zenodo returned no MDD records");
    const file = (hit.files || []).find((f) => /MDD_v.*species\.csv$/i.test(f.key));
    if (!file) throw new Error(`No species CSV on record ${hit.id}`);
    return {
      source: "ASM Mammal Diversity Database",
      version: hit.metadata?.version || "unknown",
      doi: hit.doi || hit.metadata?.doi || "10.5281/zenodo.4139722",
      recordId: hit.id,
      url: file.links?.self || `https://zenodo.org/api/records/${hit.id}/files/${file.key}/content`,
      filename: file.key,
      retrievedAt: new Date().toISOString().slice(0, 10)
    };
  } catch (err) {
    console.warn(`Zenodo resolve failed (${err.message}); using GitHub mirror of MDD v2.4`);
    return GITHUB_MDD_MIRROR;
  }
}

async function loadCachedPin() {
  try {
    return JSON.parse(await readFile(pinPath, "utf8"));
  } catch {
    return null;
  }
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadCsv(url, dest) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.toString("utf8");
}

async function loadGbifRows() {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  let end = false;
  while (!end) {
    const url = `https://api.gbif.org/v1/species/search?highertaxonKey=359&rank=SPECIES&status=ACCEPTED&limit=${pageSize}&offset=${offset}`;
    const json = await (await fetchText(url)).json();
    for (const r of json.results || []) {
      rows.push({
        order: r.order || "",
        family: r.family || "",
        genus: r.genus || "",
        epithet: r.specificEpithet || "",
        sciName: r.scientificName || r.canonicalName || "",
        common: (r.vernacularNames || [])[0]?.vernacularName || "",
        extinct: false,
        domestic: false,
        iucn: "",
        year: null
      });
    }
    offset += pageSize;
    end = json.endOfRecords || !(json.results || []).length || offset > 20000;
    console.log(`GBIF offset ${offset}`);
  }
  return rows;
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(join(root, "data"), { recursive: true });

  let rows;
  let meta;

  if (sourceName === "gbif") {
    rows = await loadGbifRows();
    meta = {
      source: "GBIF Backbone Taxonomy (Mammalia)",
      version: "live-search",
      doi: "",
      retrievedAt: new Date().toISOString().slice(0, 10)
    };
  } else {
    const localCsv = (await readdir(rawDir).catch(() => []))
      .filter((name) => /MDD_v.+\d+species\.csv$/i.test(name))
      .sort()
      .at(-1);
    const resolved = localCsv
      ? {
          source: "ASM Mammal Diversity Database",
          version: (localCsv.match(/MDD_(v[\d.]+)/i) || [])[1] || "local",
          doi: "10.5281/zenodo.4139722",
          recordId: "local-cache",
          url: `file:${localCsv}`,
          filename: localCsv,
          retrievedAt: new Date().toISOString().slice(0, 10),
          note: "Using already-downloaded MDD species CSV"
        }
      : await resolveMddRelease();
    const cached = await loadCachedPin();
    const dest = join(rawDir, resolved.filename);
    let csv;
    if (cached?.version === resolved.version && (await fileExists(dest))) {
      console.log(`Using cached ${resolved.filename} (${resolved.version})`);
      csv = await readFile(dest, "utf8");
    } else {
      try {
        csv = await downloadCsv(resolved.url, dest);
      } catch (err) {
        console.warn(`Primary download failed (${err.message}); trying GitHub mirror`);
        const mirror = GITHUB_MDD_MIRROR;
        const mirrorDest = join(rawDir, mirror.filename);
        csv = await downloadCsv(mirror.url, mirrorDest);
        Object.assign(resolved, mirror);
      }
      await writeFile(pinPath, JSON.stringify(resolved, null, 2));
    }
    rows = rowsFromCsv(csv);
    meta = resolved;
    console.log(`Resolved MDD ${resolved.version} · ${resolved.doi} · ${resolved.url}`);
  }

  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct });
  const counts = countTree(genusTree);
  meta.counts = counts;

  await writeFile(join(root, "data", "mammals.json"), stableStringify(genusTree));
  await writeFile(join(root, "data", "mammals.species.json"), stableStringify(speciesTree));
  await writeFile(join(root, "data", "meta.json"), JSON.stringify(meta, null, 2));

  console.log("counts");
  console.table(counts);

  const panthera = findPath(genusTree, ["Carnivora", "Felidae", "Panthera"]);
  if (!panthera) {
    console.error("Spot check failed: Carnivora → Felidae → Panthera missing");
    process.exitCode = 1;
  } else {
    const species = panthera.at(-1).species.map((s) => s.name);
    console.log(`Panthera species (${species.length}): ${species.join(", ")}`);
    if (!species.includes("Panthera leo")) {
      console.error("Spot check failed: Panthera leo missing");
      process.exitCode = 1;
    }
  }

  const orderSizes = [...genusTree.children]
    .map((o) => [o.name, countTree(o).species])
    .sort((a, b) => b[1] - a[1]);
  console.log("Largest orders:");
  console.table(orderSizes.slice(0, 5).map(([name, species]) => ({ name, species })));
  if (orderSizes[1]?.[0] !== "Chiroptera") {
    console.warn(`Chiroptera is not the second-largest order (got ${orderSizes[1]?.[0]}).`);
  }

  const rangeErrors = assertCounts(counts);
  if (rangeErrors.length) {
    console.error("Count assertions failed:");
    for (const err of rangeErrors) console.error(" -", err);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
