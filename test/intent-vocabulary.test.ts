import { describe, expect, it } from "vitest";
import { INTENT_CATALOG, type SupportedIntentKind } from "../src/interpretation/intents.js";
import { interpretMessage } from "../src/interpretation/deterministic.js";

describe("deterministic intent vocabulary", () => {
  it.each(Object.entries(INTENT_CATALOG) as Array<[SupportedIntentKind, (typeof INTENT_CATALOG)[SupportedIntentKind]]>)(
    "%s recognizes every documented example",
    (kind, definition) => {
      for (const example of definition.examples) {
        expect(interpretMessage(example).kind, example).toBe(kind);
      }
    },
  );

  it.each(Object.entries(INTENT_CATALOG) as Array<[SupportedIntentKind, (typeof INTENT_CATALOG)[SupportedIntentKind]]>)(
    "%s does not claim its documented counterexamples",
    (kind, definition) => {
      for (const counterexample of definition.counterexamples) {
        expect(interpretMessage(counterexample).kind, counterexample).not.toBe(kind);
      }
    },
  );

  it("returns unknown for unsupported statements and unsupported questions", () => {
    expect(interpretMessage("Tell me a joke")).toEqual({ kind: "unknown" });
    expect(interpretMessage("What is the weather?")).toEqual({ kind: "unknown" });
    expect(interpretMessage("Could you send me a photo?")).toEqual({ kind: "unknown" });
  });
});
