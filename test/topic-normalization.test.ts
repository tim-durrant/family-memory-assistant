import { describe, expect, it } from "vitest";
import { DEFAULT_DETERMINISTIC_CONFIG, type DeterministicConfig } from "../src/config.js";
import { matchFacts } from "../src/repositories/facts.js";
import { normalizeTopic, topicTerms } from "../src/interpretation/topic.js";

const facts = [
  { id: "1", statement: "Driving test on 12 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
  { id: "2", statement: "Driving test rescheduled", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
  { id: "3", statement: "MRI result", category: "health", status: "waiting", importance: "high", effective_date: null },
  { id: "4", statement: "Dentist appointment", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
];

function config(overrides: Partial<DeterministicConfig> = {}): DeterministicConfig {
  return { ...DEFAULT_DETERMINISTIC_CONFIG, ...overrides };
}

describe("deterministic topic normalization and matching", () => {
  it("removes configured stop words and normalizes singular/plural terms", () => {
    expect(topicTerms("Are my driving tests?", config())).toEqual(["driving", "test"]);
    expect(topicTerms("MRI results", config())).toEqual(["mri", "result"]);
  });

  it("matches all significant terms without substring false positives", () => {
    const result = matchFacts(facts, "driving test", config());
    expect(result.matches.map((fact) => fact.id)).toEqual(["1", "2"]);
    expect(result.strategy).toBe("all-terms");
  });

  it("supports a configured confirmed alias", () => {
    const result = matchFacts(facts, "driving appointment", config({
      topicAliases: [{ alias: "driving appointment", canonical: "driving test" }],
    }));
    expect(result.matches.map((fact) => fact.id)).toEqual(["1", "2"]);
  });

  it("reports exact matches distinctly", () => {
    const result = matchFacts([{ ...facts[2], statement: "MRI result" }], "MRI result", config());
    expect(result.strategy).toBe("exact");
    expect(result.queryTerms).toEqual(["mri", "result"]);
  });

  it("keeps broad one-term matches explainable and preserves multiple matches", () => {
    const result = matchFacts(facts, "driving", config());
    expect(result.matches.map((fact) => fact.id)).toEqual(["1", "2"]);
    expect(result.strategy).toBe("all-terms");
  });

  it("returns an honest no-match result for an unrelated topic", () => {
    const result = matchFacts(facts, "passport", config());
    expect(result).toEqual({ matches: [], strategy: "none", queryTerms: ["passport"] });
  });

  it("does not create terms from a query made only of stop words", () => {
    expect(matchFacts(facts, "is my", config())).toEqual({ matches: [], strategy: "none", queryTerms: [] });
  });

  it("normalizes punctuation before matching", () => {
    expect(normalizeTopic("Driving-test!", config())).toBe("driving test");
  });
});
