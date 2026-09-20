import test from "node:test";
import assert from "node:assert/strict";
import { ORDER_PALETTE, orderColorMap } from "../src/palette.js";

test("palette has unique colours and wraps for extra bird orders", () => {
  assert.equal(ORDER_PALETTE.length, 27);
  assert.equal(new Set(ORDER_PALETTE).size, 27);
});

test("orderColorMap assigns stably", () => {
  const map = orderColorMap(["Accipitriformes", "Passeriformes"]);
  assert.equal(map.get("Accipitriformes"), ORDER_PALETTE[0]);
  assert.equal(map.get("Passeriformes"), ORDER_PALETTE[1]);
});
