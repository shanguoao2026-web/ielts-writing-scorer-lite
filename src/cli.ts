#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeEssay } from "./analyze.js";
import { CliError, helpText, parseArgs } from "./args.js";
import { assertLlmConfigured } from "./llm.js";
import { loadDotEnv, readTextFile, writeTextFile } from "./io.js";
import { renderHtml } from "./render/html.js";
import { renderJson } from "./render/json.js";
import { renderTerminal } from "./render/terminal.js";
import { readVersion } from "./version.js";

export async function main(argv: string[]): Promise<number> {
  try {
    if (argv.length === 0) {
      process.stderr.write(`${helpText()}\n`);
      return 1;
    }
    const args = parseArgs(argv);
    if (args.command === "help") {
      process.stdout.write(`${helpText()}\n`);
      return 0;
    }
    if (args.command === "version") {
      process.stdout.write(`${readVersion()}\n`);
      return 0;
    }

    if (args.llm) {
      loadDotEnv(resolve(process.cwd(), ".env"));
      assertLlmConfigured();
    }

    const inputPath = args.inputPath;
    if (!inputPath) throw new CliError("Missing --in <essay.txt>.");
    const essay = readTextFile(inputPath);
    const prompt = args.promptPath ? readTextFile(args.promptPath) : null;
    const analysis = await analyzeEssay({
      text: essay,
      prompt,
      sourceName: inputPath,
      llm: args.llm,
    });

    if (args.format === "json") {
      const json = `${renderJson(analysis)}\n`;
      process.stdout.write(json);
      if (args.outputPath) {
        writeTextFile(args.outputPath, json);
        process.stderr.write(`Wrote ${args.outputPath}\n`);
      }
      return 0;
    }

    const html = renderHtml(analysis);
    if (args.format === "html" && !args.outputPath) {
      process.stdout.write(html);
      return 0;
    }

    process.stdout.write(`${renderTerminal(analysis)}\n`);
    if (args.outputPath) {
      writeTextFile(args.outputPath, html);
      process.stdout.write(`Wrote ${args.outputPath}\n`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ielts-writing-scorer-lite: ${message}\n`);
    return error instanceof CliError ? error.exitCode : 1;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const here = import.meta.url;
  if (here === pathToFileURL(entry).href) return true;
  try {
    return here === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exit(code);
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`ielts-writing-scorer-lite: ${message}\n`);
      process.exit(1);
    },
  );
}
