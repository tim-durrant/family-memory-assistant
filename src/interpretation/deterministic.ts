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
      dateParts?: { day: number; month: number };
      topic: string;
    }
  | {
      kind: Extract<SupportedIntentKind, "record_person_attribute">;
      personName: string;
      attributeKey: string;
      attributeLabel: string;
      value: string;
      normalizedValue: string;
    }
  | {
      kind: Extract<SupportedIntentKind, "query_person_attribute">;
      personName: string;
      attributeKey: string;
      attributeLabel: string;
      requestedValue: string | null;
    }
  | { kind: Extract<SupportedIntentKind, "add_person" | "link_person_whatsapp" | "confirm_person_whatsapp_link">; personName: string }
  | { kind: Extract<SupportedIntentKind, "record_note">; noteText: string; noteType: string; shareTarget: "self" | "everyone" | string[] }
  | { kind: Extract<SupportedIntentKind, "query_note">; scope: "today" | "latest" | "date"; requestedDate: string | null; keywords: string[] }
  | { kind: Extract<SupportedIntentKind, "help">; topic?: string }
  | { kind: Extract<SupportedIntentKind, "add_emergency_contact" | "confirm_emergency_contact">; phoneNumber: string }
  | { kind: Extract<SupportedIntentKind, "set_emergency_safe_word" | "confirm_emergency_safe_word">; safeWord: string }
  | { kind: Extract<SupportedIntentKind, "grant_permission" | "revoke_permission">; personName: string; permission: "read" | "write" | "read_write"; category: string }
  | { kind: Extract<SupportedIntentKind, "create_reminder">; dueAt: string; reminderText: string }
  | { kind: Extract<SupportedIntentKind, "list_reminders"> }
  | { kind: Extract<SupportedIntentKind, "cancel_reminder">; reminderCode: string }
  | { kind: Extract<SupportedIntentKind, "when_question">; topic: string }
  | { kind: Extract<SupportedIntentKind, "waiting_question"> }
  | { kind: Extract<SupportedIntentKind, "resolve_fact" | "forget_fact">; topic: string }
  | { kind: Extract<SupportedIntentKind, "unknown"> };

const MONTHS = new Map([
  ["january", 1], ["february", 2], ["march", 3], ["april", 4],
  ["may", 5], ["june", 6], ["july", 7], ["august", 8],
  ["september", 9], ["october", 10], ["november", 11], ["december", 12],
]);

