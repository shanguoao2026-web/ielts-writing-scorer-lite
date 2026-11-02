import { THRESHOLDS } from "./constants.js";
import { hasStance } from "./cohesion.js";
import { openingExcerpt } from "./paragraphs.js";
import { contentLemmas, splitSentences, tokenizeWords } from "./text.js";
import type {
  CohesionMetrics,
  GrammarSignals,
  Issue,
  LexicalMetrics,
  ParagraphMetrics,
  WordCountMetrics,
} from "./types.js";
import { percent, uniqueStrings } from "./util.js";

export interface ChecklistInput {
  text: string;
  prompt: string | null;
  wordCount: WordCountMetrics;
  paragraphs: ParagraphMetrics;
  cohesion: CohesionMetrics;
  lexical: LexicalMetrics;
  grammar: GrammarSignals;
}

export interface PromptOverlap {
  ratio: number;
  shared: string[];
  promptLemmas: string[];
  openingWords: number;
}

export function measurePromptOverlap(opening: string, prompt: string): PromptOverlap {
  const promptLemmas = uniqueStrings(contentLemmas(prompt));
  const openingSet = new Set(contentLemmas(opening));
  const shared = promptLemmas.filter((lemma) => openingSet.has(lemma));
  return {
    ratio: promptLemmas.length === 0 ? 0 : shared.length / promptLemmas.length,
    shared,
    promptLemmas,
    openingWords: tokenizeWords(opening).length,
  };
}

function issue(id: string, severity: Issue["severity"], title: string, detail: string): Issue {
  return { id, severity, title, detail };
}

function tokenCount(words: string[], target: string): number {
  return words.filter((word) => word.toLowerCase() === target).length;
}

