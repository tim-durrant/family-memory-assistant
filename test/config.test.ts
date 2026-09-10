import { describe, expect, it } from "vitest";
import {
  DEFAULT_DETERMINISTIC_CONFIG,
  getDeterministicConfig,
  type Env,
} from "../src/config.js";

function environment(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    WHATSAPP_APP_SECRET: "app-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_ACCESS_TOKEN: "access-token",
    WHATSAPP_PHONE_NUMBER_ID: "phone-id",
    WHATSAPP_WABA_ID: "waba-id",
    ...overrides,
  };
}

describe("deterministic configuration", () => {
  it("uses documented defaults when no overrides are provided", () => {
    expect(getDeterministicConfig(environment())).toEqual(DEFAULT_DETERMINISTIC_CONFIG);
  });

  it("parses valid environment overrides", () => {
    expect(getDeterministicConfig(environment({
      FAMILY_TIMEZONE: "Pacific/Auckland",
      DATE_LOCALE: "en-NZ",
      DETERMINISTIC_MIN_TOPIC_TERM_LENGTH: "4",
      DETERMINISTIC_ENABLE_WAITING_FACTS: "false",
      DETERMINISTIC_ENABLE_FACT_RESOLUTION: "false",
      DETERMINISTIC_ENABLE_REMINDER_CREATION: "true",
      DETERMINISTIC_POLITE_FILLERS: "please, if you can",
      DETERMINISTIC_TOPIC_STOP_WORDS: "the,my,is",
      DETERMINISTIC_TOPIC_ALIASES: "driving appointment=driving test,mri results=mri result",
      DETERMINISTIC_UNKNOWN_INTENT_REPLY: "I need more detail.",
    }))).toMatchObject({
      timezone: "Pacific/Auckland",
      dateLocale: "en-NZ",
      minimumTopicTermLength: 4,
      enableWaitingFacts: false,
      enableFactResolution: false,
      enableReminderCreation: true,
      politeFillers: ["please", "if you can"],
      topicStopWords: ["the", "my", "is"],
      topicAliases: [
        { alias: "driving appointment", canonical: "driving test" },
        { alias: "mri results", canonical: "mri result" },
      ],
      unknownIntentReply: "I need more detail.",
    });
  });

  it("rejects malformed numeric, boolean, and empty string overrides", () => {
    expect(() => getDeterministicConfig(environment({ DETERMINISTIC_MIN_TOPIC_TERM_LENGTH: "0" }))).toThrow(/positive integer/);
    expect(() => getDeterministicConfig(environment({ DETERMINISTIC_ENABLE_WAITING_FACTS: "yes" }))).toThrow(/true or false/);
    expect(() => getDeterministicConfig(environment({ FAMILY_TIMEZONE: " " }))).toThrow(/must not be empty/);
  });
});
