import type { DeviceCategory } from "./types.js";

export const TOOL_NAME = "ielts-writing-scorer-lite";

export const DISCLAIMER =
  "This is an unofficial heuristic band-estimate for practice only. It is not an IELTS score, not an examiner judgement, and not affiliated with IELTS, the British Council, IDP, or Cambridge.";

export const BAND_LABEL = "Unofficial heuristic range";

export const THRESHOLDS = {
  wordTarget: 250,
  farBelowWords: 150,
  longEssayWords: 450,
  andMinCount: 10,
  andMinShare: 0.05,
  soMinCount: 4,
  sentenceInitialAndSo: 3,
  restatementOverlap: 0.6,
  restatementMinWords: 18,
  offTopicOverlap: 0.15,
  offTopicMinWords: 80,
  repetitionCount: 6,
  repetitionShare: 0.045,
  repetitionHardCount: 8,
  fragmentMaxWords: 4,
  runOnWords: 40,
  shortConclusionWords: 25,
  thinCohesionMaxCategories: 1,
  thinCohesionMinWords: 120,
  repeatedLinkerCount: 5,
  manyParagraphs: 7,
  longIntroductionShare: 0.35,
  longIntroductionWords: 90,
  promptMinLemmas: 4,
  bandCentreMin: 3,
  bandCentreMax: 8,
  bandSpread: 0.5,
} as const;

export const DEVICE_CATEGORIES: readonly DeviceCategory[] = [
  "addition",
  "contrast",
  "cause and result",
  "example",
  "sequence",
  "stance",
];

export const DISCOURSE_CATEGORIES: readonly DeviceCategory[] = DEVICE_CATEGORIES.filter(
  (category) => category !== "stance",
);

export interface DeviceDefinition {
  phrase: string;
  category: DeviceCategory;
}

export const COHESIVE_DEVICES: readonly DeviceDefinition[] = [
  { phrase: "furthermore", category: "addition" },
  { phrase: "moreover", category: "addition" },
  { phrase: "in addition", category: "addition" },
  { phrase: "additionally", category: "addition" },
  { phrase: "besides", category: "addition" },
  { phrase: "what is more", category: "addition" },
  { phrase: "not only", category: "addition" },
  { phrase: "as well as", category: "addition" },
  { phrase: "however", category: "contrast" },
  { phrase: "nevertheless", category: "contrast" },
  { phrase: "nonetheless", category: "contrast" },
  { phrase: "on the other hand", category: "contrast" },
  { phrase: "in contrast", category: "contrast" },
  { phrase: "by contrast", category: "contrast" },
  { phrase: "conversely", category: "contrast" },
  { phrase: "although", category: "contrast" },
  { phrase: "even though", category: "contrast" },
  { phrase: "though", category: "contrast" },
  { phrase: "whereas", category: "contrast" },
  { phrase: "while", category: "contrast" },
  { phrase: "despite", category: "contrast" },
  { phrase: "in spite of", category: "contrast" },
  { phrase: "on the contrary", category: "contrast" },
  { phrase: "therefore", category: "cause and result" },
  { phrase: "thus", category: "cause and result" },
  { phrase: "consequently", category: "cause and result" },
  { phrase: "as a result", category: "cause and result" },
  { phrase: "as a consequence", category: "cause and result" },
  { phrase: "because", category: "cause and result" },
  { phrase: "since", category: "cause and result" },
  { phrase: "due to", category: "cause and result" },
  { phrase: "hence", category: "cause and result" },
  { phrase: "so that", category: "cause and result" },
  { phrase: "owing to", category: "cause and result" },
  { phrase: "for this reason", category: "cause and result" },
  { phrase: "for example", category: "example" },
  { phrase: "for instance", category: "example" },
  { phrase: "such as", category: "example" },
  { phrase: "namely", category: "example" },
  { phrase: "to illustrate", category: "example" },
  { phrase: "in particular", category: "example" },
  { phrase: "firstly", category: "sequence" },
  { phrase: "secondly", category: "sequence" },
  { phrase: "thirdly", category: "sequence" },
  { phrase: "finally", category: "sequence" },
  { phrase: "first of all", category: "sequence" },
  { phrase: "to begin with", category: "sequence" },
  { phrase: "in conclusion", category: "sequence" },
  { phrase: "to conclude", category: "sequence" },
  { phrase: "to sum up", category: "sequence" },
  { phrase: "in summary", category: "sequence" },
  { phrase: "to summarize", category: "sequence" },
  { phrase: "to summarise", category: "sequence" },
  { phrase: "subsequently", category: "sequence" },
  { phrase: "meanwhile", category: "sequence" },
  { phrase: "in my opinion", category: "stance" },
  { phrase: "i believe", category: "stance" },
  { phrase: "i argue", category: "stance" },
  { phrase: "from my perspective", category: "stance" },
  { phrase: "in my view", category: "stance" },
  { phrase: "i strongly agree", category: "stance" },
  { phrase: "i strongly disagree", category: "stance" },
  { phrase: "i agree", category: "stance" },
  { phrase: "i disagree", category: "stance" },
];

export const CONCLUSION_MARKERS = [
  "in conclusion",
  "to conclude",
  "to sum up",
  "in summary",
  "to summarize",
  "to summarise",
  "all in all",
  "in short",
] as const;

export const COMPLEX_MARKERS = [
  "although",
  "even though",
  "whereas",
  "because",
  "unless",
  "despite",
  "in spite of",
  "which",
  "who",
  "whose",
  "while",
  "if",
  "until",
  "so that",
  "not only",
  "in order to",
  "however",
  "therefore",
  "for example",
  "for instance",
  "in addition",
  "on the other hand",
  "when",
] as const;

export const INFORMAL_PHRASES = [
  "gonna",
  "wanna",
  "kinda",
  "sorta",
  "yeah",
  "yep",
  "ain't",
  "coz",
  "dunno",
  "a lot",
  "lots of",
  "stuff",
] as const;

const FUNCTION_WORD_LIST = [
  "a", "an", "the", "and", "or", "but", "if", "so", "of", "to", "in", "on", "for",
  "with", "at", "by", "from", "as", "into", "about", "over", "after", "before",
  "between", "through", "during", "without", "within", "is", "am", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "shall", "should", "can", "could", "may", "might", "must", "this",
  "that", "these", "those", "it", "its", "i", "you", "he", "she", "we", "they",
  "me", "him", "her", "us", "them", "my", "your", "his", "our", "their", "what",
  "which", "who", "whom", "whose", "when", "where", "why", "how", "not", "no",
  "nor", "than", "then", "there", "here", "also", "very", "just", "only", "own",
  "too", "such", "other", "some", "any", "each", "both", "few", "more", "most",
  "many", "much", "off", "up", "down", "out", "again", "once", "because", "while",
  "although", "though", "since", "however", "therefore", "furthermore", "moreover",
  "thus", "hence", "consequently", "nevertheless", "nonetheless", "instead",
  "besides", "overall", "finally", "firstly", "secondly", "thirdly", "etc",
  "per", "via", "among", "across", "against", "under", "above", "upon",
];

export const FUNCTION_WORDS = new Set(FUNCTION_WORD_LIST);

export const IRREGULAR_LEMMAS: Readonly<Record<string, string>> = {
  children: "child",
  people: "person",
  men: "man",
  women: "woman",
  better: "good",
  best: "good",
  worse: "bad",
  worst: "bad",
};
