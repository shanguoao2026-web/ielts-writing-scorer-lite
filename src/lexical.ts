import { isContentWord, roughLemma } from "./text.js";
import type { LexicalMetrics, RepetitionItem } from "./types.js";
import { roundTo } from "./util.js";

export function analyzeLexical(words: string[]): LexicalMetrics {
  const tokens = words.map((word) => word.toLowerCase());
  const uniqueTokens = new Set(tokens);
  const buckets = new Map<string, { count: number; surfaces: Map<string, number> }>();
  let contentWords = 0;
  for (const token of tokens) {
    if (!isContentWord(token)) continue;
    contentWords += 1;
    const lemma = roughLemma(token);
    const bucket = buckets.get(lemma) ?? { count: 0, surfaces: new Map<string, number>() };
    bucket.count += 1;
    bucket.surfaces.set(token, (bucket.surfaces.get(token) ?? 0) + 1);
    buckets.set(lemma, bucket);
  }
  const topRepetitions: RepetitionItem[] = [...buckets.entries()]
    .filter(([, bucket]) => bucket.count >= 2)
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .slice(0, 8)
    .map(([lemma, bucket]) => {
      const surface =
        [...bucket.surfaces.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ??
        lemma;
      return {
        lemma,
        surface,
        count: bucket.count,
        share: contentWords === 0 ? 0 : roundTo(bucket.count / contentWords, 4),
      };
    });
  return {
    tokens: tokens.length,
    uniqueTokens: uniqueTokens.size,
    typeTokenRatio: tokens.length === 0 ? 0 : roundTo(uniqueTokens.size / tokens.length, 3),
    contentWords,
    uniqueContentLemmas: buckets.size,
    lexicalDiversity: contentWords === 0 ? 0 : roundTo(buckets.size / contentWords, 3),
    topRepetitions,
  };
}
