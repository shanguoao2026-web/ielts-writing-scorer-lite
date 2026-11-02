import { FUNCTION_WORDS, IRREGULAR_LEMMAS, THRESHOLDS } from "./constants.js";
import type { WordCountMetrics } from "./types.js";
import { roundTo } from "./util.js";

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

export function normalizeInput(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function tokenizeWords(text: string): string[] {
  WORD_PATTERN.lastIndex = 0;
  return text.match(WORD_PATTERN) ?? [];
}

export function isContentWord(word: string): boolean {
  const lower = word.toLowerCase();
  if (lower.length <= 2) return false;
  if (lower.includes("'") || lower.includes("’")) return false;
  if (FUNCTION_WORDS.has(lower)) return false;
  if (/^\d+$/.test(lower)) return false;
  return true;
}

export function roughLemma(word: string): string {
  let value = word.toLowerCase();
  const irregular = IRREGULAR_LEMMAS[value];
  if (irregular) return irregular;
  if (value.length <= 3) return value;

  if (value.endsWith("ies") && value.length > 4) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ied") && value.length > 4) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith("ing") && value.length > 5) {
    let stem = value.slice(0, -3);
    if (/([b-df-hj-np-tv-z])\1$/i.test(stem)) stem = stem.slice(0, -1);
    return stem;
  }
  if (value.endsWith("ed") && value.length > 4) {
    let stem = value.slice(0, -2);
    if (/([b-df-hj-np-tv-z])\1$/i.test(stem)) stem = stem.slice(0, -1);
    return stem;
  }
  if (/(?:ches|shes|sses|xes|zes)$/.test(value) && value.length > 4) {
    return value.slice(0, -2);
  }
  if (value.endsWith("es") && value.length > 4 && !value.endsWith("ss") && !value.endsWith("us") && !value.endsWith("is")) {
    return value.slice(0, -1);
  }
  if (
    value.endsWith("s") &&
    !value.endsWith("ss") &&
    !value.endsWith("us") &&
    !value.endsWith("is") &&
    value.length > 3
  ) {
    return value.slice(0, -1);
  }
  return value;
}

export function contentLemmas(text: string): string[] {
  const lemmas: string[] = [];
  for (const word of tokenizeWords(text)) {
    if (!isContentWord(word)) continue;
    lemmas.push(roughLemma(word));
  }
  return lemmas;
}

export function splitSentences(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  const masked = trimmed
    .replace(/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|Fig|No|pp|a\.m|p\.m|e\.g|i\.e|U\.S|U\.K)\./gi, (match) =>
      match.replaceAll(".", "§"),
    )
    .replace(/(\d)\.(\d)/g, "$1§$2");
  const parts = masked
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.replaceAll("§", ".").trim())
    .filter((part) => part.length > 0 && !/^[.!?]+$/.test(part));
  return parts.length > 0 ? parts : [trimmed];
}

function collapseLines(block: string): string {
  return block.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ").trim();
}

function lineLooksLikeParagraph(line: string): boolean {
  return tokenizeWords(line).length >= 12 && /[.!?]["'”’)]*$/.test(line);
}

export function splitParagraphs(text: string): string[] {
  const normalized = normalizeInput(text).trim();
  if (!normalized) return [];
  const blocks = normalized
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
  if (blocks.length >= 2) return blocks.map(collapseLines);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length >= 3 && lines.every(lineLooksLikeParagraph)) return lines;
  return [collapseLines(normalized)];
}

export function buildWordCount(words: string[], sentences: string[], text: string): WordCountMetrics {
  const sentenceCount = sentences.length;
  const average = sentenceCount === 0 ? 0 : roundTo(words.length / sentenceCount, 1);
  return {
    words: words.length,
    sentences: sentenceCount,
    characters: text.trim().length,
    target: THRESHOLDS.wordTarget,
    meetsTarget: words.length >= THRESHOLDS.wordTarget,
    farBelow: words.length < THRESHOLDS.farBelowWords,
    averageSentenceLength: average,
  };
}
