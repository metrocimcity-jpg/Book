import test from "node:test";
import assert from "node:assert/strict";
import { flattenIndex, searchIndex, findPath } from "../src/util/tree.js";
import { serializeView, parseView } from "../src/util/url.js";

const tree = {
  name: "Mammalia",
  rank: "class",
  children: [
    {
      name: "Carnivora",
      rank: "order",
      children: [
        {
          name: "Felidae",
          rank: "family",
          children: [
            {
              name: "Panthera",
              rank: "genus",
              value: 1,
              species: [{ name: "Panthera leo", common: "Lion" }]
            }
          ]
        }
      ]
    }
  ]
};

test("search finds a species by common name", () => {
  const hits = searchIndex(flattenIndex(tree), "lion");
  assert.equal(hits[0].name, "Panthera leo");
  assert.deepEqual(hits[0].path, ["Carnivora", "Felidae", "Panthera"]);
});

test("hash serialisation round-trips a species view", () => {
  const hash = serializeView(["Carnivora", "Felidae", "Panthera"], "Panthera leo");
  assert.equal(hash, "#/Carnivora/Felidae/Panthera?species=Panthera%20leo");
  assert.deepEqual(parseView(hash), {
    names: ["Carnivora", "Felidae", "Panthera"],
    species: "Panthera leo"
  });
});

test("findPath walks the lineage", () => {
  assert.equal(findPath(tree, ["Carnivora", "Felidae"]).at(-1).name, "Felidae");
});
