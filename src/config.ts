export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  WHATSAPP_APP_SECRET: string;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_WABA_ID: string;
  FAMILY_TIMEZONE?: string;
  DATE_LOCALE?: string;
  AMBIGUOUS_NUMERIC_DATE_POLICY?: string;
  WHATSAPP_TRANSPORT?: "dojo" | "meta" | "twilio";
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_NUMBER?: string;
  DETERMINISTIC_MIN_TOPIC_TERM_LENGTH?: string;
  DETERMINISTIC_ENABLE_WAITING_FACTS?: string;
  DETERMINISTIC_ENABLE_FACT_RESOLUTION?: string;
  DETERMINISTIC_ENABLE_REMINDER_CREATION?: string;
  DETERMINISTIC_POLITE_FILLERS?: string;
  DETERMINISTIC_TOPIC_STOP_WORDS?: string;
  DETERMINISTIC_TOPIC_ALIASES?: string;
  DETERMINISTIC_UNKNOWN_INTENT_REPLY?: string;
  DETERMINISTIC_AMBIGUOUS_FACT_REPLY?: string;
  DETERMINISTIC_MISSING_YEAR_REPLY?: string;
  DETERMINISTIC_AMBIGUOUS_DATE_REPLY?: string;
  DETERMINISTIC_INVALID_DATE_REPLY?: string;
  DETERMINISTIC_NO_MATCHING_FACT_REPLY?: string;
  DETERMINISTIC_NO_WAITING_FACTS_REPLY?: string;
  DETERMINISTIC_RESOLUTION_NOT_FOUND_REPLY?: string;
  DETERMINISTIC_RESOLUTION_AMBIGUOUS_REPLY?: string;
  DETERMINISTIC_RESOLUTION_SUCCESS_REPLY?: string;
}

export type DeterministicConfig = {
  timezone: string;
  dateLocale: string;
  ambiguousNumericDatePolicy: "clarify" | "day-first" | "month-first";
  minimumTopicTermLength: number;
  enableWaitingFacts: boolean;
  enableFactResolution: boolean;
  enableReminderCreation: boolean;
  politeFillers: readonly string[];
  topicStopWords: readonly string[];
  topicAliases: readonly { alias: string; canonical: string }[];
  unknownIntentReply: string;
  ambiguousFactReply: string;
  missingYearReply: string;
  ambiguousDateReply: string;
  invalidDateReply: string;
  noMatchingFactReply: string;
  noWaitingFactsReply: string;
  resolutionNotFoundReply: string;
  resolutionAmbiguousReply: string;
  resolutionSuccessReply: string;
};

export const DEFAULT_DETERMINISTIC_CONFIG: DeterministicConfig = {
  timezone: "Australia/Sydney",
  dateLocale: "en-AU",
  ambiguousNumericDatePolicy: "clarify",
  minimumTopicTermLength: 3,
  enableWaitingFacts: true,
  enableFactResolution: true,
  enableReminderCreation: false,
  politeFillers: ["please", "kindly"],
  topicStopWords: ["a", "an", "are", "at", "for", "in", "is", "my", "on", "the", "to", "was", "were"],
  topicAliases: [],
  // An empty unknown-intent reply preserves the current behaviour: ignore it.
  unknownIntentReply: "",
  ambiguousFactReply: "I found more than one possibility: {matches}. Which one do you mean?",
  missingYearReply: "Saved: {statement}. What year should I use?",
  ambiguousDateReply: "I’m not sure which date you mean. Please use a month name or a date with an unambiguous day/month.",
  invalidDateReply: "I couldn’t validate that date. Please check the day, month, and year.",
  noMatchingFactReply: "I don’t know the answer to that yet.",
  noWaitingFactsReply: "I don’t have anything recorded as waiting right now.",
  resolutionNotFoundReply: "I couldn’t find a matching fact to resolve.",
  resolutionAmbiguousReply: "I found more than one matching fact. Which one should I mark as resolved?",
  resolutionSuccessReply: "Marked that as resolved.",
};

