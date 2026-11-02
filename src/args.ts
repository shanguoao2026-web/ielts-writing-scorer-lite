export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export type OutputFormat = "text" | "json" | "html";

export interface CliArgs {
  command: "score" | "help" | "version";
  inputPath?: string;
  outputPath?: string;
  promptPath?: string;
  format: OutputFormat;
  llm: boolean;
}

const HELP = `ielts-writing-scorer-lite — unofficial IELTS Writing Task 2 feedback

Usage:
  ielts-writing-scorer-lite score --in <essay.txt> [--out <report.html>] [--prompt <question.txt>]
  ielts-writing-scorer-lite score --in <essay.txt> --format json
  ielts-writing-scorer-lite score --in <essay.txt> --out <report.html> --llm

Options:
  --in, -i       Essay file (plain text)
  --out, -o      Write a report. HTML unless --format json
  --prompt, -p   Task question file, used for restatement checks
  --format, -f   text (default), json, or html
  --llm          Ask the xAI API for extra comments (needs XAI_API_KEY)
  --help, -h     Show this help
  --version, -V  Show the version

Band figures are heuristic ranges for practice, not an IELTS score.
Essay text stays on this machine unless you pass --llm.

Exit codes:
  0  report produced, or help/version shown
  1  missing input, bad arguments, unreadable file, or language-model error
`;

export function helpText(): string {
  return HELP;
}

function takeValue(flag: string, argv: string[], index: number): { value: string; next: number } {
  if (flag.includes("=")) {
    const value = flag.slice(flag.indexOf("=") + 1);
    if (!value) throw new CliError(`Missing value for ${flag.split("=")[0]}.`);
    return { value, next: index };
  }
  const value = argv[index + 1];
  if (!value || value.startsWith("-")) {
    throw new CliError(`Missing value for ${flag}.`);
  }
  return { value, next: index + 1 };
}

export function parseArgs(argv: string[]): CliArgs {
  let command: CliArgs["command"] | undefined;
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let promptPath: string | undefined;
  let format: OutputFormat = "text";
  let llm = false;
  let help = false;
  let version = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index] ?? "";
    if (token === "score" && command === undefined && !token.startsWith("-")) {
      command = "score";
      continue;
    }
    if (token === "--help" || token === "-h") {
      help = true;
      continue;
    }
    if (token === "--version" || token === "-V") {
      version = true;
      continue;
    }
    if (token === "--llm") {
      llm = true;
      continue;
    }
    if (token === "--in" || token === "-i" || token.startsWith("--in=")) {
      const taken = takeValue(token, argv, index);
      inputPath = taken.value;
      index = taken.next;
      continue;
    }
    if (token === "--out" || token === "-o" || token.startsWith("--out=")) {
      const taken = takeValue(token, argv, index);
      outputPath = taken.value;
      index = taken.next;
      continue;
    }
    if (token === "--prompt" || token === "-p" || token.startsWith("--prompt=")) {
      const taken = takeValue(token, argv, index);
      promptPath = taken.value;
      index = taken.next;
      continue;
    }
    if (token === "--format" || token === "-f" || token.startsWith("--format=")) {
      const taken = takeValue(token, argv, index);
      const normalized = taken.value.toLowerCase();
      if (normalized !== "text" && normalized !== "json" && normalized !== "html") {
        throw new CliError(`Unknown format "${taken.value}". Use text, json, or html.`);
      }
      format = normalized;
      index = taken.next;
      continue;
    }
    if (token.startsWith("-")) {
      throw new CliError(`Unknown option "${token}". Run with --help for usage.`);
    }
    throw new CliError(`Unexpected argument "${token}". Run with --help for usage.`);
  }

  if (help) {
    return { command: "help", format, llm, inputPath, outputPath, promptPath };
  }
  if (version && command === undefined) {
    return { command: "version", format, llm, inputPath, outputPath, promptPath };
  }
  if (command === undefined) {
    throw new CliError("Missing command. Use: ielts-writing-scorer-lite score --in <essay.txt>");
  }
  if (!inputPath) {
    throw new CliError("Missing --in <essay.txt>.");
  }
  return { command: "score", format, llm, inputPath, outputPath, promptPath };
}
