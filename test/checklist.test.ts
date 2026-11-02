import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreEssay } from "../src/analyze.js";
import { measurePromptOverlap } from "../src/checklist.js";
import { fixture } from "./helpers.js";

const question = fixture("question.txt");

test("flags overuse of and and so, plus sentence-initial coordinators", () => {
  const analysis = scoreEssay({ text: fixture("weak-essay.txt"), prompt: question, sourceName: "weak" });
  const ids = analysis.issues.map((item) => item.id);
  assert.ok(ids.includes("overuse-and"));
  assert.ok(ids.includes("overuse-so"));
  assert.ok(ids.includes("sentence-initial-and-so"));
  assert.ok(ids.includes("informal-language"));
  assert.ok(ids.includes("repetitive-word"));
  assert.ok(ids.includes("short-conclusion"));
});

test("flags a long question restatement on the weak fixture", () => {
  const analysis = scoreEssay({ text: fixture("weak-essay.txt"), prompt: question, sourceName: "weak" });
  assert.ok(analysis.issues.some((item) => item.id === "question-restatement-long"));
  assert.equal(analysis.wordCount.meetsTarget, false);
  assert.ok(analysis.wordCount.words < 250);
});

test("flags an opening that does not address the question", () => {
  const essay = [
    "High-speed trains have changed business travel between large cities in important ways.",
    "Passengers can work, read, or rest while moving from one station to another.",
    "Governments often compare ticket prices with the cost of building new tracks.",
    "A national rail company may also need new signals and better maintenance.",
    "Critics worry about delays and crowded carriages during holidays.",
    "Supporters answer that reliable timetables reduce pressure on short flights.",
    "In conclusion, rail investment should focus on punctuality and capacity rather than on slogans alone.",
    "Cities that already have dense networks gain the most from extra carriages.",
  ].join(" ");
  const analysis = scoreEssay({ text: essay, prompt: question, sourceName: "off-topic" });
  assert.ok(analysis.issues.some((item) => item.id === "question-not-addressed"));
  assert.equal(analysis.issues.some((item) => item.id === "question-restatement-long"), false);
});

test("does not invent question issues when no prompt is supplied", () => {
  const analysis = scoreEssay({ text: fixture("weak-essay.txt"), sourceName: "weak" });
  assert.equal(analysis.prompt, null);
  assert.equal(analysis.issues.some((item) => item.id === "question-restatement-long"), false);
  assert.equal(analysis.issues.some((item) => item.id === "question-not-addressed"), false);
});

test("flags a one-sentence body paragraph and a single block", () => {
  const oneSentence = [
    "Schools should teach practical skills as well as examination subjects in the senior years.",
    "Cooking is useful.",
    "In conclusion, a broader curriculum would help teenagers after they leave school and start work.",
  ].join("\n\n");
  const body = scoreEssay({ text: oneSentence, sourceName: "body" });
  assert.ok(body.issues.some((item) => item.id === "one-sentence-paragraph"));

  const wall = scoreEssay({ text: fixture("wall-essay.txt"), sourceName: "wall" });
  assert.equal(wall.paragraphs.count, 1);
  assert.equal(wall.paragraphs.structure, "single block");
  assert.ok(wall.issues.some((item) => item.id === "single-block"));
});

test("flags run-on sentences, fragments, and adjacent repetition from inline text", () => {
  const longSentence = `${"word ".repeat(40).trim()}.`;
  const analysis = scoreEssay({
    text: `Introduced claims need development in a full paragraph here today.\n\n${longSentence}\n\nYes. In conclusion, the final paragraph needs more than three words.`,
    sourceName: "long",
  });
  assert.ok(analysis.issues.some((item) => item.id === "run-on-sentence"));
  assert.ok(analysis.issues.some((item) => item.id === "fragment-sentence"));
});

test("returns only the empty-essay issue for blank input", () => {
  const analysis = scoreEssay({ text: " \n\n ", sourceName: "empty" });
  assert.deepEqual(analysis.issues.map((item) => item.id), ["empty-essay"]);
  assert.equal(analysis.wordCount.words, 0);
  assert.equal(analysis.strengths.length, 0);
});

test("measures prompt overlap on a copied opening", () => {
  const overlap = measurePromptOverlap(question.trim(), question);
  assert.ok(overlap.ratio > 0.9);
  assert.ok(overlap.openingWords >= 18);
  assert.ok(overlap.promptLemmas.length >= 4);
});
