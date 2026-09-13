import { describe, expect, it } from "vitest";
import { emergencyNotificationMode } from "../src/emergency-notifications.js";

describe("emergency notification mode", () => {
  it("defaults to disabled and accepts dry-run/live", () => {
    expect(emergencyNotificationMode(undefined)).toBe("disabled");
    expect(emergencyNotificationMode("dry-run")).toBe("dry-run");
    expect(emergencyNotificationMode("live")).toBe("live");
  });

  it("rejects unknown modes", () => {
    expect(() => emergencyNotificationMode("send-everything")).toThrow(/disabled, dry-run, or live/);
  });
});
