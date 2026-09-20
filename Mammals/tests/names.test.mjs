import test from "node:test";
import assert from "node:assert/strict";
import { displayName, normalizeNameLang, searchKey } from "../src/util/names.js";

const node = { name: "Carnivora", rank: "order" };
const species = { name: "Panthera leo", common: "Lion" };
const vernacular = {
  Carnivora: { en: "Carnivorans", fa: "گوشت‌خوارسانان" },
  "Panthera leo": { fa: "شیر" }
};

test("Latin is always the scientific name", () => {
  assert.equal(displayName(node, "la", vernacular), "Carnivora");
  assert.equal(displayName(species, "la", vernacular), "Panthera leo");
});

test("English prefers the checklist common name, then Wikidata", () => {
  assert.equal(displayName(species, "en", vernacular), "Lion");
  assert.equal(displayName(node, "en", vernacular), "Carnivorans");
});

test("Persian uses Wikidata and falls back to Latin when missing", () => {
  assert.equal(displayName(node, "fa", vernacular), "گوشت‌خوارسانان");
  assert.equal(displayName({ name: "Mysteryidae" }, "fa", vernacular), "Mysteryidae");
});

test("search keys include Persian so typed vernacular matches", () => {
  assert.match(searchKey(node, vernacular), /گوشت‌خوارسانان/);
});

test("unknown language codes fall back to Latin", () => {
  assert.equal(normalizeNameLang("de"), "la");
  assert.equal(displayName(node, "de", vernacular), "Carnivora");
});
