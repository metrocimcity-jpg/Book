import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { countTree, assertCounts } from "./lib/taxonomy.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const child of node.children || []) walk(child, fn, node);
}

async function listImages(dir, acc = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await listImages(path, acc);
    else if (entry.name !== "placeholder.svg") acc.push(path);
  }
  return acc;
}

async function main() {
  const errors = [];
  const tree = JSON.parse(await readFile(join(root, "data", "birds.json"), "utf8"));
  const counts = countTree(tree);
  for (const err of assertCounts(counts)) errors.push(err);

  walk(tree, (node) => {
    if (node.rank === "genus" && (node.species?.length ?? 0) !== node.value) {
      errors.push(`genus ${node.name} value ${node.value} != species ${node.species?.length}`);
    }
  });

  const seen = new Map();
  walk(tree, (node, parent) => {
    if (!node.rank || node.rank === "class") return;
    const key = `${node.rank}:${node.name}`;
    if (seen.has(key) && node.name !== "(unplaced)") {
      errors.push(`duplicate ${key} under ${parent?.name} and ${seen.get(key)}`);
    } else {
      seen.set(key, parent?.name);
    }
  });

  const credits = JSON.parse(await readFile(join(root, "assets", "credits.json"), "utf8"));
  const creditedFiles = new Set();
  for (const [name, entry] of Object.entries(credits)) {
    if (!entry.license || !entry.sourceUrl) errors.push(`${name} missing license/sourceUrl`);
    if (!entry.creator) errors.push(`${name} missing creator`);
    if (entry.licenseUrl && /nc|nd/i.test(entry.licenseUrl)) errors.push(`${name} licenseUrl contains nc/nd`);
    for (const file of [entry.file, entry.file2x]) {
      if (!file) continue;
      creditedFiles.add(file.replace(/\\/g, "/"));
      if (!(await exists(join(root, file)))) errors.push(`${name} points at missing ${file}`);
    }
  }

  const images = await listImages(join(root, "assets", "img"));
  for (const path of images) {
    const rel = relative(root, path).replace(/\\/g, "/");
    const is2x = /@2x\./.test(rel);
    const base = rel.replace(/@2x\./, ".");
    if (!creditedFiles.has(rel) && !creditedFiles.has(base) && !is2x) {
      errors.push(`orphan image ${rel}`);
    }
  }

  if (errors.length) {
    console.error(`verify failed (${errors.length})`);
    for (const err of errors) console.error(" -", err);
    process.exit(1);
  }
  console.log("verify ok");
  console.table(counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
