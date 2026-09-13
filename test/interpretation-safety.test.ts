import { describe, expect, it } from "vitest";
import { applyIntentSafetyGate } from "../src/interpretation/safety.js";

describe("intent safety gate", () => {
  it("clarifies wording that could mean resolve, delete, or cancel", () => {
    expect(applyIntentSafetyGate("I don't need that appointment thing anymore", "record_fact")).toMatchObject({
      intent: "needs_clarification",
      overridden: true,
    });
  });

  it("does not override an already clarified ambiguous request", () => {
    expect(applyIntentSafetyGate("No need for the school reminder now", "needs_clarification")).toMatchObject({
      intent: "needs_clarification",
      overridden: false,
    });
  });

  it("requires explicit removal wording for forget_fact", () => {
    expect(applyIntentSafetyGate("The dentist appointment is old", "forget_fact")).toMatchObject({
      intent: "needs_clarification",
      overridden: true,
    });
    expect(applyIntentSafetyGate("Please remove the dentist appointment", "forget_fact")).toMatchObject({
      intent: "forget_fact",
      overridden: false,
    });
  });

  it("requires explicit completion wording for resolve_fact", () => {
    expect(applyIntentSafetyGate("The plumber thing", "resolve_fact")).toMatchObject({
      intent: "needs_clarification",
      overridden: true,
    });
    expect(applyIntentSafetyGate("The plumber job is done, close it", "resolve_fact")).toMatchObject({
      intent: "resolve_fact",
      overridden: false,
    });
  });

  it("leaves safe advisory predictions unchanged", () => {
    expect(applyIntentSafetyGate("What did I write about the holiday", "query_note")).toMatchObject({
      intent: "query_note",
      overridden: false,
    });
  });
});
