import { BAND_LABEL, THRESHOLDS } from "./constants.js";
import type {
  BandEstimate,
  BandRange,
  CohesionMetrics,
  CriterionEstimate,
  GrammarSignals,
  Issue,
  LexicalMetrics,
  ParagraphMetrics,
  WordCountMetrics,
} from "./types.js";
import { clamp, roundHalf } from "./util.js";

export interface BandInput {
  wordCount: WordCountMetrics;
  paragraphs: ParagraphMetrics;
  cohesion: CohesionMetrics;
  lexical: LexicalMetrics;
  grammar: GrammarSignals;
  issues: Issue[];
  promptPresent: boolean;
}

function hasIssue(issues: Issue[], id: string): boolean {
  return issues.some((issue) => issue.id === id);
}

function spread(centre: number): BandRange {
  const rounded = roundHalf(clamp(centre, THRESHOLDS.bandCentreMin, THRESHOLDS.bandCentreMax));
  return {
    low: roundHalf(rounded - THRESHOLDS.bandSpread),
    high: roundHalf(rounded + THRESHOLDS.bandSpread),
  };
}

function scoreTaskResponse(input: BandInput): number {
  let score = 5;
  const words = input.wordCount.words;
  if (words < 100) score -= 2.5;
  else if (words < THRESHOLDS.farBelowWords) score -= 2;
  else if (words < 200) score -= 1.5;
  else if (words < THRESHOLDS.wordTarget) score -= 0.75;
  else if (words < 280) score += 0.25;
  else if (words <= 380) score += 0.75;
  else if (words <= THRESHOLDS.longEssayWords) score += 0.5;
  else score += 0.25;

  if (
    input.paragraphs.count >= 4 &&
    input.paragraphs.count <= 5 &&
    input.paragraphs.hasIntroduction &&
    input.paragraphs.hasConclusion
  ) {
    score += 0.75;
  } else if (input.paragraphs.count === 3) score += 0.25;
  else if (input.paragraphs.count < 3) score -= 1;

  if (!input.paragraphs.hasConclusion) score -= 0.5;
  if (hasIssue(input.issues, "question-not-addressed")) score -= 0.75;
  if (hasIssue(input.issues, "question-restatement-long")) score -= 0.5;
  if (hasIssue(input.issues, "no-stance")) score -= 0.35;
  else score += 0.25;
  if (hasIssue(input.issues, "short-conclusion")) score -= 0.25;
  return score;
}

function scoreCoherence(input: BandInput): number {
  let score = 5;
  const count = input.paragraphs.count;
  if (count >= 4 && count <= 5) score += 1;
  else if (count === 3) score += 0.25;
  else if (count === 2) score -= 0.75;
  else if (count <= 1) score -= 1.5;
  else score -= 0.5;

  const thinBodies = input.paragraphs.paragraphs.filter(
    (paragraph) => paragraph.oneSentence && paragraph.role === "body",
  ).length;
  score -= Math.min(1.5, thinBodies * 0.5);
  if (hasIssue(input.issues, "short-conclusion")) score -= 0.35;

  const categories = input.cohesion.discourseCategoriesPresent.length;
  if (categories >= 4) score += 0.75;
  else if (categories === 3) score += 0.4;
  else if (categories <= 1) score -= 1;

  const density = input.cohesion.densityPer100Words;
  if (density >= 1.2 && density <= 6) score += 0.35;
  else if (density < 0.6) score -= 0.5;
  else if (density > 8) score -= 0.35;

  if (hasIssue(input.issues, "overuse-and")) score -= 0.4;
  if (hasIssue(input.issues, "overuse-so")) score -= 0.35;
  if (input.paragraphs.conclusionMarkerInFinal) score += 0.25;
  return score;
}

function scoreLexical(input: BandInput): number {
  let score = 5;
  const diversity = input.lexical.lexicalDiversity;
  const trust = input.lexical.contentWords >= 80 ? 1 : input.lexical.contentWords >= 40 ? 0.6 : 0.3;
  if (input.lexical.contentWords === 0) return THRESHOLDS.bandCentreMin;
  if (diversity < 0.4) score -= 1;
  else if (diversity < 0.55) score += 0;
  else if (diversity < 0.7) score += 0.5 * trust + 0.25;
  else score += 1 * trust + 0.25;

  const heavy = input.lexical.topRepetitions.filter(
    (item) =>
      (item.count >= THRESHOLDS.repetitionCount && item.share >= THRESHOLDS.repetitionShare) ||
      item.count >= THRESHOLDS.repetitionHardCount,
  );
  if (heavy.length >= 1) score -= 0.5;
  if (heavy.length >= 2) score -= 0.5;
  if (input.grammar.informalHits.length > 0) score -= 0.5;
  if (input.lexical.typeTokenRatio < 0.35 && input.lexical.tokens >= 100) score -= 0.5;
  return score;
}

