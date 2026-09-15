import { HEALTH_VOCABULARY, HEALTH_VOCABULARY_VERSION, type HealthVocabularyEntry } from "./health-vocabulary.js";

export type HealthEventCandidate = {
  kind: "record_health_event";
  conceptId: string;
  conceptName: string;
  subtype: HealthVocabularyEntry["subtype"];
  assertion: "present" | "negated" | "uncertain" | "historical";
  experiencer: "self" | "other";
  otherPersonText?: string;
  durationMinutes?: number;
  timeReference?: string;
  sourceText: string;
  vocabularySource: "family-seed";
  vocabularyVersion: string;
};

/**
 * Offline-only seed interpretation. It returns data; it never persists or
 * authorizes a health record and must not be treated as a diagnosis.
 */
export function interpretHealthEvent(input: string): HealthEventCandidate | null {
  const sourceText = input.trim();
  if (!sourceText) return null;
  const lower = sourceText.toLowerCase();
  const entry = findVocabularyEntry(lower);
  if (!entry) return null;

  const other = lower.match(/\bmy\s+(daughter|son|mother|father|partner|wife|husband|child|mum|mom|dad)\b/);
  const experiencer = other ? "other" : "self";
  const assertion = /\b(?:no|without|didn['’]t have|doesn['’]t have|not having)\b/.test(lower)
    ? "negated"
    : /\b(?:might|maybe|possibly|could be|think i(?:'m| am))\b/.test(lower)
      ? "uncertain"
      : /\b(?:used to|previously|in the past|history of)\b/.test(lower)
        ? "historical"
        : "present";

  const duration = lower.match(/\b(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|days?)\b/);
  const durationMinutes = duration ? Number(duration[1]) * (/days?/.test(duration[2]) ? 1440 : /hours?|hrs?/.test(duration[2]) ? 60 : 1) : undefined;
  const timeReference = lower.match(/\b(this morning|this afternoon|this evening|tonight|today|yesterday|last night|currently|right now)\b/)?.[1];

  return {
    kind: "record_health_event",
    conceptId: entry.canonicalId,
    conceptName: entry.canonicalName,
    subtype: entry.subtype,
    assertion,
    experiencer,
    ...(other?.[1] ? { otherPersonText: other[1] } : {}),
    ...(durationMinutes !== undefined ? { durationMinutes } : {}),
    ...(timeReference ? { timeReference } : {}),
    sourceText,
    vocabularySource: "family-seed",
    vocabularyVersion: HEALTH_VOCABULARY_VERSION,
  };
}

function findVocabularyEntry(lower: string): HealthVocabularyEntry | undefined {
  return [...HEALTH_VOCABULARY]
    .sort((left, right) => right.aliases.reduce((length, alias) => Math.max(length, alias.length), 0) - left.aliases.reduce((length, alias) => Math.max(length, alias.length), 0))
    .find((entry) => entry.aliases.some((alias) => new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(lower)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
