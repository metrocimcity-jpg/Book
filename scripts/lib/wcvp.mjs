import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { indexHeaders, pick, parseDelimited } from "./csv.mjs";

export function parsePipeLine(line) {
  return parseDelimited(`${line}\n`, "|")[0] || [];
}

export async function streamWcvpNames(csvPath, onRow) {
  const stream = createReadStream(csvPath, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let headers = null;
  let n = 0;
  for await (const line of rl) {
    if (!line) continue;
    const row = parsePipeLine(line);
    if (!headers) {
      headers = indexHeaders(row);
      continue;
    }
    n += 1;
    await onRow(headers, row, n);
  }
  return n;
}

export function wcvpAcceptedSpecies(headers, row) {
  const rank = pick(headers, row, ["taxon_rank"]).toLowerCase();
  const status = pick(headers, row, ["taxon_status"]).toLowerCase();
  if (rank !== "species" || status !== "accepted") return null;
  const genus = pick(headers, row, ["genus"]);
  const epithet = pick(headers, row, ["species"]);
  const sciName = pick(headers, row, ["taxon_name"]) || `${genus} ${epithet}`.trim();
  if (!sciName) return null;
  return {
    family: pick(headers, row, ["family"]),
    genus,
    epithet,
    sciName,
    lifeform: pick(headers, row, ["lifeform_description"]).toLowerCase(),
    year: Number.parseInt((pick(headers, row, ["first_published"]) || "").replace(/[^\d]/g, "").slice(0, 4), 10) || null
  };
}

function lifeformTokens(lifeform) {
  return new Set(String(lifeform || "").toLowerCase().split(/[^a-z]+/).filter(Boolean));
}

/** Kew POWO lifeform tokens. "bush" is not a Kew term; subshrub is the closest. */
export function lifeformGroups(lifeform) {
  const t = lifeformTokens(lifeform);
  const groups = new Set();
  if (t.has("tree")) groups.add("tree");
  if (t.has("shrub")) groups.add("shrubs");
  if (t.has("subshrub")) groups.add("bushes");
  const herb = ["perennial", "annual", "biennial", "herb", "geophyte", "therophyte", "hemicryptophyte", "hydrophyte", "helophyte"];
  if (herb.some((word) => t.has(word)) && !t.has("tree") && !t.has("shrub") && !t.has("subshrub")) {
    groups.add("flowers");
  }
  return groups;
}
