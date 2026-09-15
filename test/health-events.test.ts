import { describe, expect, it } from "vitest";
import { interpretHealthEvent } from "../src/interpretation/health-events.js";

describe("offline deterministic health-event interpretation", () => {
  it("extracts a present self event with duration and timing", () => {
    expect(interpretHealthEvent("Had a 2 hr migraine this morning")).toMatchObject({
      kind: "record_health_event",
      conceptId: "local:migraine",
      conceptName: "migraine",
      assertion: "present",
      experiencer: "self",
      durationMinutes: 120,
      timeReference: "this morning",
      sourceText: "Had a 2 hr migraine this morning",
      vocabularySource: "family-seed",
      vocabularyVersion: "family-seed-1",
    });
  });

  it.each([
    ["No migraine today", "negated"],
    ["I might be getting a migraine", "uncertain"],
    ["I used to get migraines", "historical"],
  ])("captures assertion for %s", (text, assertion) => {
    expect(interpretHealthEvent(text)).toMatchObject({ assertion, conceptId: "local:migraine" });
  });

  it("does not turn another person's event into a self event", () => {
    expect(interpretHealthEvent("My daughter has a migraine")).toMatchObject({
      conceptId: "local:migraine",
      experiencer: "other",
      otherPersonText: "daughter",
    });
  });

  it("returns no candidate for unrelated text", () => {
    expect(interpretHealthEvent("Jacob has soccer on Saturday")).toBeNull();
  });
});
