import { describe, expect, it } from "vitest";
import { extractSensitiveCandidates } from "../src/interpretation/sensitive-data.js";

describe("local sensitive-data detection", () => {
  it("detects email, phone, medical identifiers, and labeled addresses", () => {
    expect(extractSensitiveCandidates(
      "Email me@example.com or call +61 400 123 456. MRN: AB-12345. Address: 12 Example Street, Sydney.",
    )).toMatchObject([
      { kind: "email", value: "me@example.com" },
      { kind: "phone", value: "+61 400 123 456" },
      { kind: "medical_identifier", value: "AB-12345" },
      { kind: "address", value: "12 Example Street, Sydney" },
    ]);
  });

  it("does not treat a normal calendar date as a phone number", () => {
    expect(extractSensitiveCandidates("The appointment is on 15/11/2026.")).toEqual([]);
  });
});
