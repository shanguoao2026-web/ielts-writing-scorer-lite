import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeCohesion } from "../src/cohesion.js";

test("counts multi-word devices once and does not double-count shorter phrases", () => {
  const text = "Even though the plan is costly, it may work. On the other hand, delay is worse.";
  const cohesion = analyzeCohesion(text, 14);
  const evenThough = cohesion.hits.find((hit) => hit.phrase === "even though");
  const though = cohesion.hits.find((hit) => hit.phrase === "though");
  const otherHand = cohesion.hits.find((hit) => hit.phrase === "on the other hand");
  assert.equal(evenThough?.count, 1);
  assert.equal(evenThough?.category, "contrast");
  assert.equal(though, undefined);
  assert.equal(otherHand?.count, 1);
  assert.equal(otherHand?.category, "contrast");
});

test("repeats a linker and reports missing discourse categories", () => {
  const text = "In addition, the city grew. In addition, costs rose afterwards without a contrast.";
  const cohesion = analyzeCohesion(text, 12);
  const addition = cohesion.hits.find((hit) => hit.phrase === "in addition");
  assert.equal(addition?.count, 2);
  assert.ok(cohesion.discourseCategoriesPresent.includes("addition"));
  assert.ok(cohesion.discourseCategoriesMissing.includes("contrast"));
  assert.ok(cohesion.discourseCategoriesMissing.includes("example"));
  assert.ok(cohesion.densityPer100Words > 0);
});

test("records a stance when the writer agrees with a modifier", () => {
  const cohesion = analyzeCohesion("I largely agree that the policy is useful.", 8);
  assert.ok(cohesion.hits.some((hit) => hit.category === "stance"));
});
