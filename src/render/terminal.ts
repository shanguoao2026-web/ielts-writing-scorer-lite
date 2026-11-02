import type { Analysis } from "../types.js";
import { formatBandRange, percent } from "../util.js";

function pad(label: string, width: number): string {
  return label.length >= width ? label : label + " ".repeat(width - label.length);
}

export function renderTerminal(analysis: Analysis): string {
  const lines: string[] = [];
  const overall = formatBandRange(analysis.bandEstimate.overall.low, analysis.bandEstimate.overall.high);
  lines.push(`${analysis.tool} ${analysis.version}`);
  lines.push(analysis.disclaimer);
  lines.push("");
  lines.push(`Source: ${analysis.sourceName}`);
  if (analysis.prompt) lines.push("Prompt: supplied");
  lines.push(
    `Words: ${analysis.wordCount.words} / ${analysis.wordCount.target}+    Sentences: ${analysis.wordCount.sentences}    Paragraphs: ${analysis.paragraphs.count} (${analysis.paragraphs.structure})`,
  );
  const discourseHits = analysis.cohesion.categories
    .filter((category) => category.category !== "stance")
    .reduce((sum, category) => sum + category.total, 0);
  lines.push(
    `Lexical diversity (rough lemmas): ${analysis.lexical.lexicalDiversity.toFixed(2)}    Discourse linkers: ${discourseHits} across ${analysis.cohesion.discourseCategoriesPresent.length} of 5 categories`,
  );
  lines.push("");
  lines.push(`Band-estimate: ${overall}`);
  lines.push(analysis.bandEstimate.label);
  const width = Math.max(...analysis.bandEstimate.criteria.map((criterion) => criterion.name.length));
  for (const criterion of analysis.bandEstimate.criteria) {
    lines.push(
      `  ${pad(criterion.name, width)}  ${formatBandRange(criterion.low, criterion.high)}`,
    );
  }

  if (analysis.strengths.length > 0) {
    lines.push("");
    lines.push("Strengths");
    for (const strength of analysis.strengths) lines.push(`  • ${strength}`);
  }

  lines.push("");
  if (analysis.issues.length === 0) {
    lines.push("Checklist: no rule triggered.");
  } else {
    lines.push(`Checklist (${analysis.issues.length})`);
    for (const item of analysis.issues) {
      lines.push(`  [${item.severity}] ${item.title}`);
      lines.push(`    ${item.detail}`);
    }
  }

  if (analysis.lexical.topRepetitions.length > 0) {
    lines.push("");
    lines.push("Most repeated content words");
    for (const item of analysis.lexical.topRepetitions.slice(0, 5)) {
      const label = item.surface === item.lemma ? item.surface : `${item.surface} (lemma ${item.lemma})`;
      lines.push(`  ${label} ×${item.count} (${percent(item.share)} of content words)`);
    }
  }

  if (analysis.llmFeedback) {
    lines.push("");
    lines.push("Language-model comments (not an examiner)");
    lines.push(analysis.llmFeedback);
  }

  return lines.join("\n");
}
