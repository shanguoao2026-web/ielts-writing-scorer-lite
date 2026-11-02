import { CONCLUSION_MARKERS } from "./constants.js";
import { splitParagraphs, splitSentences, tokenizeWords } from "./text.js";
import type { ParagraphInfo, ParagraphMetrics, ParagraphRole } from "./types.js";

export function hasConclusionMarker(text: string): boolean {
  const haystack = text.replace(/\s+/g, " ").toLowerCase();
  return CONCLUSION_MARKERS.some((marker) => new RegExp(`\\b${marker}\\b`, "i").test(haystack));
}

export function openingExcerpt(paragraph: string, sentenceCount = 2): string {
  const sentences = splitSentences(paragraph);
  if (sentences.length === 0) return paragraph.trim();
  return sentences.slice(0, sentenceCount).join(" ");
}

export function describeStructure(paragraphs: ParagraphInfo[]): string {
  if (paragraphs.length === 0) return "empty";
  if (paragraphs.length === 1) return "single block";
  const parts: string[] = [];
  let bodyRun = 0;
  const flushBody = (): void => {
    if (bodyRun === 1) parts.push("body");
    else if (bodyRun > 1) parts.push(`${bodyRun} body paragraphs`);
    bodyRun = 0;
  };
  for (const paragraph of paragraphs) {
    if (paragraph.role === "body") {
      bodyRun += 1;
      continue;
    }
    flushBody();
    parts.push(paragraph.role === "unknown" ? "block" : paragraph.role);
  }
  flushBody();
  return parts.join(" + ");
}

function roleFor(index: number, count: number, text: string): ParagraphRole {
  if (count === 1) return "unknown";
  if (index === 0) return "introduction";
  if (index === count - 1 && count >= 3) return "conclusion";
  if (index === count - 1 && count === 2) {
    return hasConclusionMarker(text) ? "conclusion" : "body";
  }
  return "body";
}

export function classifyParagraphs(text: string): ParagraphMetrics {
  const blocks = splitParagraphs(text);
  const paragraphs: ParagraphInfo[] = blocks.map((block, index) => {
    const sentences = splitSentences(block);
    const role = roleFor(index, blocks.length, block);
    return {
      index,
      role,
      text: block,
      wordCount: tokenizeWords(block).length,
      sentenceCount: sentences.length,
      oneSentence: sentences.length === 1,
    };
  });
  const finalText = paragraphs[paragraphs.length - 1]?.text ?? "";
  return {
    count: paragraphs.length,
    paragraphs,
    hasIntroduction: paragraphs.some((paragraph) => paragraph.role === "introduction"),
    hasConclusion: paragraphs.some((paragraph) => paragraph.role === "conclusion"),
    bodyCount: paragraphs.filter((paragraph) => paragraph.role === "body").length,
    oneSentenceCount: paragraphs.filter((paragraph) => paragraph.oneSentence).length,
    conclusionMarkerInFinal: finalText.length > 0 && hasConclusionMarker(finalText),
    structure: describeStructure(paragraphs),
  };
}