export function buildChecklist(input: ChecklistInput): { issues: Issue[]; strengths: string[] } {
  if (input.wordCount.words === 0) {
    return {
      issues: [
        issue(
          "empty-essay",
          "warning",
          "Empty essay",
          "There is no essay text to assess. Paste a Task 2 response of at least 250 words.",
        ),
      ],
      strengths: [],
    };
  }

  const issues: Issue[] = [];
  const words = tokenizeWords(input.text);
  const andCount = tokenCount(words, "and");
  const soCount = tokenCount(words, "so");
  const andShare = andCount / words.length;
  const sentences = splitSentences(input.text);
  const sentenceInitial = sentences.filter((sentence) => /^(and|so)\b/i.test(sentence.trim())).length;

  if (input.wordCount.farBelow) {
    issues.push(
      issue(
        "far-below-word-target",
        "warning",
        "Far below the word target",
        `${input.wordCount.words} words is well under the usual 250-word Task 2 length, and under ${THRESHOLDS.farBelowWords}. Short scripts are penalised heavily in the real test because the response is not developed.`,
      ),
    );
  } else if (!input.wordCount.meetsTarget) {
    issues.push(
      issue(
        "short-of-word-target",
        "warning",
        "Short of the word target",
        `${input.wordCount.words} words is under the usual 250-word Task 2 length. Add a developed reason or example rather than repeating the question.`,
      ),
    );
  } else if (input.wordCount.words > THRESHOLDS.longEssayWords) {
    issues.push(
      issue(
        "long-essay",
        "note",
        "Long essay",
        `${input.wordCount.words} words is well past 250. Length is not a penalty by itself, but padding and repetition become more likely.`,
      ),
    );
  }

  if (input.paragraphs.count <= 1) {
    issues.push(
      issue(
        "single-block",
        "warning",
        "No paragraph breaks",
        "The essay is a single block. Task 2 answers are easier to follow with an introduction, one or two body paragraphs, and a conclusion, separated by blank lines.",
      ),
    );
  } else if (input.paragraphs.count < 3) {
    issues.push(
      issue(
        "too-few-paragraphs",
        "warning",
        "Too few paragraphs",
        `Only ${input.paragraphs.count} paragraph${input.paragraphs.count === 1 ? "" : "s"} were found. A typical Task 2 script uses four: introduction, two body paragraphs, and a conclusion.`,
      ),
    );
  } else if (input.paragraphs.count >= THRESHOLDS.manyParagraphs) {
    issues.push(
      issue(
        "many-paragraphs",
        "note",
        "Many short paragraphs",
        `${input.paragraphs.count} paragraphs is a lot for Task 2. Some of them may be one idea split too thin.`,
      ),
    );
  }

  const oneSentenceBodies = input.paragraphs.paragraphs.filter(
    (paragraph) => paragraph.oneSentence && paragraph.role === "body",
  );
  if (oneSentenceBodies.length > 0) {
    const labels = oneSentenceBodies.map((paragraph) => paragraph.index + 1).join(", ");
    issues.push(
      issue(
        "one-sentence-paragraph",
        "warning",
        "One-sentence body paragraph",
        `Paragraph ${labels} has a single sentence. Give each body paragraph a point, a reason, and an example.`,
      ),
    );
  }

  const thinIntro = input.paragraphs.paragraphs.find(
    (paragraph) => paragraph.role === "introduction" && paragraph.oneSentence && paragraph.wordCount < 12,
  );
  if (thinIntro) {
    issues.push(
      issue(
        "thin-introduction",
        "note",
        "Very short introduction",
        "The introduction is a single short sentence. State the topic and your position in about two sentences.",
      ),
    );
  }

  const conclusion = input.paragraphs.paragraphs.find((paragraph) => paragraph.role === "conclusion");
  if (conclusion && !input.paragraphs.conclusionMarkerInFinal) {
    issues.push(
      issue(
        "weak-conclusion-signal",
        "note",
        "Conclusion has no concluding phrase",
        "The last paragraph is treated as a conclusion because of its position, but it does not use a phrase such as \"In conclusion\" or \"To sum up\".",
      ),
    );
  }
  if (conclusion && conclusion.wordCount < THRESHOLDS.shortConclusionWords) {
    issues.push(
      issue(
        "short-conclusion",
        "warning",
        "Short conclusion",
        `The closing paragraph is only ${conclusion.wordCount} words. Restate your position and the main reason in one or two full sentences.`,
      ),
    );
  }

  const introduction = input.paragraphs.paragraphs.find((paragraph) => paragraph.role === "introduction");
  if (
    introduction &&
    input.wordCount.words > 0 &&
    introduction.wordCount >= THRESHOLDS.longIntroductionWords &&
    introduction.wordCount / input.wordCount.words >= THRESHOLDS.longIntroductionShare
  ) {
    issues.push(
      issue(
        "long-introduction",
        "note",
        "Long introduction",
        `The introduction is ${introduction.wordCount} words, about ${percent(introduction.wordCount / input.wordCount.words)} of the essay. Move examples and reasons into the body.`,
      ),
    );
  }

  if (!hasStance(input.text, input.cohesion.hits)) {
    issues.push(
      issue(
        "no-stance",
        "warning",
        "No clear stance",
        "The essay does not clearly say whether you agree, disagree, or partly agree. Task 2 usually expects a direct position in the introduction.",
      ),
    );
  }

  if (andCount >= THRESHOLDS.andMinCount && andShare >= THRESHOLDS.andMinShare) {
    issues.push(
      issue(
        "overuse-and",
        "warning",
        "Overuse of \"and\"",
        `"and" appears ${andCount} times (${percent(andShare)} of words). Join some ideas with contrast, result, or example linkers instead of chaining clauses.`,
      ),
    );
  }
  if (soCount >= THRESHOLDS.soMinCount) {
    issues.push(
      issue(
        "overuse-so",
        "warning",
        "Overuse of \"so\"",
        `"so" appears ${soCount} times. In Task 2, "therefore", "as a result", or "because" usually sound more controlled.`,
      ),
    );
  }
  if (sentenceInitial >= THRESHOLDS.sentenceInitialAndSo) {
    issues.push(
      issue(
        "sentence-initial-and-so",
        "warning",
        "Sentences starting with And or So",
        `${sentenceInitial} sentences start with "And" or "So". Those openings are common in speech and weak in a Task 2 script.`,
      ),
    );
  }

  if (input.prompt && input.prompt.trim().length > 0) {
    const introText = introduction?.text ?? input.paragraphs.paragraphs[0]?.text ?? input.text;
    const overlap = measurePromptOverlap(openingExcerpt(introText, 2), input.prompt);
    if (overlap.promptLemmas.length >= THRESHOLDS.promptMinLemmas) {
      if (overlap.ratio >= THRESHOLDS.restatementOverlap && overlap.openingWords >= THRESHOLDS.restatementMinWords) {
        issues.push(
          issue(
            "question-restatement-long",
            "warning",
            "Long restatement of the question",
            `The opening (${overlap.openingWords} words) recycles about ${percent(overlap.ratio)} of the question's content words. Paraphrase in one short sentence and then give your thesis.`,
          ),
        );
      } else if (
        overlap.ratio < THRESHOLDS.offTopicOverlap &&
        input.wordCount.words >= THRESHOLDS.offTopicMinWords
      ) {
        issues.push(
          issue(
            "question-not-addressed",
            "warning",
            "Opening may miss the question",
            `The opening shares about ${percent(overlap.ratio)} of the question's content words (${overlap.shared.join(", ") || "none"}). Check that the essay answers this task, not a different one.`,
          ),
        );
      }
    }
  }

  const repeated = input.lexical.topRepetitions.filter(
    (item) =>
      (item.count >= THRESHOLDS.repetitionCount && item.share >= THRESHOLDS.repetitionShare) ||
      item.count >= THRESHOLDS.repetitionHardCount,
  );
  if (repeated.length > 0) {
    const detail = repeated
      .map((item) => `${item.surface} ×${item.count} (${percent(item.share)} of content words)`)
      .join(", ");
    issues.push(
      issue(
        "repetitive-word",
        "warning",
        "Repeated content words",
        `Some content words dominate the essay: ${detail}. Vary the wording, including rough stems such as singular and plural forms.`,
      ),
    );
  }

  if (input.grammar.informalHits.length > 0) {
    const detail = input.grammar.informalHits.map((hit) => `${hit.phrase} ×${hit.count}`).join(", ");
    issues.push(
      issue(
        "informal-language",
        "warning",
        "Informal wording",
        `Informal items: ${detail}. Task 2 is closer to a short academic essay than to a conversation.`,
      ),
    );
  }

  if (input.grammar.longSentences > 0) {
    issues.push(
      issue(
        "run-on-sentence",
        "note",
        "Very long sentence",
        `${input.grammar.longSentences} sentence${input.grammar.longSentences === 1 ? "" : "s"} run to ${THRESHOLDS.runOnWords} words or more. Split them so the reader can see the point.`,
      ),
    );
  }

  if (input.grammar.shortSentences > 0) {
    issues.push(
      issue(
        "fragment-sentence",
        input.grammar.shortSentences >= 3 ? "warning" : "note",
        "Very short sentence",
        `${input.grammar.shortSentences} sentence${input.grammar.shortSentences === 1 ? "" : "s"} have ${THRESHOLDS.fragmentMaxWords} words or fewer. A string of clipped sentences under-develops the idea.`,
      ),
    );
  }

  if (input.grammar.punctuationIssues.length > 0) {
    issues.push(
      issue(
        "punctuation",
        "note",
        "Punctuation pattern",
        `Surface punctuation checks: ${input.grammar.punctuationIssues.join("; ")}.`,
      ),
    );
  }

  if (input.grammar.lowercasePronounI > 0) {
    issues.push(
      issue(
        "lowercase-pronoun-i",
        "note",
        "Lowercase pronoun \"i\"",
        `The pronoun "I" appears in lowercase ${input.grammar.lowercasePronounI} time${input.grammar.lowercasePronounI === 1 ? "" : "s"}.`,
      ),
    );
  }

  if (input.grammar.adjacentRepetitions.length > 0) {
    issues.push(
      issue(
        "adjacent-repetition",
        "note",
        "Word repeated twice in a row",
        `Adjacent repetition: ${input.grammar.adjacentRepetitions.join(", ")}.`,
      ),
    );
  }

  if (
    input.wordCount.words >= THRESHOLDS.thinCohesionMinWords &&
    input.cohesion.discourseCategoriesPresent.length <= THRESHOLDS.thinCohesionMaxCategories
  ) {
    issues.push(
      issue(
        "thin-cohesion",
        "warning",
        "Thin cohesive-device range",
        `Discourse linkers show up in ${input.cohesion.discourseCategoriesPresent.length} categor${input.cohesion.discourseCategoriesPresent.length === 1 ? "y" : "ies"} (${input.cohesion.discourseCategoriesPresent.join(", ") || "none"}). Add contrast, result, and example signals, not only "and" or "so".`,
      ),
    );
  }

  const heavyLinker = input.cohesion.hits.filter((hit) => hit.count >= THRESHOLDS.repeatedLinkerCount);
  if (heavyLinker.length > 0) {
    const detail = heavyLinker.map((hit) => `"${hit.phrase}" ×${hit.count}`).join(", ");
    issues.push(
      issue(
        "repeated-linker",
        "note",
        "Same linker repeated",
        `${detail}. Repeating one linker makes cohesion look mechanical.`,
      ),
    );
  }

  const rank = { warning: 0, note: 1 } as const;
  issues.sort((left, right) => rank[left.severity] - rank[right.severity] || left.id.localeCompare(right.id));
  return { issues, strengths: buildStrengths(input, issues) };
}

