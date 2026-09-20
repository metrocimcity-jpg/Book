import test from "node:test";
import assert from "node:assert/strict";
import { rowsFromCsv, buildTrees, countTree, findPath, assertCounts } from "../scripts/lib/taxonomy.mjs";

const csv = `order,family,genus,specificEpithet,sciName,mainCommonName,extinct,domestic,iucnStatus,authorityYear
Accipitriformes,Accipitridae,Aquila,chrysaetos,Aquila_chrysaetos,Golden Eagle,0,0,LC,1758
Accipitriformes,Accipitridae,Aquila,heliaca,Aquila_heliaca,Eastern Imperial Eagle,0,0,VU,1809
Passeriformes,Corvidae,Corvus,corax,Corvus_corax,Common Raven,0,0,LC,1758
Struthioniformes,Struthionidae,Struthio,camelus,Struthio_camelus,Common Ostrich,0,0,LC,1758
Passeriformes,incertae sedis,Unnamed,sp,Unnamed_sp,Mystery,0,0,DD,1900
`;

test("builds a genus-leaf tree and keeps species on the genus", () => {
  const rows = rowsFromCsv(csv);
  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct: true });
  assert.equal(genusTree.name, "Aves");
  const path = findPath(genusTree, ["Accipitriformes", "Accipitridae", "Aquila"]);
  assert.ok(path);
  assert.equal(path.at(-1).value, 2);
  assert.equal(path.at(-1).species[0].name, "Aquila chrysaetos");
  const speciesPath = findPath(speciesTree, ["Accipitriformes", "Accipitridae", "Aquila", "Aquila chrysaetos"]);
  assert.ok(speciesPath);
  assert.equal(countTree(genusTree).species, 5);
});

test("maps incertae sedis genera to (unplaced)", () => {
  const rows = rowsFromCsv(csv);
  const { genusTree } = buildTrees(rows);
  const passeriformes = genusTree.children.find((c) => c.name === "Passeriformes");
  assert.ok(passeriformes.children.some((f) => f.name === "(unplaced)"));
});

test("count ranges reject a tiny fixture tree", () => {
  const { genusTree } = buildTrees(rowsFromCsv(csv));
  assert.ok(assertCounts(countTree(genusTree)).length > 0);
});
