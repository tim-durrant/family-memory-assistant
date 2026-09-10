import { describe, expect, it } from "vitest";
import { normalizeText } from "../src/interpretation/normalize.js";

const fillers = ["please", "kindly"];

describe("deterministic text normalization", () => {
  it("preserves the original while normalizing Unicode, whitespace, and punctuation", () => {
    const normalized = normalizeText("  Could you tell me when my driving test is?  ", fillers);

    expect(normalized.original).toBe("  Could you tell me when my driving test is?  ");
    expect(normalized.text).toBe("Could you tell me when my driving test is");
    expect(normalized.lower).toBe("could you tell me when my driving test is");
    expect(normalized.isQuestion).toBe(true);
  });

  it.each([
    ["When is my driving test please?", "When is my driving test"],
    ["Please, when is my driving test?", "when is my driving test"],
    ["Kindly tell me the appointment.", "tell me the appointment"],
  ])("removes configured boundary filler: %s", (input, expected) => {
    expect(normalizeText(input, fillers).text).toBe(expected);
  });

  it("does not remove a filler from the middle of a statement", () => {
    expect(normalizeText("The please note is important", fillers).text).toBe("The please note is important");
  });
});
