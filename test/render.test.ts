import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreEssay } from "../src/analyze.js";
import { renderHtml } from "../src/render/html.js";
import { renderJson } from "../src/render/json.js";
import { renderTerminal } from "../src/render/terminal.js";
import { escapeHtml } from "../src/util.js";
import { fixture } from "./helpers.js";

test("escapeHtml encodes markup", () => {
  assert.equal(escapeHtml(`<script>"&'</script>`), "&lt;script&gt;&quot;&amp;&#39;&lt;/script&gt;");
});

test("HTML report is self-contained and escapes essay markup", () => {
  const analysis = scoreEssay({
    text: `Schools should publish <script>alert("xss")</script> results & more.\n\nA body paragraph develops the claim with a reason and a concrete example from a local library.\n\nIn conclusion, the essay closes the argument with a direct position and a short summary of the reason.`,
    prompt: `Should schools publish <b>results</b>?`,
    sourceName: `essay<script>.txt`,
    now: new Date("2026-11-02T00:00:00.000Z"),
  });
  const html = renderHtml(analysis);
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /<style>/);
  assert.match(html, /not an IELTS score/);
  assert.match(html, /Band-estimate/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.doesNotMatch(html, /<script>alert/i);
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /@import/);
  assert.doesNotMatch(html, /url\(\s*["']?https?:/i);
  assert.doesNotMatch(html, /\s(?:src|href)\s*=\s*["']https?:/i);
  assert.match(html, /essay&lt;script&gt;\.txt|essay&lt;script&gt;\.txt/);
  assert.match(html, /&lt;b&gt;results&lt;\/b&gt;/);
});

test("terminal and JSON expose the same unofficial range", () => {
  const analysis = scoreEssay({
    text: fixture("strong-essay.txt"),
    prompt: fixture("question.txt"),
    sourceName: "fixtures/strong-essay.txt",
  });
  const terminal = renderTerminal(analysis);
  assert.match(terminal, /Band-estimate: \d\.\d–\d\.\d/);
  assert.match(terminal, /not an IELTS score/);
  assert.match(terminal, /Words: \d+ \/ 250\+/);
  const parsed = JSON.parse(renderJson(analysis)) as { officialScore: boolean; bandEstimate: { overall: { low: number } } };
  assert.equal(parsed.officialScore, false);
  assert.equal(parsed.bandEstimate.overall.low, analysis.bandEstimate.overall.low);
  assert.match(renderJson(analysis), /"task": "IELTS Writing Task 2"/);
});
