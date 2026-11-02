import type { Analysis, Issue, ParagraphInfo } from "../types.js";
import { escapeHtml, formatBandRange, formatTimestamp, percent } from "../util.js";

const CSS = `
:root {
  --ink: #221e18;
  --muted: #625c52;
  --paper: #f3eee4;
  --sheet: #fffdf8;
  --line: #e4d8c6;
  --green: #1d4a38;
  --green-soft: #e6f1eb;
  --rust: #8d3d24;
  --rust-soft: #f8ece7;
  --gold: #7c6230;
  --gold-soft: #f7f1e2;
  --shadow: 0 18px 50px rgba(60, 42, 20, 0.08);
}
* { box-sizing: border-box; }
html { background: var(--paper); }
body {
  margin: 0;
  color: var(--ink);
  font-family: Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
  line-height: 1.5;
}
.sheet {
  max-width: 920px;
  margin: 28px auto;
  background: var(--sheet);
  border: 1px solid var(--line);
  box-shadow: var(--shadow);
}
.banner {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 36px 22px;
  border-top: 4px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}
.kicker, .label, th, .stamp, .role, .severity {
  font-family: "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.kicker { margin: 0 0 8px; color: var(--muted); font-size: 0.74rem; }
h1 { margin: 0; font-size: 2rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.15; }
.sub { margin: 8px 0 0; color: var(--muted); }
.stamp {
  align-self: flex-start;
  border: 2px solid var(--rust);
  color: var(--rust);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 8px 10px;
  transform: rotate(2deg);
}
main { padding: 8px 36px 36px; }
.disclaimer {
  margin: 22px 0;
  padding: 14px 16px;
  background: var(--gold-soft);
  border-left: 4px solid var(--gold);
}
.disclaimer p { margin: 6px 0 0; }
.hero { display: grid; grid-template-columns: minmax(200px, 280px) 1fr; gap: 28px; align-items: end; }
.hero .label { letter-spacing: 0.08em; }
.range { margin: 0; font-size: 4rem; line-height: 0.9; letter-spacing: -0.04em; color: var(--green); }
.hero h2, section h2 { font-size: 1.35rem; margin: 0 0 12px; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 22px 0 8px; }
.stat { border-top: 1px solid var(--line); padding-top: 8px; }
.stat b { display: block; font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.stat span, .muted { color: var(--muted); }
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.card, .issue, .category, .cell, .callout {
  border: 1px solid var(--line);
  background: #fff;
}
.card { padding: 14px 14px 12px; }
.card .range-sm { margin: 4px 0; font-size: 1.7rem; color: var(--green); }
.card p, .issue p, .callout p { margin: 8px 0 0; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
ul { margin: 0; padding-left: 1.1rem; }
li + li { margin-top: 8px; }
.issue { padding: 12px 14px; border-left: 4px solid var(--gold); }
.issue.warning { border-left-color: var(--rust); background: var(--rust-soft); }
.issue.note { border-left-color: var(--gold); background: #fffdf8; }
.severity { font-size: 0.68rem; color: var(--muted); }
.issue h3, .category h3, .cell h3 { margin: 4px 0 0; font-size: 1.05rem; }
.stack { display: grid; gap: 10px; }
section { margin-top: 32px; }
.meter { height: 8px; background: var(--line); margin-top: 8px; }
.meter span { display: block; height: 100%; background: var(--green); }
.meter.warn span { background: var(--rust); }
.map { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
.cell { padding: 12px; }
.role { font-size: 0.68rem; color: var(--green); }
.cell.conclusion .role { color: var(--gold); }
.cell.unknown .role { color: var(--rust); }
.bar { height: 6px; background: var(--green-soft); margin: 10px 0; }
.bar span { display: block; height: 100%; background: var(--green); }
.cell.conclusion .bar span { background: var(--gold); }
.cell.unknown .bar span { background: var(--rust); }
table { width: 100%; border-collapse: collapse; font-size: 0.98rem; }
th, td { text-align: left; padding: 8px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-size: 0.72rem; color: var(--muted); font-weight: 650; }
.categories { display: grid; gap: 12px; }
.category { padding: 12px 14px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.chip { font-family: "Segoe UI", system-ui, sans-serif; font-size: 0.85rem; background: var(--green-soft); padding: 3px 8px; }
.chip.empty { background: var(--paper); color: var(--muted); }
.rep { display: grid; grid-template-columns: minmax(120px, 180px) 1fr auto; gap: 8px; align-items: center; margin-top: 8px; }
.rep .track { height: 8px; background: var(--line); }
.rep .track span { display: block; height: 100%; background: var(--gold); }
.essay, .prompt {
  white-space: pre-wrap;
  font: inherit;
  background: #fff;
  border: 1px solid var(--line);
  padding: 16px;
}
footer { padding: 8px 36px 28px; color: var(--muted); font-size: 0.92rem; }
a { color: var(--green); }
@media (max-width: 720px) {
  .sheet { margin: 0; border: 0; }
  .banner, main, footer { padding-left: 18px; padding-right: 18px; }
  .hero, .stats, .cards, .columns { grid-template-columns: 1fr; }
  .range { font-size: 3.2rem; }
}
@media print {
  body { background: white; }
  .sheet { margin: 0; box-shadow: none; }
}
`;

