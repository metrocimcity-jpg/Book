import test from "node:test";
import assert from "node:assert/strict";
import { ORDER_PALETTE, orderColorMap } from "../src/palette.js";

test("palette has 27 unique colours and wraps extra orders", () => {
  assert.equal(ORDER_PALETTE.length, 27);
  assert.equal(new Set(ORDER_PALETTE).size, 27);
  const map = orderColorMap([...ORDER_PALETTE.keys(), "extra"]);
  assert.equal(map.get("extra"), ORDER_PALETTE[0]);
});

test("orderColorMap assigns stably", () => {
  const map = orderColorMap(["Carnivora", "Chiroptera"]);
  assert.equal(map.get("Carnivora"), ORDER_PALETTE[0]);
  assert.equal(map.get("Chiroptera"), ORDER_PALETTE[1]);
});