/** Pure deterministic interpretation: text in, typed intent out. */
export function interpretMessage(
  input: string,
  config: Pick<DeterministicConfig, "politeFillers" | "timezone" | "ambiguousNumericDatePolicy" | "personAttributeDefinitions"> = DEFAULT_DETERMINISTIC_CONFIG,
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

  const addEmergencyContact = statement.match(/^(?:add|set up)\s+(?:a\s+)?trusted emergency contact\s+([+\d][\d\s().-]{6,})$/i);
  if (addEmergencyContact?.[1]) return { kind: "add_emergency_contact", phoneNumber: normalizePhone(addEmergencyContact[1]) };
  const confirmEmergencyContact = statement.match(/^confirm\s+(?:the\s+)?trusted emergency contact\s+([+\d][\d\s().-]{6,})$/i);
  if (confirmEmergencyContact?.[1]) return { kind: "confirm_emergency_contact", phoneNumber: normalizePhone(confirmEmergencyContact[1]) };
  const safeWord = statement.match(/^set\s+my\s+emergency\s+safe\s+word\s+to\s+([a-z][a-z0-9_-]{2,30})$/i);
  if (safeWord?.[1]) return { kind: "set_emergency_safe_word", safeWord: safeWord[1].toLowerCase() };
  const confirmSafeWord = statement.match(/^confirm\s+my\s+emergency\s+safe\s+word\s+([a-z][a-z0-9_-]{2,30})$/i);
  if (confirmSafeWord?.[1]) return { kind: "confirm_emergency_safe_word", safeWord: confirmSafeWord[1].toLowerCase() };

  const grantPermission = statement.match(/^grant\s+(.+?)\s+(read\s+and\s+write|read_write|read|write)\s+access\s+to\s+my\s+(.+?)\s*$/i);
  if (grantPermission?.[1] && grantPermission[2] && grantPermission[3]) {
    return { kind: "grant_permission", personName: stripPossessive(grantPermission[1]), permission: normalizePermission(grantPermission[2]), category: normalizePermissionCategory(grantPermission[3]) };
  }
  const revokePermission = statement.match(/^revoke\s+(.+?)(?:['’]s)?\s+(?:access|permission)\s+to\s+my\s+(.+?)\s*$/i);
  if (revokePermission?.[1] && revokePermission[2]) {
    return { kind: "revoke_permission", personName: stripPossessive(revokePermission[1]), permission: "read_write", category: normalizePermissionCategory(revokePermission[2]) };
  }

  if (/^(?:help|how do i use this|what can i do)\??$/i.test(statement)) return { kind: "help" };
  if (/^(?:list|show) my reminders\??$/i.test(statement)) return { kind: "list_reminders" };
  const cancelReminder = statement.match(/^cancel reminder\s+(\d{2}[a-z])\??$/i);
  if (cancelReminder?.[1]) return { kind: "cancel_reminder", reminderCode: cancelReminder[1].toUpperCase() };
  const reminder = statement.match(/^(?:remind me|set a reminder)\s+(?:on\s+)?(\d{1,2})\s+([a-z]+)\s+(\d{4})\s+at\s+(\d{1,2})(?::(\d{2}))?\s+to\s+(.+)$/i);
  if (reminder?.[1] && reminder[2] && reminder[3] && reminder[4] && reminder[6]) {
    const month = MONTHS.get(reminder[2].toLowerCase());
    const hour = Number(reminder[4]);
    const minute = Number(reminder[5] ?? "0");
    if (!month || hour > 23 || minute > 59) return { kind: "unknown" };
    const dueAt = localDateTimeToIso(Number(reminder[3]), month, Number(reminder[1]), hour, minute, config.timezone);
    if (!dueAt) return { kind: "unknown" };
    return { kind: "create_reminder", dueAt, reminderText: reminder[6].trim() };
  }
  if (/^(?:remind me|set a reminder)\b/i.test(statement)) return { kind: "unknown" };
  const helpTopic = statement.match(/^how do i (save a note|look up a fact|register a family member)\??$/i);
  if (helpTopic?.[1]) return { kind: "help", topic: helpTopic[1] };

  const noteMatch = input.trim().match(/^(?:save|store|remember)\s+(?:this\s+)?(?:note|entry)(?:\s+for\s+([^:]+?))?\s*:\s*([\s\S]+)$/i);
  if (noteMatch?.[2]) {
    const audience = noteMatch[1]?.trim().toLowerCase();
    const audienceNames = audience?.split(",").map((name) => name.trim()).filter((name) => name && name !== "me") ?? [];
    const shareTarget = !audience || audience === "me" || audienceNames.length === 0 ? "self" : audience === "everyone" || audience === "all" ? "everyone" : audienceNames;
    return { kind: "record_note", noteText: noteMatch[2].trim(), noteType: "general", shareTarget };
  }

  const todayQuery = statement.match(/^(?:what did i write|show me my notes?)\s+(?:about\s+(.+?)\s+)?today\??$/i);
  if (todayQuery) return { kind: "query_note", scope: "today", requestedDate: null, keywords: splitKeywords(todayQuery[1]) };
  const latestQuery = statement.match(/^show me my latest note(?:\s+about\s+(.+?))?\??$/i);
  if (latestQuery) return { kind: "query_note", scope: "latest", requestedDate: null, keywords: splitKeywords(latestQuery[1]) };
  const dateQuery = statement.match(/^(?:what did i write|show me my notes?|show me my note)\s+(?:about\s+(.+?)\s+)?(?:on|from)\s+(.+?)\??$/i);
  if (dateQuery) return { kind: "query_note", scope: "date", requestedDate: parseNoteDate(dateQuery[2]), keywords: splitKeywords(dateQuery[1]) };
  const keywordQuery = statement.match(/^show me my notes?\s+about\s+(.+?)\??$/i);
  if (keywordQuery) return { kind: "query_note", scope: "latest", requestedDate: null, keywords: splitKeywords(keywordQuery[1]) };

  const addPersonMatch = statement.match(/^add\s+(.+?)\s+as\s+a?\s*family member$/i);
  if (addPersonMatch?.[1]) return { kind: "add_person", personName: addPersonMatch[1].trim() };
  const linkPersonMatch = statement.match(/^link\s+(.+?)(?:['’]s)?\s+(?:WhatsApp|whatsapp)\s*(?:number|contact)?$/i);
  if (linkPersonMatch?.[1]) return { kind: "link_person_whatsapp", personName: linkPersonMatch[1].trim() };
  const confirmLinkMatch = statement.match(/^confirm\s+(?:the\s+)?(?:WhatsApp\s+)?link(?:ing)?\s+(?:for\s+)?(.+?)(?:['’]s)?\s*(?:WhatsApp)?$/i);
  if (confirmLinkMatch?.[1]) return { kind: "confirm_person_whatsapp_link", personName: confirmLinkMatch[1].trim() };

  const attributeRecord = matchPersonAttributeRecord(statement, config.personAttributeDefinitions);
  if (attributeRecord) return attributeRecord;

  const attributeQuery = matchPersonAttributeQuery(statement, config.personAttributeDefinitions);
  if (attributeQuery) return attributeQuery;

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

  const forgetMatch = lower.match(/^(?:forget|delete|remove)\s+(.+?)$/i);
  if (forgetMatch?.[1]) {
    return { kind: "forget_fact", topic: cleanTopic(forgetMatch[1]) };
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
    ...(date.day !== undefined && date.month !== undefined ? { dateParts: { day: date.day, month: date.month } } : {}),
    topic: inferFactTopic(statement),
  };
}

function matchPersonAttributeRecord(
  statement: string,
  definitions: DeterministicConfig["personAttributeDefinitions"],
): Extract<MemoryIntent, { kind: "record_person_attribute" }> | undefined {
  for (const definition of definitions) {
    for (const alias of definition.aliases) {
      const match = statement.match(new RegExp(`^(.+?)\\s+(?:has|has got)\\s+(.+?)\\s+${escapeRegExp(alias)}[.!]?$`, "i"));
      if (!match) continue;
      const value = match[2].trim();
      return {
        kind: "record_person_attribute",
        personName: match[1].trim(),
        attributeKey: definition.key,
        attributeLabel: alias,
        value,
        normalizedValue: value.toLowerCase(),
      };
    }
  }
  return undefined;
}

function matchPersonAttributeQuery(
  statement: string,
  definitions: DeterministicConfig["personAttributeDefinitions"],
): Extract<MemoryIntent, { kind: "query_person_attribute" }> | undefined {
  const colourMatch = statement.match(/^what\s+(?:colour|color)\s+are\s+(.+?)(?:['’]s|s)\s+(.+?)\??$/i);
  if (colourMatch) {
    const definition = definitions.find((item) => item.aliases.some((alias) => alias.toLowerCase() === colourMatch[2].trim().toLowerCase()));
    if (definition) {
      return {
        kind: "query_person_attribute",
        personName: colourMatch[1].trim(),
        attributeKey: definition.key,
        attributeLabel: colourMatch[2].trim(),
        requestedValue: null,
      };
    }
  }

  const whatAreMatch = statement.match(/^what\s+are\s+(.+?)\s+(?:['’]s|s)?\s*(.+?)\??$/i);
  if (whatAreMatch) {
    const definition = definitions.find((item) => item.aliases.some((alias) => alias.toLowerCase() === whatAreMatch[2].trim().toLowerCase()));
    if (definition) {
      return {
        kind: "query_person_attribute",
        personName: whatAreMatch[1].trim(),
        attributeKey: definition.key,
        attributeLabel: whatAreMatch[2].trim(),
        requestedValue: null,
      };
    }
  }

  const whatMatch = statement.match(/^what\s+(.+?)\s+does\s+(.+?)\s+have\??$/i);
  if (whatMatch) {
    const definition = definitions.find((item) => item.aliases.some((alias) => alias.toLowerCase() === whatMatch[1].trim().toLowerCase()));
    if (definition) {
      return {
        kind: "query_person_attribute",
        personName: whatMatch[2].trim(),
        attributeKey: definition.key,
        attributeLabel: whatMatch[1].trim(),
        requestedValue: null,
      };
    }
  }

  const doesMatch = statement.match(/^does\s+(.+?)\s+have\s+(.+?)\s+([^?]+)\??$/i);
  if (!doesMatch) return undefined;
  const definition = definitions.find((item) => item.aliases.some((alias) => alias.toLowerCase() === doesMatch[3].trim().toLowerCase()));
  if (!definition) return undefined;
  return {
    kind: "query_person_attribute",
    personName: doesMatch[1].trim(),
    attributeKey: definition.key,
    attributeLabel: doesMatch[3].trim(),
    requestedValue: doesMatch[2].trim().toLowerCase(),
  };
}

function splitKeywords(value: string | undefined): string[] {
  return value?.trim().toLowerCase().split(/\s+/).filter((word) => word.length >= 3) ?? [];
}

function parseNoteDate(value: string): string | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const textual = value.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i);
  if (!textual) return null;
  const month = MONTHS.get(textual[2].toLowerCase());
  return month ? `${textual[3]}-${month.toString().padStart(2, "0")}-${textual[1].padStart(2, "0")}` : null;
}

function localDateTimeToIso(year: number, month: number, day: number, hour: number, minute: number, timezone: string): string | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(guess));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  const observed = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute);
  const offset = observed - guess;
  const result = new Date(guess - offset);
  const check = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(result);
  const checked = Object.fromEntries(check.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return checked.year === year && checked.month === month && checked.day === day && checked.hour === hour && checked.minute === minute ? result.toISOString() : null;
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? `+${digits}` : value.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripPossessive(value: string): string {
  return value.trim().replace(/[’']s$/i, "").trim();
}

function normalizePermission(value: string): "read" | "write" | "read_write" {
  return /read\s+and\s+write|read_write/i.test(value) ? "read_write" : value.toLowerCase() as "read" | "write";
}

function normalizePermissionCategory(value: string): string {
  return value.trim().toLowerCase()
    .replace(/^(?:my|the)\s+/, "")
    .replace(/\s+(?:information|records?|data)$/, "")
    .trim();
}

function looksLikeFactStatement(text: string): boolean {
  return /^(?:remember|note|save|record)\b/i.test(text)
    || /\b(?:is|are|was|were|has|have|had|will be|waiting|pending|awaiting|scheduled|booked|on|at|in)\b/i.test(text);
}

function inferFactTopic(statement: string): string {
  const withoutDate = statement
    .replace(/\b(?:today|tomorrow|the day after tomorrow)\b/gi, "")
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, "")
    .replace(/^(?:remember|note|save|record)\s+/i, "")
    .replace(/\s+(?:is|are|was|were|has|have|had|will be)(?:\s+on)?\s*$/i, "")
    .trim();
  return cleanTopic(withoutDate);
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
  day?: number;
  month?: number;
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
      ...(year === null ? { day, month } : {}),
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
