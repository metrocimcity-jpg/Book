import test from "node:test";
import assert from "node:assert/strict";
import { rowsFromCsv, buildTrees, countTree, findPath, assertCounts } from "../scripts/lib/taxonomy.mjs";

const csv = `order,family,genus,specificEpithet,sciName,mainCommonName,extinct,domestic,iucnStatus,authorityYear
Carnivora,Felidae,Panthera,leo,Panthera_leo,Lion,0,0,VU,1758
Carnivora,Felidae,Panthera,tigris,Panthera_tigris,Tiger,0,0,EN,1758
Chiroptera,Vespertilionidae,Myotis,lucifugus,Myotis_lucifugus,Little brown bat,0,0,EN,1762
Rodentia,Muridae,Mus,musculus,Mus_musculus,House mouse,0,1,LC,1758
Rodentia,incertae sedis,Unnamed,sp,Unnamed_sp,Mystery,0,0,DD,1900
`;

test("builds a genus-leaf tree and keeps species on the genus", () => {
  const rows = rowsFromCsv(csv);
  const { genusTree, speciesTree } = buildTrees(rows, { includeExtinct: true });
  const path = findPath(genusTree, ["Carnivora", "Felidae", "Panthera"]);
  assert.ok(path);
  assert.equal(path.at(-1).value, 2);
  assert.equal(path.at(-1).species[0].name, "Panthera leo");
  const speciesPath = findPath(speciesTree, ["Carnivora", "Felidae", "Panthera", "Panthera leo"]);
  assert.ok(speciesPath);
  assert.equal(countTree(genusTree).species, 5);
});

test("maps incertae sedis genera to (unplaced)", () => {
  const rows = rowsFromCsv(csv);
  const { genusTree } = buildTrees(rows);
  const rodentia = genusTree.children.find((c) => c.name === "Rodentia");
  assert.ok(rodentia.children.some((f) => f.name === "(unplaced)"));
});

test("count ranges reject a tiny fixture tree", () => {
  const { genusTree } = buildTrees(rowsFromCsv(csv));
  assert.ok(assertCounts(countTree(genusTree)).length > 0);
});