function section(title: string, body: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function renderIssues(issues: Issue[]): string {
  if (issues.length === 0) {
    return `<p class="muted">No checklist rule triggered.</p>`;
  }
  return `<div class="stack">${issues
    .map(
      (item) =>
        `<article class="issue ${item.severity}"><div class="severity">${escapeHtml(item.severity)}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p></article>`,
    )
    .join("")}</div>`;
}

function excerpt(text: string, max = 170): string {
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  const trimmed = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced;
  return `${trimmed}…`;
}

function renderParagraph(paragraph: ParagraphInfo, maxWords: number): string {
  const width = Math.max(8, Math.round((paragraph.wordCount / maxWords) * 100));
  const preview = excerpt(paragraph.text);
  return `<article class="cell ${paragraph.role}"><div class="role">${escapeHtml(paragraph.role)} · ${paragraph.index + 1}</div><h3>${paragraph.wordCount} words</h3><div class="bar" aria-hidden="true"><span style="width:${width}%"></span></div><p>${paragraph.sentenceCount} sentence${paragraph.sentenceCount === 1 ? "" : "s"}${paragraph.oneSentence ? " · one sentence" : ""}</p><p class="muted">${escapeHtml(preview)}</p></article>`;
}

export function renderHtml(analysis: Analysis): string {
  const overall = formatBandRange(analysis.bandEstimate.overall.low, analysis.bandEstimate.overall.high);
  const wordPct = Math.max(0, Math.min(100, Math.round((analysis.wordCount.words / analysis.wordCount.target) * 100)));
  const wordClass = analysis.wordCount.meetsTarget ? "meter" : "meter warn";
  const maxWords = Math.max(...analysis.paragraphs.paragraphs.map((paragraph) => paragraph.wordCount), 1);
  const criteria = analysis.bandEstimate.criteria
    .map(
      (criterion) =>
        `<article class="card"><div class="label">${escapeHtml(criterion.name)}</div><p class="range-sm">${formatBandRange(criterion.low, criterion.high)}</p><p>${escapeHtml(criterion.rationale)}</p></article>`,
    )
    .join("");
  const strengths =
    analysis.strengths.length === 0
      ? `<p class="muted">No strength rule triggered. The checklist is the useful part of a weak script.</p>`
      : `<ul>${analysis.strengths.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  const categories = analysis.cohesion.categories
    .map((category) => {
      const chips =
        category.hits.length === 0
          ? `<span class="chip empty">none found</span>`
          : category.hits
              .map((hit) => `<span class="chip">${escapeHtml(hit.phrase)} ×${hit.count}</span>`)
              .join("");
      return `<article class="category"><h3>${escapeHtml(category.category)}</h3><p class="muted">${category.total} hit${category.total === 1 ? "" : "s"}</p><div class="chips">${chips}</div></article>`;
    })
    .join("");
  const repetitions =
    analysis.lexical.topRepetitions.length === 0
      ? `<p class="muted">No content word is repeated often enough to list.</p>`
      : analysis.lexical.topRepetitions
          .map((item) => {
            const width = Math.max(4, Math.min(100, Math.round(item.share * 100 * 4)));
            const label = item.surface === item.lemma ? item.surface : `${item.surface} → ${item.lemma}`;
            return `<div class="rep"><span>${escapeHtml(label)}</span><div class="track" aria-hidden="true"><span style="width:${width}%"></span></div><span>×${item.count} · ${percent(item.share)}</span></div>`;
          })
          .join("");
  const markers =
    analysis.grammar.complexMarkers.length === 0
      ? `<p class="muted">None of the tracked clause or linking markers appeared.</p>`
      : `<div class="chips">${analysis.grammar.complexMarkers
          .map((marker) => `<span class="chip">${escapeHtml(marker.phrase)} ×${marker.count}</span>`)
          .join("")}</div>`;
  const informal =
    analysis.grammar.informalHits.length === 0
      ? "None from the informal list."
      : analysis.grammar.informalHits.map((hit) => `${hit.phrase} ×${hit.count}`).join(", ");
  const punctuation =
    analysis.grammar.punctuationIssues.length === 0 ? "None from the surface checks." : analysis.grammar.punctuationIssues.join("; ");
  const llm = analysis.llmFeedback
    ? section(
        "Further comments from a language model",
        `<div class="callout"><p class="muted">Not an examiner. This text was produced because --llm was set. It can be wrong, and it is not an IELTS band.</p><div class="essay">${escapeHtml(analysis.llmFeedback)}</div></div>`,
      )
    : "";
  const prompt = analysis.prompt
    ? section("Task question", `<div class="prompt">${escapeHtml(analysis.prompt)}</div>`)
    : "";
  const paragraphs =
    analysis.paragraphs.paragraphs.length === 0
      ? `<p class="muted">No paragraphs.</p>`
      : `<div class="map">${analysis.paragraphs.paragraphs.map((paragraph) => renderParagraph(paragraph, maxWords)).join("")}</div>`;

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<meta name="generator" content="${escapeHtml(analysis.tool)} ${escapeHtml(analysis.version)}">`,
    `<title>${escapeHtml(analysis.sourceName)} · unofficial Task 2 report</title>`,
    `<style>${CSS}</style>`,
    "</head>",
    "<body>",
    '<article class="sheet">',
    '<header class="banner">',
    "<div>",
    '<p class="kicker">IELTS Writing Task 2 · practice report</p>',
    `<h1>${escapeHtml(analysis.tool)}</h1>`,
    `<p class="sub">${escapeHtml(analysis.sourceName)} · ${escapeHtml(formatTimestamp(analysis.generatedAt))} · ${escapeHtml(analysis.version)}</p>`,
    "</div>",
    '<div class="stamp">Unofficial</div>',
    "</header>",
    "<main>",
    `<div class="disclaimer"><div class="label">Read this first</div><p>${escapeHtml(analysis.disclaimer)}</p></div>`,
    '<section class="hero">',
    `<div><p class="label">${escapeHtml(analysis.bandEstimate.label)}</p><p class="range">${overall}</p></div>`,
    "<div><h2>Band-estimate</h2><p>Four rough ranges, each shown as a centre plus or minus half a band. The centre is clamped so this tool will not pretend to a 9, or to a score an examiner would sign. Argument quality and real grammar errors are mostly invisible to these rules.</p></div>",
    "</section>",
    '<div class="stats">',
    `<div class="stat"><b>${analysis.wordCount.words}</b><span>words / ${analysis.wordCount.target}+</span><div class="${wordClass}"><span style="width:${wordPct}%"></span></div></div>`,
    `<div class="stat"><b>${analysis.wordCount.sentences}</b><span>sentences · avg ${analysis.wordCount.averageSentenceLength}</span></div>`,
    `<div class="stat"><b>${analysis.paragraphs.count}</b><span>${escapeHtml(analysis.paragraphs.structure)}</span></div>`,
    `<div class="stat"><b>${analysis.lexical.lexicalDiversity.toFixed(2)}</b><span>rough lemma diversity</span></div>`,
    "</div>",
    section("Criterion ranges", `<div class="cards">${criteria}</div>`),
    '<div class="columns">',
    section("What is working", strengths),
    section("Issue checklist", renderIssues(analysis.issues)),
    "</div>",
    section(
      "Length and paragraphs",
      `<p>Paragraphs are blank-line blocks. If the file has no blank lines, consecutive long lines that each end a sentence are treated as paragraphs. The first block is the introduction and, once there are three or more blocks, the last is the conclusion. That is a position guess, not a reading of the argument.</p>${paragraphs}`,
    ),
    section(
      "Cohesive devices",
      `<p>${analysis.cohesion.totalHits} tracked linkers, ${analysis.cohesion.densityPer100Words} per 100 words. Missing discourse categories: ${escapeHtml(analysis.cohesion.discourseCategoriesMissing.join(", ") || "none")}. "and" and "so" are not in this inventory; overuse of those two is a checklist item. Short words such as "while" and "since" can be ordinary vocabulary, not only linkers.</p><div class="categories">${categories}</div>`,
    ),
    section(
      "Lexical variety",
      `<p>Type-token ratio ${analysis.lexical.typeTokenRatio} (${analysis.lexical.uniqueTokens} unique surface tokens / ${analysis.lexical.tokens}). Content lemmas ${analysis.lexical.uniqueContentLemmas} / ${analysis.lexical.contentWords} content words. Lemmas are rough suffix strips (plural, -ed, -ing), plus a few irregulars such as people → person. They are not a dictionary.</p>${repetitions}`,
    ),
    section(
      "Sentence and punctuation signals",
      `<p>Average length ${analysis.grammar.averageLength} words, spread ${analysis.grammar.lengthStdev}. Short sentences (≤4 words): ${analysis.grammar.shortSentences}. Long sentences (≥40 words): ${analysis.grammar.longSentences}. Informal wording: ${escapeHtml(informal)} Punctuation: ${escapeHtml(punctuation)} Lowercase pronoun "i": ${analysis.grammar.lowercasePronounI}. These signals do not find agreement errors or article errors.</p>${markers}`,
    ),
    llm,
    prompt,
    section("Essay", `<div class="essay">${escapeHtml(analysis.essay || "(empty)")}</div>`),
    "</main>",
    `<footer><p>${escapeHtml(analysis.disclaimer)}</p><p>Generated by ${escapeHtml(analysis.tool)} ${escapeHtml(analysis.version)}. Self-contained file: no remote fonts, scripts, or stylesheets.</p></footer>`,
    "</article>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
