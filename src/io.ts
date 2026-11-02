import { readFileSync, statSync, writeFileSync } from "node:fs";
import { CliError } from "./args.js";

export function assertPlainText(text: string, label: string): void {
  if (text.includes("\0")) {
    throw new CliError(`${label} looks like a binary file, not plain text.`);
  }
  if (text.length > 500_000) {
    throw new CliError(`${label} is too large (${text.length} characters). The limit is 500000.`);
  }
}

export function readTextFile(filePath: string): string {
  let info;
  try {
    info = statSync(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new CliError(`File not found: ${filePath}`);
    throw new CliError(`Could not read ${filePath}: ${(error as Error).message}`);
  }
  if (!info.isFile()) throw new CliError(`Not a file: ${filePath}`);
  try {
    const text = readFileSync(filePath, "utf8");
    assertPlainText(text, filePath);
    return text;
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(`Could not read ${filePath}: ${(error as Error).message}`);
  }
}

export function writeTextFile(filePath: string, contents: string): void {
  try {
    writeFileSync(filePath, contents, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new CliError(`Directory not found for ${filePath}`);
    throw new CliError(`Could not write ${filePath}: ${(error as Error).message}`);
  }
}

export function loadDotEnv(filePath: string, env: NodeJS.ProcessEnv = process.env): void {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"") && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}
