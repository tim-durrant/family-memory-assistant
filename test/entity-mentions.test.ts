import { describe, expect, it } from "vitest";
import { extractEntityMentionCandidates } from "../src/interpretation/entity-mentions.js";
import { redactText } from "../src/repositories/pseudonyms.js";

describe("local entity mention extraction", () => {
  it("detects titled and contextual people without assigning family membership", () => {
    expect(extractEntityMentionCandidates("I had an appointment with Lorna today. Doctor Jay reviewed my records."))
      .toMatchObject([
        { displayName: "Doctor Jay" },
        { displayName: "Lorna" },
      ]);
  });

  it("does not treat ordinary sentence words as people", () => {
    expect(extractEntityMentionCandidates("Today I had headaches and numbness in my legs.")).toEqual([]);
  });

  it("replaces exact source spans without changing surrounding text", () => {
    expect(redactText("appointment with Lorna today", [{ start: 17, end: 22, pseudonym: "EXTERNAL_1234" }]))
      .toBe("appointment with EXTERNAL_1234 today");
  });
});
