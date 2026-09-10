import { DEFAULT_DETERMINISTIC_CONFIG, type DeterministicConfig } from "../config.js";
import { normalizeText } from "./normalize.js";
import type { SupportedIntentKind } from "./intents.js";

export type MemoryIntent =
  | {
      kind: Extract<SupportedIntentKind, "record_fact">;
      statement: string;
      category: string;
      status: string;
      effectiveDate: string | null;
      needsYear: boolean;
      dateIssue: "none" | "ambiguous" | "invalid";
    }
  | { kind: Extract<SupportedIntentKind, "when_question">; topic: string }
  | { kind: Extract<SupportedIntentKind, "waiting_question"> }
  | { kind: Extract<SupportedIntentKind, "resolve_fact">; topic: string }
  | { kind: Extract<SupportedIntentKind, "unknown"> };

const MONTHS = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4],
  ["may", 5], ["june", 6], ["july", 7], ["august", 8],
  ["september", 9], ["october", 10], ["november", 11], ["december", 12],
]);

/** Pure deterministic interpretation: text in, typed intent out. */
export function interpretMessage(
  input: string,
  config: Pick<DeterministicConfig, "politeFillers" | "timezone" | "ambiguousNumericDatePolicy"> = DEFAULT_DETERMINISTIC_CONFIG,
  now = new Date(),
): MemoryIntent {
  const normalized = normalizeText(input, config.politeFillers);
  const statement = normalized.text;
  const lower = normalized.lower;
  const isQuestion = normalized.isQuestion;
  if (!statement) return { kind: "unknown" };
  if (/^(?:hi|hello|hey|thanks|thank you|ok|okay)\b(?:\s+assistant)?$/i.test(statement)) {
    return { kind: "unknown" };
  }

  if (/^what\s+am\s+i\s+waiting\s+for\??$/i.test(statement) || /^what'?s\s+pending\??$/i.test(statement)) {
    return { kind: "waiting_question" };
  }

  const whenMatch = lower.match(/^when(?:'s| is| will| would)\s+(.+?)(?:\?|$)/i)
    ?? lower.match(/^(?:could you tell me|can you tell me|do you know|tell me|advise me|let me know)\s+when\s+(.+?)(?:\?|$)/i)
    ?? lower.match(/^what date is\s+(.+?)(?:\?|$)/i);
  if (whenMatch?.[1]) {
    return { kind: "when_question", topic: cleanTopic(whenMatch[1]) };
  }

  const resolveMatch = lower.match(/^(?:mark|set)\s+(.+?)\s+(?:as\s+)?resolved$/i);
  if (resolveMatch?.[1]) {
    return { kind: "resolve_fact", topic: cleanTopic(resolveMatch[1]) };
  }

  // Questions not covered by the explicit V1 vocabulary must not fall through
  // to record_fact merely because they contain words such as "is" or "are".
  if (isQuestion || !looksLikeFactStatement(lower)) return { kind: "unknown" };

  const date = extractDate(statement, config, now);
  return {
    kind: "record_fact",
    statement,
    category: classifyCategory(lower),
    status: /\b(waiting|pending|still waiting|awaiting)\b/i.test(lower) ? "waiting" : "confirmed",
    effectiveDate: date.isoDate,
    needsYear: date.needsYear,
    dateIssue: date.issue,
  };
}

function looksLikeFactStatement(text: string): boolean {
  return /^(?:remember|note|save|record)\b/i.test(text)
    || /\b(?:is|are|was|were|has|have|had|will be|waiting|pending|awaiting|scheduled|booked|on|at|in)\b/i.test(text);
}

function cleanTopic(topic: string): string {
  return topic
    .replace(/^(my|the|a|an)\s+/i, "")
    .replace(/\s+(?:(?:is|are|was|were)\s+)?(?:booked|scheduled)(?:\s+for)?$/i, "")
    .replace(/\s+(?:is|are|was|were)$/i, "")
    .trim();
}

function classifyCategory(text: string): string {
  if (/\b(doctor|medical|health|mri|dentist|hospital|certificate|impaired)\b/.test(text)) return "health";
  if (/\b(centrelink|centerlink|pension|benefit)\b/.test(text)) return "finance";
  if (/\b(test|appointment|dentist|doctor|birthday|booking|booked|scheduled)\b/.test(text)) return "appointment";
  return "general";
}

type DateResult = {
  isoDate: string | null;
  needsYear: boolean;
  issue: "none" | "ambiguous" | "invalid";
};

function extractDate(
  statement: string,
  config: Pick<DeterministicConfig, "timezone" | "ambiguousNumericDatePolicy">,
  now: Date,
): DateResult {
  const relative = statement.match(/\b(day after tomorrow|tomorrow|today)\b/i)?.[1]?.toLowerCase();
  if (relative) {
    const offset = relative === "today" ? 0 : relative === "tomorrow" ? 1 : 2;
    return { isoDate: addDays(zonedToday(now, config.timezone), offset), needsYear: false, issue: "none" };
  }

  const textual = statement.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?\b/i);
  if (textual) {
    const month = MONTHS.get(textual[2].toLowerCase());
    if (!month) return noDate();
    const day = Number(textual[1]);
    const year = textual[3] ? Number(textual[3]) : null;
    if (year !== null && !isValidDate(year, month, day)) return invalidDate();
    if (year === null && !isValidDayMonth(month, day)) return invalidDate();
    return {
      isoDate: year === null ? null : isoDate(year, month, day),
      needsYear: year === null,
      issue: "none",
    };
  }

  const numeric = statement.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (!numeric) return noDate();
  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  const rawYear = numeric[3] ? Number(numeric[3]) : null;
  if (rawYear !== null && rawYear < 100) return invalidDate();

  const isUnambiguouslyDayFirst = first > 12 && second <= 12;
  const isUnambiguouslyMonthFirst = second > 12 && first <= 12;
  let day: number;
  let month: number;
  if (isUnambiguouslyDayFirst) {
    day = first;
    month = second;
  } else if (isUnambiguouslyMonthFirst) {
    day = second;
    month = first;
  } else if (config.ambiguousNumericDatePolicy === "day-first") {
    day = first;
    month = second;
  } else if (config.ambiguousNumericDatePolicy === "month-first") {
    day = second;
    month = first;
  } else {
    return { isoDate: null, needsYear: false, issue: "ambiguous" };
  }

  if (!isValidDayMonth(month, day)) return invalidDate();
  if (rawYear === null) return { isoDate: null, needsYear: true, issue: "none" };
  return { isoDate: isoDate(rawYear, month, day), needsYear: false, issue: "none" };
}

function noDate(): DateResult {
  return { isoDate: null, needsYear: false, issue: "none" };
}

function invalidDate(): DateResult {
  return { isoDate: null, needsYear: false, issue: "invalid" };
}

function isValidDayMonth(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(2024, month);
}

function isValidDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function zonedToday(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
