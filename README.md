# ielts-writing-scorer-lite

Offline, rubric-style feedback for **IELTS Writing Task 2** practice essays.

> **This is not an IELTS score.** The numbers are an unofficial heuristic band-estimate for practice only. They are not an examiner judgement, and this project is not affiliated with IELTS, the British Council, IDP, or Cambridge. A real Task 2 mark depends on argument quality and grammatical accuracy that these rules do not measure.

The checker reads a plain-text essay on your machine and prints a terminal summary. It can also write a self-contained HTML report (no remote fonts, scripts, or stylesheets) or JSON. Nothing is uploaded unless you pass `--llm`.

## Install

```bash
npm install
npm run build
npm link
```

Requires Node.js 20 or newer. Runtime dependencies: none. TypeScript is a dev dependency.

```bash
ielts-writing-scorer-lite score --in essay.txt --out report.html --prompt question.txt
ielts-writing-scorer-lite score --in essay.txt --format json
```

## What it checks

1. **Word count.** Task 2 responses are usually at least 250 words. Under 150 is flagged as far below that length. Contractions (`don't`) and hyphenated forms (`state-of-the-art`) count as one word.
2. **Paragraphing.** Blank lines separate paragraphs. The first paragraph is treated as the introduction. With three or more paragraphs, the last is treated as the conclusion. One-sentence body paragraphs, a missing concluding phrase, and a single block of text are flagged. If there are no blank lines, three or more long lines that each end a sentence are treated as separate paragraphs; ordinary wrapped lines stay in one paragraph.
3. **Linking / cohesive devices.** A fixed inventory groups phrases such as `on the other hand`, `for example`, `in addition`, `therefore`, and `in conclusion`. Longer phrases win over shorter ones inside them (`even though` is not also counted as `though`). `and` and `so` are not treated as skilled linkers; heavy use of either is a checklist item. Words such as `while` and `since` are matched on the surface, so some hits are ordinary vocabulary.
4. **Lexical variety.** Type-token ratio is unique surface tokens divided by all tokens. A second figure strips rough suffixes (`students` → `student`, `running` → `run`) and a few irregulars (`people` → `person`). Content-word repetition is listed separately. This is not a lemmatizer and not a measure of how advanced the vocabulary is.
5. **Issue checklist.** Includes a long copy of the question (only if you pass `--prompt`), an opening that shares almost none of the question's content words, informal items (`gonna`, `yeah`, `a lot`, `stuff`), very short or 40-word sentences, a few punctuation patterns, and the same linker used many times.
6. **Optional `--llm`.** Sends the essay, the question, and the heuristic notes to the xAI API for extra tutor comments. Tests and the default `score` command stay offline.

## Band-estimate

The report shows **ranges**, not a single band. Each of the four familiar criterion names (task response, coherence and cohesion, lexical resource, grammatical range and accuracy) gets a centre between 3.0 and 8.0, displayed as that centre ± 0.5. The overall range is the same kind of spread around the average of the four centres.

The centre moves with things this tool can actually see: length, paragraph shape, linker variety, repetition, informal wording, and sentence-length mix. It does not read whether an example is convincing, and it does not parse grammar. Treat a `6.0–7.0` as "the surface features look like a mid-band script", not as a predicted test result.

## CLI

```text
ielts-writing-scorer-lite score --in <essay.txt> [--out <report.html>] [--prompt <question.txt>]
ielts-writing-scorer-lite score --in <essay.txt> --format json
ielts-writing-scorer-lite score --in <essay.txt> --out <report.html> --llm
```

| Flag | Meaning |
| --- | --- |
| `--in`, `-i` | Essay file |
| `--out`, `-o` | Report path. HTML for the default text format and for `--format html`. JSON if `--format json` |
| `--prompt`, `-p` | Task question. Used only for the restatement / off-topic checks |
| `--format`, `-f` | `text` (default), `json`, or `html` |
| `--llm` | Extra comments from the xAI API. Requires `XAI_API_KEY` |
| `--help`, `-h` | Help |
| `--version`, `-V` | Version |

`--format json` prints JSON to stdout so it can be piped. A path given with `--out` is also written. Exit code `0` means a report was produced (or help/version ran). Exit code `1` means a bad argument, a missing file, or a language-model error.

Paragraphs in the essay file should be separated by a blank line. See `fixtures/strong-essay.txt` and `fixtures/weak-essay.txt`.

## Optional language-model comments

`--llm` calls `POST https://api.x.ai/v1/chat/completions` with the model `grok-4-1-fast-reasoning` (override with `IELTS_LLM_MODEL`). The key is read from `XAI_API_KEY`. A local `.env` file is loaded only for keys that are not already set; copy `.env.example`. Create a key in the [xAI console](https://console.x.ai/). The essay leaves your machine only in this mode. The model is instructed not to award an official band. Its comments are still not an examiner's.

```bash
export XAI_API_KEY="your key"
ielts-writing-scorer-lite score --in essay.txt --out report.html --llm
```

## Examples

Stronger script, four paragraphs, about 270 words:

```bash
ielts-writing-scorer-lite score --in fixtures/strong-essay.txt --prompt fixtures/question.txt --out report.html
```

```text
Words: 271 / 250+    Sentences: 16    Paragraphs: 4 (introduction + 2 body paragraphs + conclusion)
Lexical diversity (rough lemmas): 0.89    Discourse linkers: 7 across 5 of 5 categories

Band-estimate: 6.5–7.5
Unofficial heuristic range
  Task response                   6.0–7.0
  Coherence and cohesion          7.0–8.0
  Lexical resource                6.0–7.0
  Grammatical range and accuracy  6.0–7.0

Checklist: no rule triggered.
```

Weaker script: under 250 words, copies the question, and chains `and` / `so`:

```bash
ielts-writing-scorer-lite score --in fixtures/weak-essay.txt --prompt fixtures/question.txt --format json
```

That run reports **155 words**, repeated `good` and `people`, no discourse linkers, and an unofficial band-estimate of **3.0–4.0**. JSON keeps `officialScore` set to `false`. `bandEstimate.overall` is `{ "low", "high" }` with no single score field. These ranges will move if the heuristics change; they are illustrations, not a promise of a future mark.

## Library

The package is ESM. `scoreEssay` is synchronous and offline. `analyzeEssay({ llm: true, llmClient })` accepts an injected client so callers can test without the network.

```js
import { scoreEssay, renderHtml } from "ielts-writing-scorer-lite";

const analysis = scoreEssay({ text: essay, prompt: question, sourceName: "essay.txt" });
await fs.writeFile("report.html", renderHtml(analysis));
```

## Development

```bash
npm test
```

`npm test` compiles TypeScript and runs the `node:test` suite. The suite does not call the network. Fixtures cover a weak script, a stronger script, a task question, and a single-block essay. Coverage includes word count, sentence and paragraph splitting, cohesive devices, lemmas, the checklist, band ranges, HTML escaping, JSON, the CLI, and a mocked `--llm` client.

## License

MIT. See [LICENSE](LICENSE) and [CHANGELOG.md](CHANGELOG.md).
