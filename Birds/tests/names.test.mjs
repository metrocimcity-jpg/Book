import test from "node:test";
import assert from "node:assert/strict";
import { displayName, normalizeNameLang, searchKey } from "../src/util/names.js";

const node = { name: "Accipitriformes", rank: "order" };
const species = { name: "Aquila chrysaetos", common: "Golden Eagle" };
const vernacular = {
  Accipitriformes: { en: "Hawks and eagles", fa: "بازسانان" },
  "Aquila chrysaetos": { fa: "عقاب طلایی" }
};

test("Latin is always the scientific name", () => {
  assert.equal(displayName(node, "la", vernacular), "Accipitriformes");
  assert.equal(displayName(species, "la", vernacular), "Aquila chrysaetos");
});

test("English prefers the checklist common name, then Wikidata", () => {
  assert.equal(displayName(species, "en", vernacular), "Golden Eagle");
  assert.equal(displayName(node, "en", vernacular), "Hawks and eagles");
});

test("Persian uses Wikidata and falls back to Latin when missing", () => {
  assert.equal(displayName(node, "fa", vernacular), "بازسانان");
  assert.equal(displayName({ name: "Mysteryidae" }, "fa", vernacular), "Mysteryidae");
});

test("search keys include Persian so typed vernacular matches", () => {
  assert.match(searchKey(node, vernacular), /بازسانان/);
});

test("unknown language codes fall back to Latin", () => {
  assert.equal(normalizeNameLang("de"), "la");
  assert.equal(displayName(node, "de", vernacular), "Accipitriformes");
});
