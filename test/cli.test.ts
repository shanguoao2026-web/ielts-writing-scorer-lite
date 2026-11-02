import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseArgs } from "../src/args.js";
import { fixture, projectRoot, runCli } from "./helpers.js";

test("parseArgs accepts equals form, short flags, and format case", () => {
  const args = parseArgs(["score", "--in=essay.txt", "-o", "out.html", "-p", "question.txt", "--format", "JSON", "--llm"]);
  assert.equal(args.command, "score");
  assert.equal(args.inputPath, "essay.txt");
  assert.equal(args.outputPath, "out.html");
  assert.equal(args.promptPath, "question.txt");
  assert.equal(args.format, "json");
  assert.equal(args.llm, true);
  assert.equal(parseArgs(["--help"]).command, "help");
  assert.equal(parseArgs(["-V"]).command, "version");
  assert.throws(() => parseArgs(["score"]), /Missing --in/);
  assert.throws(() => parseArgs(["score", "--in", "essay.txt", "--format", "yaml"]), /Unknown format/);
});

test("score --format json prints an unofficial document", () => {
  const result = runCli(["score", "--in", "fixtures/weak-essay.txt", "--prompt", "fixtures/question.txt", "--format", "json"]);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout) as {
    officialScore: boolean;
    disclaimer: string;
    issues: { id: string }[];
    wordCount: { words: number };
  };
  assert.equal(data.officialScore, false);
  assert.match(data.disclaimer, /not an IELTS score/);
  assert.ok(data.wordCount.words > 0);
  assert.ok(data.issues.some((issue) => issue.id === "question-restatement-long"));
  assert.equal(result.stdout.includes("Band-estimate:"), false);
});

test("score --out writes a self-contained HTML report and a terminal summary", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ielts-report-"));
  const out = path.join(dir, "report.html");
  const result = runCli([
    "score",
    "--in",
    "fixtures/strong-essay.txt",
    "--prompt",
    "fixtures/question.txt",
    "--out",
    out,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Band-estimate/);
  assert.match(result.stdout, /Wrote /);
  const html = readFileSync(out, "utf8");
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /not an IELTS score/);
  assert.match(html, /Unofficial/);
  assert.doesNotMatch(html, /<script/i);
});

test("html format without --out goes to stdout", () => {
  const result = runCli(["score", "--in", "fixtures/wall-essay.txt", "--format", "html"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /<!DOCTYPE html>/i);
  assert.match(result.stdout, /single block/);
});

test("missing file, unknown flag, and empty argv fail", () => {
  const missing = runCli(["score", "--in", "fixtures/missing-essay.txt"]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /File not found/);

  const unknown = runCli(["score", "--in", "fixtures/strong-essay.txt", "--nope"]);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /Unknown option/);

  const empty = runCli([]);
  assert.equal(empty.status, 1);
  assert.match(empty.stderr, /Usage:/);
});

test("help and version succeed", () => {
  const help = runCli(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /ielts-writing-scorer-lite score --in/);
  assert.match(help.stdout, /--format json/);
  assert.match(help.stdout, /not an IELTS score/i);

  const version = runCli(["--version"]);
  const pkg = JSON.parse(readFileSync(path.join(projectRoot(), "package.json"), "utf8")) as { version: string };
  assert.equal(version.status, 0);
  assert.equal(version.stdout.trim(), pkg.version);
});

test("rejects a binary file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ielts-bin-"));
  const file = path.join(dir, "essay.txt");
  writeFileSync(file, "hello\0world");
  const result = runCli(["score", "--in", file]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /binary/);
});

test("--llm without a key fails before it reports a score", () => {
  const env = { ...process.env };
  delete env.XAI_API_KEY;
  const result = runCli(["score", "--in", "fixtures/strong-essay.txt", "--llm"], env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /XAI_API_KEY/);
  assert.doesNotMatch(result.stdout, /Band-estimate/);
});

test("package metadata and docs stay aligned", () => {
  const root = projectRoot();
  const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
    name: string;
    version: string;
    license: string;
    bin: Record<string, string>;
    type: string;
  };
  assert.equal(pkg.name, "ielts-writing-scorer-lite");
  assert.equal(pkg.version, "0.1.0");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.bin["ielts-writing-scorer-lite"], "./dist/cli.js");
  assert.match(readFileSync(path.join(root, "LICENSE"), "utf8"), /MIT License/);
  assert.match(readFileSync(path.join(root, "CHANGELOG.md"), "utf8"), /## 0\.1\.0/);
  const readme = readFileSync(path.join(root, "README.md"), "utf8");
  assert.match(readme, /not an IELTS score/i);
  assert.match(readme, /word count/i);
  assert.match(readme, /cohesive/i);
  assert.match(readme, /--llm/);
  assert.match(readme, /ielts-writing-scorer-lite score --in/);
  assert.match(fixture("strong-essay.txt"), /In conclusion/);
  assert.match(fixture("weak-essay.txt"), /a lot/);
});
