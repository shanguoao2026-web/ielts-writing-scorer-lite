import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeLexical } from "../src/lexical.js";
import { tokenizeWords } from "../src/text.js";

test("computes type-token ratio and merges content lemmas", () => {
  const words = tokenizeWords("Cats chase cats and dogs chase cats.");
  const lexical = analyzeLexical(words);
  assert.equal(lexical.tokens, 7);
  assert.equal(lexical.uniqueTokens, 4);
  assert.ok(Math.abs(lexical.typeTokenRatio - 4 / 7) < 0.001);
  assert.equal(lexical.contentWords, 6);
  assert.equal(lexical.uniqueContentLemmas, 3);
  assert.ok(Math.abs(lexical.lexicalDiversity - 0.5) < 0.001);
});

test("reports the surface form people for the person lemma", () => {
  const words = tokenizeWords("People help people, and people need people today.");
  const lexical = analyzeLexical(words);
  const people = lexical.topRepetitions.find((item) => item.lemma === "person");
  assert.ok(people);
  assert.equal(people?.surface, "people");
  assert.equal(people?.count, 4);
  assert.equal(lexical.topRepetitions.some((item) => item.surface === "and"), false);
});
