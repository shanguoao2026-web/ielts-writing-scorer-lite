export type DeviceCategory =
  | "addition"
  | "contrast"
  | "cause and result"
  | "example"
  | "sequence"
  | "stance";

export type ParagraphRole = "introduction" | "body" | "conclusion" | "unknown";

export type IssueSeverity = "warning" | "note";

export interface WordCountMetrics {
  words: number;
  sentences: number;
  characters: number;
  target: number;
  meetsTarget: boolean;
  farBelow: boolean;
  averageSentenceLength: number;
}

export interface ParagraphInfo {
  index: number;
  role: ParagraphRole;
  text: string;
  wordCount: number;
  sentenceCount: number;
  oneSentence: boolean;
}

export interface ParagraphMetrics {
  count: number;
  paragraphs: ParagraphInfo[];
  hasIntroduction: boolean;
  hasConclusion: boolean;
  bodyCount: number;
  oneSentenceCount: number;
  conclusionMarkerInFinal: boolean;
  structure: string;
}

export interface CohesiveHit {
  phrase: string;
  category: DeviceCategory;
  count: number;
}

export interface CohesionCategory {
  category: DeviceCategory;
  total: number;
  hits: CohesiveHit[];
}

export interface CohesionMetrics {
  hits: CohesiveHit[];
  categories: CohesionCategory[];
  totalHits: number;
  discourseCategoriesPresent: string[];
  discourseCategoriesMissing: string[];
  densityPer100Words: number;
}

export interface RepetitionItem {
  lemma: string;
  surface: string;
  count: number;
  share: number;
}

export interface LexicalMetrics {
  tokens: number;
  uniqueTokens: number;
  typeTokenRatio: number;
  contentWords: number;
  uniqueContentLemmas: number;
  lexicalDiversity: number;
  topRepetitions: RepetitionItem[];
}

export interface MarkerHit {
  phrase: string;
  count: number;
}

export interface InformalHit {
  phrase: string;
  count: number;
}

export interface GrammarSignals {
  sentenceCount: number;
  averageLength: number;
  lengthStdev: number;
  shortSentences: number;
  longSentences: number;
  complexMarkers: MarkerHit[];
  complexMarkerTypes: number;
  punctuationIssues: string[];
  informalHits: InformalHit[];
  lowercasePronounI: number;
  adjacentRepetitions: string[];
}

export interface Issue {
  id: string;
  severity: IssueSeverity;
  title: string;
  detail: string;
}

export interface BandRange {
  low: number;
  high: number;
}

export interface CriterionEstimate extends BandRange {
  id: string;
  name: string;
  rationale: string;
}

export interface BandEstimate {
  label: string;
  official: false;
  overall: BandRange;
  criteria: CriterionEstimate[];
}

export interface Analysis {
  tool: string;
  version: string;
  task: "IELTS Writing Task 2";
  officialScore: false;
  disclaimer: string;
  sourceName: string;
  generatedAt: string;
  prompt: string | null;
  essay: string;
  wordCount: WordCountMetrics;
  paragraphs: ParagraphMetrics;
  cohesion: CohesionMetrics;
  lexical: LexicalMetrics;
  grammar: GrammarSignals;
  issues: Issue[];
  strengths: string[];
  bandEstimate: BandEstimate;
  llmFeedback: string | null;
}

export interface ScoreInput {
  text: string;
  sourceName?: string;
  prompt?: string | null;
  now?: Date;
  version?: string;
}

export interface AnalyzeInput extends ScoreInput {
  llm?: boolean;
  llmClient?: LlmClient;
}

export interface LlmClient {
  complete(system: string, user: string): Promise<string>;
}
