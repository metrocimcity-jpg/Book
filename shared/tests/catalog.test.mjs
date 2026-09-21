import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, categoryById, parseGroup, rebaseCredits } from "../src/catalog.js";

test("catalog includes mammals, birds, and the new groups", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.deepEqual(ids, [
    "mammals",
    "birds",
    "fishes",
    "tree",
    "bushes",
    "shrubs",
    "flowers",
    "amphibians",
    "insects"
  ]);
  assert.equal(categoryById("fishes").folder, "Fishes");
  assert.equal(categoryById("amphibians").title, "Amphibia");
});

test("parseGroup reads ?group= and falls back", () => {
  assert.equal(parseGroup("group=fishes"), "fishes");
  assert.equal(parseGroup("?group=birds"), "birds");
  assert.equal(parseGroup("group=nope"), "mammals");
  assert.equal(parseGroup(""), "mammals");
});

test("rebaseCredits prefixes files with the category folder", () => {
  const out = rebaseCredits(
    { Carnivora: { file: "assets/img/order/carnivora.svg", file2x: "assets/img/order/carnivora@2x.webp" } },
    { folder: "Mammals" }
  );
  assert.equal(out.Carnivora.file, "Mammals/assets/img/order/carnivora.svg");
  assert.equal(out.Carnivora.file2x, "Mammals/assets/img/order/carnivora@2x.webp");
});
