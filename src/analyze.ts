import { estimateBand } from "./band.js";
import { buildChecklist } from "./checklist.js";
import { analyzeCohesion } from "./cohesion.js";
import { DISCLAIMER, TOOL_NAME } from "./constants.js";
import { analyzeGrammar } from "./grammar.js";
import { analyzeLexical } from "./lexical.js";
import { buildLlmPrompt, createXaiClient, LLM_SYSTEM_PROMPT } from "./llm.js";
import { classifyParagraphs } from "./paragraphs.js";
import { buildWordCount, normalizeInput, splitSentences, tokenizeWords } from "./text.js";
import type { Analysis, AnalyzeInput, ScoreInput } from "./types.js";
import { readVersion } from "./version.js";

export function scoreEssay(input: ScoreInput): Analysis {
  const text = normalizeInput(input.text).trim();
  const promptText = input.prompt == null ? "" : normalizeInput(input.prompt).trim();
  const prompt = promptText.length > 0 ? promptText : null;
  const paragraphs = classifyParagraphs(text);
  const words = tokenizeWords(text);
  const sentenceText = paragraphs.paragraphs.map((paragraph) => paragraph.text).join(" ");
  const grammarSource = sentenceText.length > 0 ? sentenceText : text;
  const sentences = splitSentences(grammarSource);
  const wordCount = buildWordCount(words, sentences, text);
  const cohesion = analyzeCohesion(text, words.length);
  const lexical = analyzeLexical(words);
  const grammar = analyzeGrammar(grammarSource);
  const { issues, strengths } = buildChecklist({
    text,
    prompt,
    wordCount,
    paragraphs,
    cohesion,
    lexical,
    grammar,
  });
  const bandEstimate = estimateBand({
    wordCount,
    paragraphs,
    cohesion,
    lexical,
    grammar,
    issues,
    promptPresent: prompt !== null,
  });

  return {
    tool: TOOL_NAME,
    version: input.version ?? readVersion(),
    task: "IELTS Writing Task 2",
    officialScore: false,
    disclaimer: DISCLAIMER,
    sourceName: input.sourceName?.trim() || "essay",
    generatedAt: (input.now ?? new Date()).toISOString(),
    prompt,
    essay: text,
    wordCount,
    paragraphs,
    cohesion,
    lexical,
    grammar,
    issues,
    strengths,
    bandEstimate,
    llmFeedback: null,
  };
}

export async function analyzeEssay(input: AnalyzeInput): Promise<Analysis> {
  const analysis = scoreEssay(input);
  if (!input.llm) return analysis;
  const client = input.llmClient ?? createXaiClient();
  const llmFeedback = await client.complete(LLM_SYSTEM_PROMPT, buildLlmPrompt(analysis));
  return { ...analysis, llmFeedback };
}