export function getDeterministicConfig(env: Env): DeterministicConfig {
  return {
    timezone: nonEmptyString(env.FAMILY_TIMEZONE, DEFAULT_DETERMINISTIC_CONFIG.timezone, "FAMILY_TIMEZONE"),
    dateLocale: nonEmptyString(env.DATE_LOCALE, DEFAULT_DETERMINISTIC_CONFIG.dateLocale, "DATE_LOCALE"),
    ambiguousNumericDatePolicy: datePolicy(env.AMBIGUOUS_NUMERIC_DATE_POLICY),
    minimumTopicTermLength: positiveInteger(
      env.DETERMINISTIC_MIN_TOPIC_TERM_LENGTH,
      DEFAULT_DETERMINISTIC_CONFIG.minimumTopicTermLength,
      "DETERMINISTIC_MIN_TOPIC_TERM_LENGTH",
    ),
    enableWaitingFacts: booleanValue(env.DETERMINISTIC_ENABLE_WAITING_FACTS, DEFAULT_DETERMINISTIC_CONFIG.enableWaitingFacts, "DETERMINISTIC_ENABLE_WAITING_FACTS"),
    enableFactResolution: booleanValue(env.DETERMINISTIC_ENABLE_FACT_RESOLUTION, DEFAULT_DETERMINISTIC_CONFIG.enableFactResolution, "DETERMINISTIC_ENABLE_FACT_RESOLUTION"),
    enableReminderCreation: booleanValue(env.DETERMINISTIC_ENABLE_REMINDER_CREATION, DEFAULT_DETERMINISTIC_CONFIG.enableReminderCreation, "DETERMINISTIC_ENABLE_REMINDER_CREATION"),
    politeFillers: listValue(env.DETERMINISTIC_POLITE_FILLERS, DEFAULT_DETERMINISTIC_CONFIG.politeFillers),
    topicStopWords: listValue(env.DETERMINISTIC_TOPIC_STOP_WORDS, DEFAULT_DETERMINISTIC_CONFIG.topicStopWords),
    topicAliases: aliasValue(env.DETERMINISTIC_TOPIC_ALIASES),
    unknownIntentReply: textValue(env.DETERMINISTIC_UNKNOWN_INTENT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.unknownIntentReply),
    ambiguousFactReply: textValue(env.DETERMINISTIC_AMBIGUOUS_FACT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.ambiguousFactReply),
    missingYearReply: textValue(env.DETERMINISTIC_MISSING_YEAR_REPLY, DEFAULT_DETERMINISTIC_CONFIG.missingYearReply),
    ambiguousDateReply: textValue(env.DETERMINISTIC_AMBIGUOUS_DATE_REPLY, DEFAULT_DETERMINISTIC_CONFIG.ambiguousDateReply),
    invalidDateReply: textValue(env.DETERMINISTIC_INVALID_DATE_REPLY, DEFAULT_DETERMINISTIC_CONFIG.invalidDateReply),
    noMatchingFactReply: textValue(env.DETERMINISTIC_NO_MATCHING_FACT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.noMatchingFactReply),
    noWaitingFactsReply: textValue(env.DETERMINISTIC_NO_WAITING_FACTS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.noWaitingFactsReply),
    resolutionNotFoundReply: textValue(env.DETERMINISTIC_RESOLUTION_NOT_FOUND_REPLY, DEFAULT_DETERMINISTIC_CONFIG.resolutionNotFoundReply),
    resolutionAmbiguousReply: textValue(env.DETERMINISTIC_RESOLUTION_AMBIGUOUS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.resolutionAmbiguousReply),
    resolutionSuccessReply: textValue(env.DETERMINISTIC_RESOLUTION_SUCCESS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.resolutionSuccessReply),
  };
}

function nonEmptyString(value: string | undefined, fallback: string, name: string): string {
  if (value === undefined) return fallback;
  if (!value.trim()) throw new Error(`${name} must not be empty`);
  return value.trim();
}

function textValue(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

function listValue(value: string | undefined, fallback: readonly string[]): readonly string[] {
  if (value === undefined) return fallback;
  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) throw new Error("Configured list must contain at least one value");
  return entries;
}

function aliasValue(value: string | undefined): readonly { alias: string; canonical: string }[] {
  if (value === undefined || !value.trim()) return DEFAULT_DETERMINISTIC_CONFIG.topicAliases;
  return value.split(",").map((entry) => {
    const [alias, canonical] = entry.split("=").map((part) => part.trim());
    if (!alias || !canonical) throw new Error("DETERMINISTIC_TOPIC_ALIASES must use alias=canonical pairs");
    return { alias: alias.toLowerCase(), canonical: canonical.toLowerCase() };
  });
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value)) throw new Error(`${name} must be a positive integer`);
  return Number(value);
}

function booleanValue(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be either true or false`);
}

function datePolicy(value: string | undefined): "clarify" | "day-first" | "month-first" {
  if (value === undefined) return DEFAULT_DETERMINISTIC_CONFIG.ambiguousNumericDatePolicy;
  if (value === "clarify" || value === "day-first" || value === "month-first") return value;
  throw new Error("AMBIGUOUS_NUMERIC_DATE_POLICY must be clarify, day-first, or month-first");
}

export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === "development";
}
