import { mkdir, readFile, writeFile, stat, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  rowsFromCsv,
  rowsFromTable,
  buildTrees,
  countTree,
  findPath,
  stableStringify,
  assertCounts
} from "./lib/taxonomy.mjs";
import { rowsFromXlsx } from "./lib/xlsx.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const rawDir = join(root, "data", "raw");
const pinPath = join(rawDir, "source.json");

const args = new Set(process.argv.slice(2));
const includeExtinct = args.has("--include-extinct");
const sourceArg = [...args].find((a) => a.startsWith("--source="));
const sourceName = sourceArg ? sourceArg.split("=")[1] : "avilist";

const UA = "birds-sunburst/1.0 (taxonomy build; local static viz)";

const AVILIST = {
  source: "AviList: The Global Avian Checklist",
  version: "v2025b",
  doi: "10.2173/avilist.v2025b",
  recordId: "v2025b-10Jun2026",
  url: "https://www.avilist.org/wp-content/uploads/2026/06/AviList-v2025b-10Jun2026-short.xlsx",
  filename: "AviList-v2025b-10Jun2026-short.xlsx",
  retrievedAt: new Date().toISOString().slice(0, 10),
  note: "Official AviList short workbook. Species rows only; subspecies and higher-rank rows are dropped."
};

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(45000)
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res;
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

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Download failed ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return dest;
}

async function loadGbifRows() {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  let end = false;
  while (!end) {
    const url = `https://api.gbif.org/v1/species/search?highertaxonKey=212&rank=SPECIES&status=ACCEPTED&limit=${pageSize}&offset=${offset}`;
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

async function loadAviListRows(resolved) {
  const dest = join(rawDir, resolved.filename);
  if (await fileExists(dest)) {
    console.log(`Using cached ${resolved.filename} (${resolved.version})`);
  } else {
    const url = resolved.url.startsWith("http") ? resolved.url : AVILIST.url;
    await downloadFile(url, dest);
    resolved.url = url;
  }
  await writeFile(pinPath, JSON.stringify(resolved, null, 2));
  const table = await rowsFromXlsx(dest);
  return rowsFromTable(table);
}

async function main() {
  await mkdir(rawDir, { recursive: true });
  await mkdir(join(root, "data"), { recursive: true });

  let rows;
  let meta;

  if (sourceName === "gbif") {
    rows = await loadGbifRows();
    meta = {
      source: "GBIF Backbone Taxonomy (Aves)",
      version: "live-search",
      doi: "",
      retrievedAt: new Date().toISOString().slice(0, 10)
    };
  } else {
    const localXlsx = (await readdir(rawDir).catch(() => []))
      .filter((name) => /AviList.*\.(xlsx|csv)$/i.test(name))
      .sort()
      .at(-1);
    const resolved = localXlsx
      ? {
          ...AVILIST,
          recordId: "local-cache",
          url: `file:${localXlsx}`,
          filename: localXlsx,
          note: "Using already-downloaded AviList workbook"
        }
      : { ...AVILIST };
    if (/\.csv$/i.test(resolved.filename)) {
      const dest = join(rawDir, resolved.filename);
      const csv = await readFile(dest, "utf8");
      rows = rowsFromCsv(csv);
    } else {
      rows = await loadAviListRows(resolved);
    }
    meta = resolved;
    console.log(`Resolved AviList ${resolved.version} · ${resolved.doi} · ${resolved.url}`);
  }

  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct, className: "Aves" });
  const counts = countTree(genusTree);
  meta.counts = counts;

  await writeFile(join(root, "data", "birds.json"), stableStringify(genusTree));
  await writeFile(join(root, "data", "birds.species.json"), stableStringify(speciesTree));
  await writeFile(join(root, "data", "meta.json"), JSON.stringify(meta, null, 2));

  console.log("counts");
  console.table(counts);

  const aquila = findPath(genusTree, ["Accipitriformes", "Accipitridae", "Aquila"]);
  if (!aquila) {
    console.error("Spot check failed: Accipitriformes → Accipitridae → Aquila missing");
    process.exitCode = 1;
  } else {
    const species = aquila.at(-1).species.map((s) => s.name);
    console.log(`Aquila species (${species.length}): ${species.join(", ")}`);
    if (!species.includes("Aquila chrysaetos")) {
      console.error("Spot check failed: Aquila chrysaetos missing");
      process.exitCode = 1;
    }
  }

  const orderSizes = [...genusTree.children]
    .map((o) => [o.name, countTree(o).species])
    .sort((a, b) => b[1] - a[1]);
  console.log("Largest orders:");
  console.table(orderSizes.slice(0, 5).map(([name, species]) => ({ name, species })));
  if (orderSizes[0]?.[0] !== "Passeriformes") {
    console.warn(`Passeriformes is not the largest order (got ${orderSizes[0]?.[0]}).`);
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
