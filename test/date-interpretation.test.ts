import { describe, expect, it } from "vitest";
import { DEFAULT_DETERMINISTIC_CONFIG } from "../src/config.js";
import { interpretMessage } from "../src/interpretation/deterministic.js";

const config = {
  ...DEFAULT_DETERMINISTIC_CONFIG,
  politeFillers: ["please"],
  timezone: "Australia/Brisbane",
};
const now = new Date("2026-09-10T02:00:00.000Z");

describe("deterministic date interpretation", () => {
  it("validates textual dates and preserves missing-year clarification", () => {
    expect(interpretMessage("My driving test is 12 October 2026", config, now)).toMatchObject({
      kind: "record_fact",
      effectiveDate: "2026-10-12",
      needsYear: false,
      dateIssue: "none",
    });
    expect(interpretMessage("My driving test is 12 October", config, now)).toMatchObject({
      kind: "record_fact",
      effectiveDate: null,
      needsYear: true,
      dateIssue: "none",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(interpretMessage("My appointment is 31 February 2026", config, now)).toMatchObject({
      kind: "record_fact",
      effectiveDate: null,
      dateIssue: "invalid",
    });
    expect(interpretMessage("My appointment is 29 February 2024", config, now)).toMatchObject({
      kind: "record_fact",
      effectiveDate: "2024-02-29",
      dateIssue: "none",
    });
  });

  it("clarifies ambiguous numeric dates by default", () => {
    expect(interpretMessage("The appointment is 10/12/2026", config, now)).toMatchObject({
      kind: "record_fact",
      effectiveDate: null,
      dateIssue: "ambiguous",
    });
  });

  it("accepts unambiguous numeric dates and configurable numeric policy", () => {
    expect(interpretMessage("The appointment is 31/12/2026", config, now)).toMatchObject({
      effectiveDate: "2026-12-31",
      dateIssue: "none",
    });
    expect(interpretMessage("The appointment is 10/12/2026", { ...config, ambiguousNumericDatePolicy: "day-first" }, now)).toMatchObject({
      effectiveDate: "2026-12-10",
      dateIssue: "none",
    });
    expect(interpretMessage("The appointment is 10/12/2026", { ...config, ambiguousNumericDatePolicy: "month-first" }, now)).toMatchObject({
      effectiveDate: "2026-10-12",
      dateIssue: "none",
    });
  });

  it("resolves a bare weekday to the next occurrence strictly after today", () => {
    expect(interpretMessage("Remember Jacob has soccer on Saturday", config, now)).toMatchObject({
      effectiveDate: "2026-09-12",
      needsYear: false,
      dateIssue: "none",
    });
    expect(interpretMessage("The appointment is Thursday", config, new Date("2026-09-10T02:00:00.000Z"))).toMatchObject({
      effectiveDate: "2026-09-17",
    });
  });

  it("resolves relative dates in the configured timezone", () => {
    expect(interpretMessage("My appointment is today", config, now)).toMatchObject({ effectiveDate: "2026-09-10" });
    expect(interpretMessage("My appointment is tomorrow", config, now)).toMatchObject({ effectiveDate: "2026-09-11" });
    expect(interpretMessage("My appointment is the day after tomorrow", config, now)).toMatchObject({ effectiveDate: "2026-09-12" });
  });
});
