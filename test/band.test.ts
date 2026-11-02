import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreEssay } from "../src/analyze.js";
import { DISCLAIMER } from "../src/constants.js";
import type { BandRange } from "../src/types.js";
import { fixture } from "./helpers.js";

function isHalfStep(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value * 2 - Math.round(value * 2)) < 1e-9 && value >= 1 && value <= 9;
}

function assertRange(range: BandRange): void {
  assert.equal(isHalfStep(range.low), true);
  assert.equal(isHalfStep(range.high), true);
  assert.equal(range.high - range.low, 1);
  assert.ok(range.high <= 9);
  assert.ok(range.low >= 1);
}

function centre(range: BandRange): number {
  return (range.low + range.high) / 2;
}

test("band estimates are unofficial half-band ranges", () => {
  const analysis = scoreEssay({
    text: fixture("strong-essay.txt"),
    prompt: fixture("question.txt"),
    sourceName: "strong",
    now: new Date("2026-11-02T00:00:00.000Z"),
  });
  assert.equal(analysis.officialScore, false);
  assert.equal(analysis.bandEstimate.official, false);
  assert.equal(analysis.disclaimer, DISCLAIMER);
  assert.match(analysis.disclaimer, /not an IELTS score/);
  assert.equal(analysis.bandEstimate.criteria.length, 4);
  assertRange(analysis.bandEstimate.overall);
  for (const criterion of analysis.bandEstimate.criteria) {
    assertRange(criterion);
    assert.ok(criterion.rationale.length > 20);
  }
  assert.equal("score" in analysis.bandEstimate.overall, false);
  assert.equal(analysis.generatedAt, "2026-11-02T00:00:00.000Z");
});

test("the strong fixture outranks the weak fixture by at least one band", () => {
  const prompt = fixture("question.txt");
  const strong = scoreEssay({ text: fixture("strong-essay.txt"), prompt, sourceName: "strong" });
  const weak = scoreEssay({ text: fixture("weak-essay.txt"), prompt, sourceName: "weak" });
  assert.ok(strong.wordCount.words >= 250);
  assert.ok(weak.wordCount.words < 250);
  assert.equal(strong.paragraphs.structure, "introduction + 2 body paragraphs + conclusion");
  assert.ok(centre(strong.bandEstimate.overall) >= centre(weak.bandEstimate.overall) + 1);
  assert.ok(strong.issues.length < weak.issues.length);
  const strongIds = strong.issues.map((item) => item.id);
  assert.equal(strongIds.includes("overuse-and"), false);
  assert.equal(strongIds.includes("overuse-so"), false);
  assert.equal(strongIds.includes("question-restatement-long"), false);
  assert.equal(strongIds.includes("short-of-word-target"), false);
  assert.equal(strongIds.includes("far-below-word-target"), false);
  assert.equal(strongIds.includes("single-block"), false);
  assert.ok(strong.strengths.length > 0);
});
