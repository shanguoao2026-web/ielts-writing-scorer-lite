import { COMPLEX_MARKERS, INFORMAL_PHRASES, THRESHOLDS } from "./constants.js";
import { splitSentences, tokenizeWords } from "./text.js";
import type { GrammarSignals, InformalHit, MarkerHit } from "./types.js";
import { escapeRegExp, roundTo } from "./util.js";

function stdev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function countPhrase(text: string, phrase: string): number {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "gi");
  return [...text.matchAll(pattern)].length;
}

export function punctuationProblems(text: string): string[] {
  const problems: string[] = [];
  const masked = text
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig|No|pp|a\.m|p\.m|e\.g|i\.e|U\.S|U\.K)\./gi, (match) =>
      match.replaceAll(".", "§"),
    )
    .replace(/(\d)\.(\d)/g, "$1§$2");
  if (/\s+[,.;:!?]/.test(masked)) problems.push("space before punctuation");
  if (/!!|\?\?|,,/.test(masked)) problems.push("repeated punctuation");
  if (/[.!?]\s+[a-z]/.test(masked)) problems.push("possible missing capital after a sentence");
  return problems;
}

export function lowercasePronounI(text: string): number {
  return [...text.matchAll(/(^|[^A-Za-z])i(?![A-Za-z'.])/g)].length;
}

export function adjacentRepetitions(words: string[]): string[] {
  const found: string[] = [];
  for (let index = 1; index < words.length; index += 1) {
    const current = words[index]?.toLowerCase() ?? "";
    const previous = words[index - 1]?.toLowerCase() ?? "";
    if (current.length >= 2 && current === previous) found.push(current);
  }
  return [...new Set(found)];
}

export function analyzeGrammar(text: string): GrammarSignals {
  const sentences = splitSentences(text);
  const lengths = sentences.map((sentence) => tokenizeWords(sentence).length);
  const average = lengths.length === 0 ? 0 : roundTo(lengths.reduce((sum, value) => sum + value, 0) / lengths.length, 1);
  const haystack = text.replace(/\s+/g, " ");
  const complexMarkers: MarkerHit[] = COMPLEX_MARKERS.map((phrase) => ({
    phrase,
    count: countPhrase(haystack, phrase),
  })).filter((hit) => hit.count > 0);
  const informalHits: InformalHit[] = INFORMAL_PHRASES.map((phrase) => ({
    phrase,
    count: countPhrase(haystack, phrase),
  })).filter((hit) => hit.count > 0);
  return {
    sentenceCount: sentences.length,
    averageLength: average,
    lengthStdev: roundTo(stdev(lengths), 2),
    shortSentences: lengths.filter((length) => length > 0 && length <= THRESHOLDS.fragmentMaxWords).length,
    longSentences: lengths.filter((length) => length >= THRESHOLDS.runOnWords).length,
    complexMarkers,
    complexMarkerTypes: complexMarkers.length,
    punctuationIssues: punctuationProblems(text),
    informalHits,
    lowercasePronounI: lowercasePronounI(text),
    adjacentRepetitions: adjacentRepetitions(tokenizeWords(text)),
  };
}