function buildStrengths(input: ChecklistInput, issues: Issue[]): string[] {
  const ids = new Set(issues.map((item) => item.id));
  const strengths: string[] = [];
  if (!ids.has("short-of-word-target") && !ids.has("far-below-word-target") && input.wordCount.meetsTarget) {
    strengths.push(`${input.wordCount.words} words meets the usual 250-word Task 2 length.`);
  }
  if (
    input.paragraphs.count >= 4 &&
    input.paragraphs.count <= 5 &&
    input.paragraphs.hasIntroduction &&
    input.paragraphs.hasConclusion &&
    !ids.has("one-sentence-paragraph")
  ) {
    strengths.push(`Paragraphing reads as ${input.paragraphs.structure}.`);
  }
  if (input.paragraphs.conclusionMarkerInFinal) {
    strengths.push("The final paragraph signals a conclusion.");
  }
  if (input.cohesion.discourseCategoriesPresent.length >= 4) {
    strengths.push(
      `Cohesive devices cover ${input.cohesion.discourseCategoriesPresent.length} discourse categories (${input.cohesion.discourseCategoriesPresent.join(", ")}).`,
    );
  }
  if (
    !ids.has("repetitive-word") &&
    input.lexical.contentWords >= 60 &&
    input.lexical.lexicalDiversity >= 0.55
  ) {
    strengths.push(
      `Rough lexical diversity is ${input.lexical.lexicalDiversity.toFixed(2)} across ${input.lexical.uniqueContentLemmas} content lemmas.`,
    );
  }
  if (
    input.grammar.complexMarkerTypes >= 4 &&
    input.grammar.informalHits.length === 0 &&
    input.grammar.punctuationIssues.length === 0
  ) {
    strengths.push(
      `Sentence signals include ${input.grammar.complexMarkerTypes} different clause or linking markers, with no informal items from the checklist.`,
    );
  }
  if (!ids.has("no-stance") && !ids.has("question-restatement-long") && !ids.has("question-not-addressed") && input.prompt) {
    strengths.push("The opening takes a position without copying the whole question.");
  }
  return strengths;
}
