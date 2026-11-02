import {
  COHESIVE_DEVICES,
  DEVICE_CATEGORIES,
  DISCOURSE_CATEGORIES,
  type DeviceDefinition,
} from "./constants.js";
import type { CohesionCategory, CohesionMetrics, CohesiveHit } from "./types.js";
import { escapeRegExp, roundTo } from "./util.js";

function findCounts(text: string): Map<string, number> {
  const haystack = text.replace(/\s+/g, " ").toLowerCase();
  const consumed = new Array<boolean>(haystack.length).fill(false);
  const ordered: DeviceDefinition[] = [...COHESIVE_DEVICES].sort(
    (left, right) => right.phrase.length - left.phrase.length || left.phrase.localeCompare(right.phrase),
  );
  const counts = new Map<string, number>();
  for (const device of ordered) {
    const pattern = new RegExp(`\\b${escapeRegExp(device.phrase)}\\b`, "gi");
    let found = 0;
    for (const match of haystack.matchAll(pattern)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      let overlaps = false;
      for (let index = start; index < end; index += 1) {
        if (consumed[index]) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      for (let index = start; index < end; index += 1) consumed[index] = true;
      found += 1;
    }
    if (found > 0) counts.set(device.phrase, found);
  }
  return counts;
}

function ensureStance(text: string, counts: Map<string, number>): void {
  const already = COHESIVE_DEVICES.some(
    (device) => device.category === "stance" && (counts.get(device.phrase) ?? 0) > 0,
  );
  if (already) return;
  if (/\bi\s+(?:do\s+not\s+|don't\s+|strongly\s+|largely\s+|partly\s+|generally\s+|personally\s+)?(?:agree|disagree|believe|support|oppose)\b/i.test(text)) {
    counts.set("i agree", (counts.get("i agree") ?? 0) + 1);
  }
}

export function hasStance(text: string, hits: CohesiveHit[]): boolean {
  if (hits.some((hit) => hit.category === "stance")) return true;
  return /\bi\s+(?:do\s+not\s+|don't\s+|strongly\s+|largely\s+|partly\s+|generally\s+|personally\s+)?(?:agree|disagree|believe|support|oppose)\b/i.test(
    text,
  );
}

export function analyzeCohesion(text: string, wordCount: number): CohesionMetrics {
  const counts = findCounts(text);
  ensureStance(text, counts);
  const byPhrase = new Map(COHESIVE_DEVICES.map((device) => [device.phrase, device.category]));
  const hits: CohesiveHit[] = [...counts.entries()]
    .map(([phrase, count]) => ({
      phrase,
      category: byPhrase.get(phrase) ?? "stance",
      count,
    }))
    .sort((left, right) => left.category.localeCompare(right.category) || left.phrase.localeCompare(right.phrase));

  const categories: CohesionCategory[] = DEVICE_CATEGORIES.map((category) => {
    const categoryHits = hits.filter((hit) => hit.category === category);
    return {
      category,
      total: categoryHits.reduce((sum, hit) => sum + hit.count, 0),
      hits: categoryHits,
    };
  });

  const discourseCategoriesPresent = DISCOURSE_CATEGORIES.filter((category) =>
    categories.some((entry) => entry.category === category && entry.total > 0),
  );
  const discourseCategoriesMissing = DISCOURSE_CATEGORIES.filter(
    (category) => !discourseCategoriesPresent.includes(category),
  );
  const totalHits = hits.reduce((sum, hit) => sum + hit.count, 0);
  return {
    hits,
    categories,
    totalHits,
    discourseCategoriesPresent: [...discourseCategoriesPresent],
    discourseCategoriesMissing: [...discourseCategoriesMissing],
    densityPer100Words: wordCount === 0 ? 0 : roundTo((totalHits / wordCount) * 100, 2),
  };
}

