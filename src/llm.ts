import type { Analysis, LlmClient } from "./types.js";
import { formatBandRange } from "./util.js";

export const DEFAULT_LLM_MODEL = "grok-4-1-fast-reasoning";
export const XAI_CHAT_URL = "https://api.x.ai/v1/chat/completions";

export const LLM_SYSTEM_PROMPT = [
  "You are a writing tutor helping a candidate practise IELTS Writing Task 2.",
  "You are not an examiner. You must not award an official band score or a single band number.",
  "Comment on argument relevance, development, examples, tone, and any grammar a surface checker would miss.",
  "Use the heuristic notes as context, but do not treat them as a mark.",
  "Write 3 or 4 short paragraphs of plain prose. No markdown headings and no bullet list of band scores.",
].join(" ");

export interface XaiClientOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  model?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

export function assertLlmConfigured(env: NodeJS.ProcessEnv = process.env): void {
  if (!env.XAI_API_KEY) {
    throw new Error("XAI_API_KEY is not set. Export it or omit --llm. See https://docs.x.ai");
  }
}

function extractContent(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Language model returned an unreadable response.");
  }
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Language model returned no choices.");
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return "";
      })
      .join("");
    if (text.trim()) return text.trim();
  }
  throw new Error("Language model returned an empty response.");
}

export function createXaiClient(options: XaiClientOptions = {}): LlmClient {
  const env = options.env ?? process.env;
  const apiKey = options.apiKey ?? env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set. Export it or omit --llm. See https://docs.x.ai");
  }
  const model = options.model ?? env.IELTS_LLM_MODEL ?? DEFAULT_LLM_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 60_000;

  return {
    async complete(system: string, user: string): Promise<string> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (typeof timer.unref === "function") timer.unref();
      try {
        const response = await fetchImpl(XAI_CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            max_tokens: 800,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
          signal: controller.signal,
        });
        const raw = await response.text();
        if (!response.ok) {
          throw new Error(`Language model request failed (${response.status}): ${raw.slice(0, 300)}`);
        }
        let data: unknown;
        try {
          data = JSON.parse(raw) as unknown;
        } catch {
          throw new Error("Language model returned invalid JSON.");
        }
        return extractContent(data);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Language model request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function buildLlmPrompt(analysis: Analysis): string {
  const range = formatBandRange(analysis.bandEstimate.overall.low, analysis.bandEstimate.overall.high);
  const issueLines =
    analysis.issues.length === 0
      ? ["- none"]
      : analysis.issues.map((item) => `- (${item.severity}) ${item.title}: ${item.detail}`);
  const essay = analysis.essay.length > 20_000 ? `${analysis.essay.slice(0, 20_000)}\n[essay truncated]` : analysis.essay;
  return [
    "Task question:",
    analysis.prompt ?? "(not supplied)",
    "",
    "Essay:",
    essay,
    "",
    "Heuristic notes (not an official score):",
    `Words: ${analysis.wordCount.words}`,
    `Paragraphs: ${analysis.paragraphs.structure}`,
    `Cohesive-device hits: ${analysis.cohesion.totalHits}; categories: ${analysis.cohesion.discourseCategoriesPresent.join(", ") || "none"}.`,
    `Unofficial band-estimate range: ${range}`,
    "Issues:",
    ...issueLines,
  ].join("\n");
}
