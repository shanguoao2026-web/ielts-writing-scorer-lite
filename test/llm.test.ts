import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { analyzeEssay, scoreEssay } from "../src/analyze.js";
import { loadDotEnv } from "../src/io.js";
import { buildLlmPrompt, createXaiClient, DEFAULT_LLM_MODEL, LLM_SYSTEM_PROMPT, XAI_CHAT_URL } from "../src/llm.js";

test("system prompt refuses an official band", () => {
  assert.match(LLM_SYSTEM_PROMPT, /not an examiner/i);
  assert.match(LLM_SYSTEM_PROMPT, /must not award an official band/i);
});

test("buildLlmPrompt includes the essay and the heuristic range", () => {
  const analysis = scoreEssay({ text: "Unique zebra sentence about libraries and funding.", sourceName: "z" });
  const prompt = buildLlmPrompt(analysis);
  assert.match(prompt, /Unique zebra sentence/);
  assert.match(prompt, /Unofficial band-estimate range/);
});

test("createXaiClient posts to the xAI chat completions endpoint", async () => {
  let capturedUrl = "";
  let capturedAuth = "";
  let capturedBody = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    const headers = new Headers(init?.headers);
    capturedAuth = headers.get("authorization") ?? "";
    capturedBody = String(init?.body ?? "");
    return new Response(
      JSON.stringify({ choices: [{ message: { content: "  Look at the library example.  " } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };
  const client = createXaiClient({ fetchImpl, apiKey: "test-key", env: {} });
  const text = await client.complete("system", "user");
  assert.equal(text, "Look at the library example.");
  assert.equal(capturedUrl, XAI_CHAT_URL);
  assert.equal(capturedAuth, "Bearer test-key");
  const body = JSON.parse(capturedBody) as { model: string; messages: { role: string }[] };
  assert.equal(body.model, DEFAULT_LLM_MODEL);
  assert.equal(body.messages.length, 2);
});

test("createXaiClient reports HTTP failures and empty payloads", async () => {
  const failing: typeof fetch = async () => new Response("bad key", { status: 401 });
  await assert.rejects(
    () => createXaiClient({ fetchImpl: failing, apiKey: "k" }).complete("s", "u"),
    /401/,
  );
  const empty: typeof fetch = async () => new Response(JSON.stringify({ choices: [] }), { status: 200 });
  await assert.rejects(
    () => createXaiClient({ fetchImpl: empty, apiKey: "k" }).complete("s", "u"),
    /no choices/,
  );
});

test("createXaiClient throws when the API key is missing", () => {
  assert.throws(() => createXaiClient({ apiKey: "", env: {} }), /XAI_API_KEY/);
  assert.throws(() => createXaiClient({ env: {} }), /XAI_API_KEY/);
});

test("analyzeEssay uses an injected client and does not call fetch", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("network disabled");
  };
  try {
    const analysis = await analyzeEssay({
      text: "Libraries deserve stable funding because communities rely on them every week.",
      llm: true,
      llmClient: {
        async complete() {
          return "Develop the funding example.";
        },
      },
    });
    assert.equal(analysis.llmFeedback, "Develop the funding example.");
    const offline = await analyzeEssay({
      text: "Libraries deserve stable funding because communities rely on them every week.",
    });
    assert.equal(offline.llmFeedback, null);
  } finally {
    globalThis.fetch = original;
  }
});

test("loadDotEnv fills missing keys and does not override existing ones", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ielts-env-"));
  const file = path.join(dir, ".env");
  writeFileSync(file, "# comment\nXAI_API_KEY=\"abc\"\nIELTS_LLM_MODEL=custom\nOTHER=1\n");
  const env: NodeJS.ProcessEnv = { OTHER: "keep" };
  loadDotEnv(file, env);
  assert.equal(env.XAI_API_KEY, "abc");
  assert.equal(env.IELTS_LLM_MODEL, "custom");
  assert.equal(env.OTHER, "keep");
  loadDotEnv(file, env);
  assert.equal(env.XAI_API_KEY, "abc");
});
