import type { Analysis } from "../types.js";

export function renderJson(analysis: Analysis): string {
  return JSON.stringify(analysis, null, 2);
}
