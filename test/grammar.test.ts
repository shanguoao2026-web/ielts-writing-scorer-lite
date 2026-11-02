import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeGrammar } from "../src/grammar.js";

test("flags informal wording and a lowercase pronoun", () => {
  const grammar = analyzeGrammar("yeah i kinda wanna finish. This stuff is a lot.");
  assert.ok(grammar.informalHits.some((hit) => hit.phrase === "yeah"));
  assert.ok(grammar.informalHits.some((hit) => hit.phrase === "kinda"));
  assert.ok(grammar.informalHits.some((hit) => hit.phrase === "wanna"));
  assert.ok(grammar.informalHits.some((hit) => hit.phrase === "a lot"));
  assert.ok(grammar.informalHits.some((hit) => hit.phrase === "stuff"));
  assert.ok(grammar.lowercasePronounI >= 1);
});

test("flags spaces before punctuation and missing capitals", () => {
  const grammar = analyzeGrammar("Hello , world. next sentence starts low.");
  assert.ok(grammar.punctuationIssues.includes("space before punctuation"));
  assert.ok(grammar.punctuationIssues.includes("possible missing capital after a sentence"));
});

test("counts distinct complex markers and adjacent repetition", () => {
  const grammar = analyzeGrammar(
    "Although the plan is new, it helps because people who join can learn. The the result matters when funding arrives.",
  );
  assert.ok(grammar.complexMarkerTypes >= 4);
  assert.ok(grammar.complexMarkers.some((marker) => marker.phrase === "although"));
  assert.ok(grammar.adjacentRepetitions.includes("the"));
});

test("does not treat e.g. as a sentence boundary for capitals", () => {
  const grammar = analyzeGrammar("The sample, e.g. a small clinic, is useful.");
  assert.equal(grammar.punctuationIssues.includes("possible missing capital after a sentence"), false);
});
