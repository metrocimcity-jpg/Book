import test from "node:test";
import assert from "node:assert/strict";
import { flattenIndex, searchIndex, findPath } from "../src/util/tree.js";
import { serializeView, parseView } from "../src/util/url.js";

const tree = {
  name: "Aves",
  rank: "class",
  children: [
    {
      name: "Accipitriformes",
      rank: "order",
      children: [
        {
          name: "Accipitridae",
          rank: "family",
          children: [
            {
              name: "Aquila",
              rank: "genus",
              value: 1,
              species: [{ name: "Aquila chrysaetos", common: "Golden Eagle" }]
            }
          ]
        }
      ]
    }
  ]
};

test("search finds a species by common name", () => {
  const hits = searchIndex(flattenIndex(tree), "golden");
  assert.equal(hits[0].name, "Aquila chrysaetos");
  assert.deepEqual(hits[0].path, ["Accipitriformes", "Accipitridae", "Aquila"]);
});

test("hash serialisation round-trips a species view", () => {
  const hash = serializeView(["Accipitriformes", "Accipitridae", "Aquila"], "Aquila chrysaetos");
  assert.equal(hash, "#/Accipitriformes/Accipitridae/Aquila?species=Aquila%20chrysaetos");
  assert.deepEqual(parseView(hash), {
    names: ["Accipitriformes", "Accipitridae", "Aquila"],
    species: "Aquila chrysaetos",
    lang: "la"
  });
});

test("hash serialisation stores the name language", () => {
  const hash = serializeView(["Accipitriformes"], null, "fa");
  assert.equal(hash, "#/Accipitriformes?names=fa");
  assert.deepEqual(parseView(hash), {
    names: ["Accipitriformes"],
    species: null,
    lang: "fa"
  });
});

test("findPath walks the lineage", () => {
  assert.equal(findPath(tree, ["Accipitriformes", "Accipitridae"]).at(-1).name, "Accipitridae");
});
