import { describe, expect, it } from "vitest";
import { interpretMessage, matchingFacts } from "../src/memory.js";

describe("deterministic memory interpretation", () => {
  it("does not turn greetings into facts", () => {
    expect(interpretMessage("Hello assistant")).toEqual({ kind: "unknown" });
    expect(interpretMessage("Thanks!")).toEqual({ kind: "unknown" });
  });

  it("records a dated fact and asks for a missing year", () => {
    expect(interpretMessage("My driving test is on 12 October.")).toMatchObject({
      kind: "record_fact",
      statement: "My driving test is on 12 October",
      category: "appointment",
      status: "confirmed",
      effectiveDate: null,
      needsYear: true,
    });
  });

  it("keeps an explicitly supplied date", () => {
    expect(interpretMessage("My driving test is on 12 October 2026")).toMatchObject({
      kind: "record_fact",
      effectiveDate: "2026-10-12",
      needsYear: false,
    });
  });

  it("recognises waiting questions and waiting facts", () => {
    expect(interpretMessage("What am I waiting for?")).toEqual({ kind: "waiting_question" });
    expect(interpretMessage("I’m still waiting for my MRI results")).toMatchObject({
      kind: "record_fact",
      category: "health",
      status: "waiting",
    });
  });

  it("recognises lookup and resolution questions", () => {
    expect(interpretMessage("When is my driving test booked for?")).toEqual({
      kind: "when_question",
      topic: "driving test",
    });
    expect(interpretMessage("Please tell me when my smoke test appointment is.")).toEqual({
      kind: "when_question",
      topic: "smoke test appointment",
    });
    expect(interpretMessage("Kindly advise me when my smoke test appointment please?")).toEqual({
      kind: "when_question",
      topic: "smoke test appointment",
    });
    expect(interpretMessage("What date is my smoke test appointment please?")).toEqual({
      kind: "when_question",
      topic: "smoke test appointment",
    });
    expect(interpretMessage("Mark the MRI results as resolved")).toEqual({
      kind: "resolve_fact",
      topic: "mri results",
    });
  });

  it("returns all facts matching every meaningful topic term", () => {
    const facts = [
      { id: "1", statement: "Driving test on 12 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
      { id: "2", statement: "Driving test rescheduled", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
      { id: "3", statement: "Dentist booked after birthday", category: "appointment", status: "confirmed", importance: "normal", effective_date: null },
    ];
    expect(matchingFacts(facts, "driving test")).toHaveLength(2);
    expect(matchingFacts(facts, "dentist")).toHaveLength(1);
  });
});
