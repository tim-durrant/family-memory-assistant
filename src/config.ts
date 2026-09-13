import { listFamilySettings } from "./repositories/settings.js";

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
  TWILIO_SMS_NUMBER?: string;
  EMERGENCY_NOTIFICATION_MODE?: string;
  UNAUTHORIZED_SENDER_RESPONSE_MODE?: string;
  UNAUTHORIZED_SENDER_REPLY?: string;
  DETERMINISTIC_MIN_TOPIC_TERM_LENGTH?: string;
  DETERMINISTIC_ENABLE_WAITING_FACTS?: string;
  DETERMINISTIC_ENABLE_FACT_RESOLUTION?: string;
  DETERMINISTIC_ENABLE_REMINDER_CREATION?: string;
  DETERMINISTIC_FACT_CONFLICT_POLICY?: string;
  DETERMINISTIC_FACT_DELETE_POLICY?: string;
  DETERMINISTIC_FACT_CONFIRMATION_TTL_MINUTES?: string;
  CLARIFICATION_TTL_MINUTES?: string;
  DETERMINISTIC_POLITE_FILLERS?: string;
  DETERMINISTIC_TOPIC_STOP_WORDS?: string;
  DETERMINISTIC_TOPIC_ALIASES?: string;
  DETERMINISTIC_PERSON_ATTRIBUTES?: string;
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
  DETERMINISTIC_FACT_CONFLICT_REPLY?: string;
  DETERMINISTIC_FACT_DELETE_REPLY?: string;
  DETERMINISTIC_FACT_CHANGE_CANCELLED_REPLY?: string;
  DETERMINISTIC_FACT_CHANGE_SUCCESS_REPLY?: string;
  DETERMINISTIC_UNKNOWN_PERSON_REPLY?: string;
  DETERMINISTIC_PERMISSION_DENIED_REPLY?: string;
  DETERMINISTIC_ADD_PERSON_REPLY?: string;
  DETERMINISTIC_PERSON_ALREADY_EXISTS_REPLY?: string;
  DETERMINISTIC_NOTE_SAVED_REPLY?: string;
  DETERMINISTIC_NOTE_NOT_FOUND_REPLY?: string;
  DETERMINISTIC_ENTITY_RELATIONSHIP_REPLY?: string;
  DETERMINISTIC_ENTITY_RELATIONSHIP_SAVED_REPLY?: string;
  DETERMINISTIC_PERSON_APPROVAL_REPLY?: string;
  DETERMINISTIC_PERSON_APPROVAL_RESULT_REPLY?: string;
  DETERMINISTIC_PERSON_PENDING_NOTICE?: string;
  DETERMINISTIC_ATTRIBUTE_SAVED_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_ALREADY_KNOWN_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_CONFLICT_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_NOT_FOUND_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_AMBIGUOUS_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_QUERY_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_MATCH_REPLY?: string;
  DETERMINISTIC_ATTRIBUTE_DIFFERENT_REPLY?: string;
}

export type DeterministicConfig = {
  timezone: string;
  dateLocale: string;
  ambiguousNumericDatePolicy: "clarify" | "day-first" | "month-first";
  minimumTopicTermLength: number;
  enableWaitingFacts: boolean;
  enableFactResolution: boolean;
  enableReminderCreation: boolean;
  factConflictPolicy: "confirm";
  factDeletePolicy: "confirm";
  factConfirmationTtlMinutes: number;
  clarificationTtlMinutes: number;
  politeFillers: readonly string[];
  topicStopWords: readonly string[];
  topicAliases: readonly { alias: string; canonical: string }[];
  personAttributeDefinitions: readonly { key: string; aliases: readonly string[] }[];
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
  factConflictReply: string;
  factDeleteReply: string;
  factChangeCancelledReply: string;
  factChangeSuccessReply: string;
  unknownPersonReply: string;
  permissionDeniedReply: string;
  addPersonReply: string;
  personAlreadyExistsReply: string;
  noteSavedReply: string;
  noteNotFoundReply: string;
  entityRelationshipReply: string;
  entityRelationshipSavedReply: string;
  personApprovalReply: string;
  personApprovalResultReply: string;
  personPendingNotice: string;
  attributeSavedReply: string;
  attributeAlreadyKnownReply: string;
  attributeConflictReply: string;
  attributeNotFoundReply: string;
  attributeAmbiguousReply: string;
  attributeQueryReply: string;
  attributeMatchReply: string;
  attributeDifferentReply: string;
};

