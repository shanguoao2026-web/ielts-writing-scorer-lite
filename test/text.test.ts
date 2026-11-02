import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { roughLemma, splitParagraphs, splitSentences, tokenizeWords } from "../src/text.js";

describe("tokenizeWords", () => {
  test("counts contractions and hyphenated words as one", () => {
    const words = tokenizeWords("It's a state-of-the-art, well-known idea.");
    assert.deepEqual(words, ["It's", "a", "state-of-the-art", "well-known", "idea"]);
  });

  test("ignores extra whitespace and punctuation", () => {
    assert.deepEqual(tokenizeWords("  Hello,   world!! \n\n Next. "), ["Hello", "world", "Next"]);
  });
});

describe("splitSentences", () => {
  test("keeps abbreviations and decimals inside the sentence", () => {
    const sentences = splitSentences(
      "Mr. Smith gave an example, e.g. a short case, and the figure was 3.5 percent. Next came the conclusion.",
    );
    assert.equal(sentences.length, 2);
    assert.match(sentences[0] ?? "", /Mr\. Smith/);
    assert.match(sentences[0] ?? "", /e\.g\./);
    assert.match(sentences[0] ?? "", /3\.5/);
  });

  test("splits on question marks", () => {
    const sentences = splitSentences("Do you agree? I do not.");
    assert.equal(sentences.length, 2);
  });
});

describe("splitParagraphs", () => {
  test("splits blank lines and joins wrapped lines", () => {
    const text = "This sentence is wrapped\nacross lines but stays together.\n\nSecond paragraph is here.";
    const paragraphs = splitParagraphs(text);
    assert.equal(paragraphs.length, 2);
    assert.match(paragraphs[0] ?? "", /wrapped across lines/);
  });

  test("treats long single-newline lines as paragraphs", () => {
    const text = [
      "This introduction has more than twelve words and it ends quite properly.",
      "This body paragraph also has more than twelve words and it ends quite properly.",
      "This conclusion also has more than twelve words and it ends quite properly.",
    ].join("\n");
    assert.equal(splitParagraphs(text).length, 3);
  });

  test("normalizes CRLF blank lines", () => {
    const paragraphs = splitParagraphs("First paragraph stays intact.\r\n\r\nSecond paragraph stays intact.");
    assert.equal(paragraphs.length, 2);
  });
});

describe("roughLemma", () => {
  test("merges plurals, -ing, and a few irregulars", () => {
    assert.equal(roughLemma("students"), "student");
    assert.equal(roughLemma("running"), "run");
    assert.equal(roughLemma("people"), "person");
    assert.equal(roughLemma("studies"), "study");
    assert.equal(roughLemma("classes"), "class");
    assert.equal(roughLemma("boxes"), "box");
  });
});
