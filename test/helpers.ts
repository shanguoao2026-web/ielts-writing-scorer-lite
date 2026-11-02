import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function projectRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "fixtures"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find the project root.");
}

export function fixture(name: string): string {
  return readFileSync(path.join(projectRoot(), "fixtures", name), "utf8");
}

export function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): SpawnSyncReturns<string> {
  const root = projectRoot();
  return spawnSync(process.execPath, [path.join(root, "dist", "cli.js"), ...args], {
    cwd: root,
    encoding: "utf8",
    env,
    timeout: 15_000,
  });
}