export const DEFAULT_DETERMINISTIC_CONFIG: DeterministicConfig = {
  timezone: "Australia/Brisbane",
  dateLocale: "en-AU",
  ambiguousNumericDatePolicy: "clarify",
  minimumTopicTermLength: 3,
  enableWaitingFacts: true,
  enableFactResolution: true,
  enableReminderCreation: false,
  factConflictPolicy: "confirm",
  factDeletePolicy: "confirm",
  factConfirmationTtlMinutes: 30,
  clarificationTtlMinutes: 30,
  politeFillers: ["please", "kindly"],
  topicStopWords: ["a", "an", "are", "at", "for", "in", "is", "my", "on", "the", "to", "was", "were"],
  topicAliases: [],
  personAttributeDefinitions: [
    { key: "hair_length", aliases: ["hair"] },
    { key: "eye_colour", aliases: ["eyes", "eye colour", "eye color"] },
  ],
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
  factConflictReply: "I found an existing fact: {existing}. Should I replace it with {statement}? Reply yes or no.",
  factDeleteReply: "Should I forget this fact: {existing}? Reply yes or no.",
  factChangeCancelledReply: "Okay, I left the existing fact unchanged.",
  factChangeSuccessReply: "Done.",
  unknownPersonReply: "I don’t know that person yet. To add them, say: Add {person} as a family member.",
  permissionDeniedReply: "I can’t do that because this information requires additional permission.",
  addPersonReply: "I’ve added {person} as a pending family member and asked all registered users for approval. Please reply yes or no to approve adding {person}. Attributes can be recorded while approval is pending.",
  personAlreadyExistsReply: "{person} is already registered as a family member with status {status}.",
  noteSavedReply: "Saved your note. You can retrieve it by saying: What did I write today?",
  noteNotFoundReply: "I don’t have a note from that date yet.",
  entityRelationshipReply: "I noticed {person} mentioned in that note. What is {person}’s relationship to you? Reply with: family member, doctor, or another relationship.",
  entityRelationshipSavedReply: "I’ll remember {person} as {relationship} locally. It was not added as a family member.",
  personApprovalReply: "A new family member has been proposed: {person}. Do you approve adding {person}? Reply yes or no.",
  personApprovalResultReply: "Recorded your {decision} decision for {person}. The family-member status is {status}.",
  personPendingNotice: " I’ve stored it while {person}’s family-member approval is {status}.",
  attributeSavedReply: "Saved: {person} has {value} {attribute}.",
  attributeAlreadyKnownReply: "I already have that recorded: {person} has {value} {attribute}.",
  attributeConflictReply: "I have conflicting information about {person}'s {attribute}. Which value should I keep?",
  attributeNotFoundReply: "I don’t have that attribute recorded for {person} yet.",
  attributeAmbiguousReply: "I have more than one current value recorded for {person}'s {attribute}.",
  attributeQueryReply: "{person} has {value} {attribute}.",
  attributeMatchReply: "Yes, I have recorded that {person} has {value} {attribute}.",
  attributeDifferentReply: "I have recorded that {person} has {value} {attribute}; I do not have a confirmed record of {requested} {attribute}.",
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
    factConflictPolicy: policyValue(env.DETERMINISTIC_FACT_CONFLICT_POLICY, "confirm", "DETERMINISTIC_FACT_CONFLICT_POLICY"),
    factDeletePolicy: policyValue(env.DETERMINISTIC_FACT_DELETE_POLICY, "confirm", "DETERMINISTIC_FACT_DELETE_POLICY"),
    factConfirmationTtlMinutes: positiveInteger(
      env.DETERMINISTIC_FACT_CONFIRMATION_TTL_MINUTES,
      DEFAULT_DETERMINISTIC_CONFIG.factConfirmationTtlMinutes,
      "DETERMINISTIC_FACT_CONFIRMATION_TTL_MINUTES",
    ),
    clarificationTtlMinutes: positiveInteger(
      env.CLARIFICATION_TTL_MINUTES,
      DEFAULT_DETERMINISTIC_CONFIG.clarificationTtlMinutes,
      "CLARIFICATION_TTL_MINUTES",
    ),
    politeFillers: listValue(env.DETERMINISTIC_POLITE_FILLERS, DEFAULT_DETERMINISTIC_CONFIG.politeFillers),
    topicStopWords: listValue(env.DETERMINISTIC_TOPIC_STOP_WORDS, DEFAULT_DETERMINISTIC_CONFIG.topicStopWords),
    topicAliases: aliasValue(env.DETERMINISTIC_TOPIC_ALIASES),
    personAttributeDefinitions: attributeDefinitions(env.DETERMINISTIC_PERSON_ATTRIBUTES),
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
    factConflictReply: textValue(env.DETERMINISTIC_FACT_CONFLICT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.factConflictReply),
    factDeleteReply: textValue(env.DETERMINISTIC_FACT_DELETE_REPLY, DEFAULT_DETERMINISTIC_CONFIG.factDeleteReply),
    factChangeCancelledReply: textValue(env.DETERMINISTIC_FACT_CHANGE_CANCELLED_REPLY, DEFAULT_DETERMINISTIC_CONFIG.factChangeCancelledReply),
    factChangeSuccessReply: textValue(env.DETERMINISTIC_FACT_CHANGE_SUCCESS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.factChangeSuccessReply),
    unknownPersonReply: textValue(env.DETERMINISTIC_UNKNOWN_PERSON_REPLY, DEFAULT_DETERMINISTIC_CONFIG.unknownPersonReply),
    permissionDeniedReply: textValue(env.DETERMINISTIC_PERMISSION_DENIED_REPLY, DEFAULT_DETERMINISTIC_CONFIG.permissionDeniedReply),
    addPersonReply: textValue(env.DETERMINISTIC_ADD_PERSON_REPLY, DEFAULT_DETERMINISTIC_CONFIG.addPersonReply),
    personAlreadyExistsReply: textValue(env.DETERMINISTIC_PERSON_ALREADY_EXISTS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.personAlreadyExistsReply),
    noteSavedReply: textValue(env.DETERMINISTIC_NOTE_SAVED_REPLY, DEFAULT_DETERMINISTIC_CONFIG.noteSavedReply),
    noteNotFoundReply: textValue(env.DETERMINISTIC_NOTE_NOT_FOUND_REPLY, DEFAULT_DETERMINISTIC_CONFIG.noteNotFoundReply),
    entityRelationshipReply: textValue(env.DETERMINISTIC_ENTITY_RELATIONSHIP_REPLY, DEFAULT_DETERMINISTIC_CONFIG.entityRelationshipReply),
    entityRelationshipSavedReply: textValue(env.DETERMINISTIC_ENTITY_RELATIONSHIP_SAVED_REPLY, DEFAULT_DETERMINISTIC_CONFIG.entityRelationshipSavedReply),
    personApprovalReply: textValue(env.DETERMINISTIC_PERSON_APPROVAL_REPLY, DEFAULT_DETERMINISTIC_CONFIG.personApprovalReply),
    personApprovalResultReply: textValue(env.DETERMINISTIC_PERSON_APPROVAL_RESULT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.personApprovalResultReply),
    personPendingNotice: textValue(env.DETERMINISTIC_PERSON_PENDING_NOTICE, DEFAULT_DETERMINISTIC_CONFIG.personPendingNotice),
    attributeSavedReply: textValue(env.DETERMINISTIC_ATTRIBUTE_SAVED_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeSavedReply),
    attributeAlreadyKnownReply: textValue(env.DETERMINISTIC_ATTRIBUTE_ALREADY_KNOWN_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeAlreadyKnownReply),
    attributeConflictReply: textValue(env.DETERMINISTIC_ATTRIBUTE_CONFLICT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeConflictReply),
    attributeNotFoundReply: textValue(env.DETERMINISTIC_ATTRIBUTE_NOT_FOUND_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeNotFoundReply),
    attributeAmbiguousReply: textValue(env.DETERMINISTIC_ATTRIBUTE_AMBIGUOUS_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeAmbiguousReply),
    attributeQueryReply: textValue(env.DETERMINISTIC_ATTRIBUTE_QUERY_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeQueryReply),
    attributeMatchReply: textValue(env.DETERMINISTIC_ATTRIBUTE_MATCH_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeMatchReply),
    attributeDifferentReply: textValue(env.DETERMINISTIC_ATTRIBUTE_DIFFERENT_REPLY, DEFAULT_DETERMINISTIC_CONFIG.attributeDifferentReply),
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

function attributeDefinitions(value: string | undefined): readonly { key: string; aliases: readonly string[] }[] {
  if (value === undefined || !value.trim()) return DEFAULT_DETERMINISTIC_CONFIG.personAttributeDefinitions;
  const definitions = value.split(",").map((entry) => {
    const [aliasText, key] = entry.split("=").map((part) => part.trim().toLowerCase());
    const aliases = aliasText?.split("|").map((alias) => alias.trim()).filter(Boolean) ?? [];
    if (!key || aliases.length === 0) throw new Error("DETERMINISTIC_PERSON_ATTRIBUTES must use alias=key pairs");
    return { key, aliases };
  });
  return definitions;
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

function policyValue(value: string | undefined, fallback: "confirm", name: string): "confirm" {
  if (value === undefined || value === fallback) return fallback;
  throw new Error(`${name} must be confirm`);
}

function datePolicy(value: string | undefined): "clarify" | "day-first" | "month-first" {
  if (value === undefined) return DEFAULT_DETERMINISTIC_CONFIG.ambiguousNumericDatePolicy;
  if (value === "clarify" || value === "day-first" || value === "month-first") return value;
  throw new Error("AMBIGUOUS_NUMERIC_DATE_POLICY must be clarify, day-first, or month-first");
}

export type UnauthorizedSenderResponseMode = "ignore" | "reply";

export function unauthorizedSenderResponseMode(value: string | undefined): UnauthorizedSenderResponseMode {
  if (value === undefined || value === "ignore") return "ignore";
  if (value === "reply") return "reply";
  throw new Error("UNAUTHORIZED_SENDER_RESPONSE_MODE must be ignore or reply");
}

export async function getDeterministicConfigForPerson(env: Env, ownerPersonId: string): Promise<DeterministicConfig> {
  const config = getDeterministicConfig(env);
  let settings;
  try {
    settings = await listFamilySettings(env.DB, ownerPersonId);
  } catch {
    return config;
  }
  for (const setting of settings) {
    switch (setting.setting_key) {
      case "enableWaitingFacts":
        config.enableWaitingFacts = booleanValue(setting.setting_value, config.enableWaitingFacts, "family_settings.enableWaitingFacts");
        break;
      case "enableFactResolution":
        config.enableFactResolution = booleanValue(setting.setting_value, config.enableFactResolution, "family_settings.enableFactResolution");
        break;
      case "enableReminderCreation":
        config.enableReminderCreation = booleanValue(setting.setting_value, config.enableReminderCreation, "family_settings.enableReminderCreation");
        break;
      case "factConflictPolicy":
        config.factConflictPolicy = policyValue(setting.setting_value, "confirm", "family_settings.factConflictPolicy");
        break;
      case "factDeletePolicy":
        config.factDeletePolicy = policyValue(setting.setting_value, "confirm", "family_settings.factDeletePolicy");
        break;
      case "factConfirmationTtlMinutes":
        config.factConfirmationTtlMinutes = positiveInteger(setting.setting_value, config.factConfirmationTtlMinutes, "family_settings.factConfirmationTtlMinutes");
        break;
      default:
        break;
    }
  }
  return config;
}

export function isDevelopment(env: Env): boolean {
  return env.ENVIRONMENT === "development";
}