function scoreGrammar(input: BandInput): number {
  if (input.grammar.sentenceCount === 0) return THRESHOLDS.bandCentreMin;
  let score = 5.25;
  const average = input.grammar.averageLength;
  if (input.grammar.sentenceCount >= 8 && average >= 14 && average <= 28) score += 0.5;
  else if (average > 0 && average < 12) score -= 0.75;
  else if (average > 32) score -= 0.5;

  if (input.grammar.lengthStdev >= 4 && input.grammar.lengthStdev <= 14) score += 0.35;
  else if (input.grammar.lengthStdev < 2.5 && input.grammar.sentenceCount >= 5) score -= 0.35;

  if (input.grammar.complexMarkerTypes >= 4) score += 0.6;
  else if (input.grammar.complexMarkerTypes >= 2) score += 0.25;
  else score -= 0.5;

  score -= Math.min(1, input.grammar.longSentences * 0.25);
  score -= Math.min(0.75, input.grammar.punctuationIssues.length * 0.25);
  if (input.grammar.informalHits.length > 0) score -= 0.35;
  if (input.grammar.lowercasePronounI >= 2) score -= 0.25;
  if (input.grammar.shortSentences >= 3) score -= 0.25;
  // Long coordinated sentences can look like a healthy average length.
  if (hasIssue(input.issues, "overuse-and")) score -= 0.5;
  if (hasIssue(input.issues, "overuse-so")) score -= 0.35;
  if (hasIssue(input.issues, "sentence-initial-and-so")) score -= 0.25;
  return score;
}

function rationaleTask(input: BandInput): string {
  const parts: string[] = [];
  if (input.wordCount.meetsTarget) {
    parts.push(`${input.wordCount.words} words meets the usual 250-word Task 2 length.`);
  } else {
    parts.push(`${input.wordCount.words} words is short of the usual 250-word Task 2 length.`);
  }
  if (input.paragraphs.count >= 4 && input.paragraphs.hasIntroduction && input.paragraphs.hasConclusion) {
    parts.push("Paragraph breaks resemble an introduction, body, and conclusion.");
  } else if (input.paragraphs.count < 3) {
    parts.push("There are too few paragraph breaks to show a developed response.");
  } else {
    parts.push(`Structure reads as ${input.paragraphs.structure}.`);
  }
  if (hasIssue(input.issues, "question-restatement-long")) {
    parts.push("The opening appears to repeat the question at length.");
  } else if (hasIssue(input.issues, "question-not-addressed")) {
    parts.push("The opening shares little wording with the question, so task focus is uncertain.");
  } else if (input.promptPresent) {
    parts.push("The opening was compared with the question wording.");
  }
  if (hasIssue(input.issues, "no-stance")) parts.push("A direct position is hard to find.");
  return parts.join(" ");
}

function rationaleCoherence(input: BandInput): string {
  const present = input.cohesion.discourseCategoriesPresent.join(", ") || "none";
  return `Paragraph shape is "${input.paragraphs.structure}". Cohesive-device hits: ${input.cohesion.totalHits} (${input.cohesion.densityPer100Words} per 100 words) across ${present}. Basic coordinators such as "and" and "so" are checked separately from that inventory.`;
}

function rationaleLexical(input: BandInput): string {
  return `Type-token ratio is ${input.lexical.typeTokenRatio} and rough content-lemma diversity is ${input.lexical.lexicalDiversity} (${input.lexical.uniqueContentLemmas} lemmas in ${input.lexical.contentWords} content words). Suffix stripping is approximate, so this is a repetition check, not a vocabulary level.`;
}

function rationaleGrammar(input: BandInput): string {
  const coordination =
    hasIssue(input.issues, "overuse-and") || hasIssue(input.issues, "overuse-so")
      ? " Heavy coordination with \"and\" or \"so\" narrows the range, because many clauses are only chained."
      : "";
  const markers = input.grammar.complexMarkerTypes;
  const markerSentence =
    markers === 0
      ? "No clause or linking markers were found."
      : `${markers} clause or linking marker${markers === 1 ? " was" : "s were"} found.`;
  return `Average sentence length is ${input.grammar.averageLength} words (spread ${input.grammar.lengthStdev}). ${markerSentence} This does not detect grammatical errors; the range stays wide on purpose.${coordination}`;
}

export function estimateBand(input: BandInput): BandEstimate {
  const criteria: CriterionEstimate[] = [
    {
      id: "task-response",
      name: "Task response",
      ...spread(scoreTaskResponse(input)),
      rationale: rationaleTask(input),
    },
    {
      id: "coherence-cohesion",
      name: "Coherence and cohesion",
      ...spread(scoreCoherence(input)),
      rationale: rationaleCoherence(input),
    },
    {
      id: "lexical-resource",
      name: "Lexical resource",
      ...spread(scoreLexical(input)),
      rationale: rationaleLexical(input),
    },
    {
      id: "grammatical-range",
      name: "Grammatical range and accuracy",
      ...spread(scoreGrammar(input)),
      rationale: rationaleGrammar(input),
    },
  ];
  const mid = criteria.reduce((sum, criterion) => sum + (criterion.low + criterion.high) / 2, 0) / criteria.length;
  return {
    label: BAND_LABEL,
    official: false,
    overall: spread(mid),
    criteria,
  };
}
