import { DEFAULT_DETERMINISTIC_CONFIG, type DeterministicConfig } from "../config.js";
import { helpReply } from "./actions.js";
import { type CapabilityName, type PermissionRequest } from "../permissions.js";
import { checkCapabilityWithDatabase, recordPermissionAudit } from "../repositories/permissions.js";
import { interpretMessage } from "../interpretation/deterministic.js";
import type { SupportedIntentKind } from "../interpretation/intents.js";
import {
  applyPendingFactAction,
  clearPendingFactAction,
  createPendingFactAction,
  formatFact,
  getPendingFactAction,
  listFacts,
  matchFacts,
  recordFact,
  resolveFact,
} from "../repositories/facts.js";
import {
  findPersonByName,
  listActivePersonAttributes,
  recordPersonAttribute,
} from "../repositories/person-attributes.js";
import {
  createPendingSubject,
  decidePersonApproval,
  getPendingApprovalForVoter,
} from "../repositories/people.js";
import {
  activateEmergencyContact,
  activateSafeWord,
  createEmergencyAlert,
  createEmergencyContactSetup,
  createSafeWordSetup,
  isEmergencySafeWord,
  listEmergencyContacts,
} from "../repositories/emergency.js";
import {
  clearPendingNoteChoice,
  clearPendingNoteShare,
  createPendingNoteChoice,
  getPendingNoteChoice,
  listNotes,
  listRegisteredPeople,
  createPendingNoteShare,
  getPendingNoteShare,
  grantNoteAccess,
  recordNote,
} from "../repositories/notes.js";
import { extractEntityMentionCandidates } from "../interpretation/entity-mentions.js";
import { extractSensitiveCandidates } from "../interpretation/sensitive-data.js";
import {
  classifyPendingEntity,
  getPendingEntityClarification,
  recordEntityMention,
} from "../repositories/entities.js";
import { getOrCreatePseudonym, redactText, restoreText } from "../repositories/pseudonyms.js";
import { manageFamilyPermission } from "../repositories/permissions.js";
import { getOrCreateRedaction } from "../repositories/redactions.js";
import { confirmWhatsAppLink, createWhatsAppLink } from "../repositories/whatsapp-links.js";

/**
 * Memory capability orchestration. It coordinates interpretation, validation,
 * repository operations, and user-facing results without knowing the transport.
 */
export async function buildMemoryReply(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  text: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
  onPersonAdded?: (personId: string, displayName: string) => Promise<void>,
  onEmergencyTrigger?: (alertId: string, recipients: string[], body: string) => Promise<{ whatsappSent: boolean; smsSent: boolean; simulated?: boolean }>,
): Promise<string | undefined> {
  const pending = await getPendingFactAction(db, personId);
  const confirmation = confirmationDecision(text);
  const pendingNoteChoice = await getPendingNoteChoice(db, personId);
  const choiceNumber = text.trim().match(/^(\d+)\.?$/)?.[1];
  if (pendingNoteChoice && choiceNumber) {
    const selectedIndex = Number(choiceNumber) - 1;
    const noteIds = JSON.parse(pendingNoteChoice.note_ids) as string[];
    if (selectedIndex < 0 || selectedIndex >= noteIds.length) return `Please reply with a number from 1 to ${noteIds.length}.`;
    const selected = (await listNotes(db, personId)).find((note) => note.id === noteIds[selectedIndex]);
    await clearPendingNoteChoice(db, personId);
    return selected ? await restoreText(db, personId, selected.pseudonymized_text ?? selected.original_text) : config.noteNotFoundReply;
  }
  const pendingNoteShare = await getPendingNoteShare(db, personId);
  if (pendingNoteShare) {
    if (confirmation === "no") {
      await clearPendingNoteShare(db, personId);
      return "Okay, I’ll keep this note private to you.";
    }
    if (confirmation === "yes") {
      const people = await listRegisteredPeople(db, personId);
      if (people.length === 0) return "There are no other registered WhatsApp users to share this note with.";
      return ["Choose who may retrieve this note, or reply ALL:", ...people.map((person, index) => `${index + 1}. ${person.display_name}`), "ALL. Everyone else listed here may retrieve it."].join("\\n");
    }
    const people = await listRegisteredPeople(db, personId);
    const selectedIndex = text.trim().match(/^(\d+)\.?$/)?.[1];
    const selectedPerson = selectedIndex ? people[Number(selectedIndex) - 1] : people.find((person) => person.display_name.toLowerCase() === text.trim().toLowerCase());
    const grantees = /^all\.?$/i.test(text.trim()) ? people : selectedPerson ? [selectedPerson] : [];
    if (grantees.length === 0) return "Please reply with a listed person’s name, number, or ALL.";
    await grantNoteAccess(db, pendingNoteShare.id, pendingNoteShare.note_id, personId, grantees.map((person) => person.id));
    return `Retrieval is now allowed for ${grantees.length === people.length ? "everyone listed" : grantees.map((person) => person.display_name).join(", ")}.`;
  }
  if (await isEmergencySafeWord(db, personId, text)) {
    if (!(await authorize(db, { requesterPersonId: personId, capability: "emergency.trigger" }))) return config.permissionDeniedReply;
    const recipients = await listEmergencyContacts(db, personId);
    if (recipients.length === 0) return "Your emergency safe word is active, but no trusted contact is active yet.";
    const alertId = await createEmergencyAlert(db, personId, sourceMessageId);
    if (!alertId) return "This emergency alert was already received.";
    const body = "This is an urgent support request. Please contact me as soon as possible.";
    const delivery = await onEmergencyTrigger?.(alertId, recipients.map((recipient) => recipient.phone_number), body);
    if (delivery?.simulated) return "Emergency notification was simulated. No WhatsApp or SMS messages were sent.";
    if (!delivery || (delivery.whatsappSent && delivery.smsSent)) return "Your trusted contacts have been notified by WhatsApp and SMS.";
    if (delivery.whatsappSent) return "Your trusted contacts were notified by WhatsApp, but SMS delivery is not configured or failed.";
    return "I couldn’t confirm emergency notification delivery.";
  }
  const pendingEntity = await getPendingEntityClarification(db, personId);
  if (pendingEntity && !confirmation) {
    const relationship = text.trim().toLowerCase().replace(/[.!?]+$/, "");
    if (/^(?:family member|doctor|.+)$/.test(relationship) && relationship.split(/\s+/).length <= 3) {
      if (relationship === "family member") {
        await createPendingSubject(db, pendingEntity.display_name, personId, sourceMessageId);
        await classifyPendingEntity(db, pendingEntity, personId, relationship, sourceMessageId);
        await createPendingNoteShare(db, pendingEntity.note_id, personId);
        return `I’ve started the family-member approval process for ${pendingEntity.display_name}. I have saved the note for you. Save for anyone else?`;
      }
      await classifyPendingEntity(db, pendingEntity, personId, relationship, sourceMessageId);
      await createPendingNoteShare(db, pendingEntity.note_id, personId);
      return `${renderReply(config.entityRelationshipSavedReply, { person: pendingEntity.display_name, relationship })}\n\nI have saved the note for you. Save for anyone else?`;
    }
    return `Please reply with family member, doctor, or a short relationship for ${pendingEntity.display_name}.`;
  }
  const pendingPersonApproval = await getPendingApprovalForVoter(db, personId);
  if (pendingPersonApproval && confirmation) {
    const decision = confirmation === "yes" ? "approved" : "declined";
    const result = await decidePersonApproval(db, personId, decision, sourceMessageId);
    if (result) {
      return renderReply(config.personApprovalResultReply, {
        person: result.person_name,
        decision,
        status: result.status ?? "pending",
      });
    }
  }
  if (pending && confirmation === "yes") {
    await applyPendingFactAction(db, personId, sourceMessageId, pending);
    return config.factChangeSuccessReply;
  }
  if (pending && confirmation === "no") {
    await clearPendingFactAction(db, personId);
    return config.factChangeCancelledReply;
  }

  const intent = interpretMessage(text, config);
  const capability = capabilityForIntent(intent.kind);
  if (capability && !(await authorize(db, { requesterPersonId: personId, capability }))) return config.permissionDeniedReply;
  if (intent.kind === "unknown") return optionalReply(config.unknownIntentReply);

  if (intent.kind === "help") return helpReply(intent.topic);

  if (intent.kind === "grant_permission" || intent.kind === "revoke_permission") {
    return (await manageFamilyPermission(
      db, personId, intent.personName, intent.category, intent.permission,
      intent.kind === "grant_permission" ? "grant" : "revoke",
    )).message;
  }

  if (intent.kind === "add_emergency_contact") {
    await createEmergencyContactSetup(db, personId, intent.phoneNumber);
    return `I’ve prepared ${intent.phoneNumber} as a trusted emergency contact. Reply: Confirm trusted emergency contact ${intent.phoneNumber}`;
  }
  if (intent.kind === "confirm_emergency_contact") {
    return await activateEmergencyContact(db, personId, intent.phoneNumber)
      ? "The trusted emergency contact is now active."
      : "I couldn’t find a current pending setup for that contact.";
  }
  if (intent.kind === "set_emergency_safe_word") {
    await createSafeWordSetup(db, personId, intent.safeWord);
    return "I’ve prepared the emergency safe word. Repeat it with: Confirm my emergency safe word <word>";
  }
  if (intent.kind === "confirm_emergency_safe_word") {
    return await activateSafeWord(db, personId, intent.safeWord)
      ? "The emergency safe word is now active."
      : "I couldn’t confirm that safe word setup.";
  }

  if (intent.kind === "link_person_whatsapp") {
    const result = await createWhatsAppLink(db, personId, intent.personName);
    if (!result.ok) return result.reason;
    return `I’m ready to link ${result.personName}. Ask them to send this one-time code from their own WhatsApp: ${result.code}. The code expires in 15 minutes. Then say: Confirm the WhatsApp link for ${result.personName}`;
  }

  if (intent.kind === "confirm_person_whatsapp_link") {
    const result = await confirmWhatsAppLink(db, personId, intent.personName);
    return result.ok
      ? `${result.personName}’s WhatsApp number is now linked and can send messages.`
      : result.reason;
  }

  if (intent.kind === "record_note") {
    const candidates = extractEntityMentionCandidates(intent.noteText);
    const sensitiveCandidates = extractSensitiveCandidates(intent.noteText);
    const replacements: Array<{ start: number; end: number; pseudonym: string }> = [];
    for (const candidate of candidates) {
      const knownPerson = await findPersonByName(db, candidate.displayName);
      const mapping = await getOrCreatePseudonym(db, personId, candidate, knownPerson ? "family_subject" : "person_mention");
      replacements.push({ start: candidate.sourceStart, end: candidate.sourceEnd, pseudonym: mapping.pseudonym });
    }
    for (const candidate of sensitiveCandidates) {
      const mapping = await getOrCreateRedaction(db, personId, candidate);
      replacements.push({ start: candidate.start, end: candidate.end, pseudonym: mapping.redaction_token });
    }
    const pseudonymizedText = redactText(intent.noteText, replacements);
    const noteId = await recordNote(db, personId, sourceMessageId, intent.noteText, intent.noteType, null, pseudonymizedText);
    let firstClarificationName: string | undefined;
    for (const candidate of candidates) {
      if (await findPersonByName(db, candidate.displayName)) continue;
      const mention = await recordEntityMention(db, candidate, noteId, sourceMessageId, personId);
      firstClarificationName ??= mention.clarificationCreated ? mention.displayName : undefined;
    }
    if (firstClarificationName) return `${config.noteSavedReply}\n\n${renderReply(config.entityRelationshipReply, { person: firstClarificationName })}`;
    if (intent.shareTarget === "self") {
      await createPendingNoteShare(db, noteId, personId);
      return "I have saved the note for you. Save for anyone else?";
    }
    const people = await listRegisteredPeople(db, personId);
    const requestedNames = Array.isArray(intent.shareTarget) ? intent.shareTarget : [];
    const recipients = intent.shareTarget === "everyone"
      ? people
      : people.filter((person) => requestedNames.some((name) => person.display_name.toLowerCase() === name.toLowerCase()));
    const missing = intent.shareTarget === "everyone" ? [] : requestedNames.filter((name) => !people.some((person) => person.display_name.toLowerCase() === name.toLowerCase()));
    if (missing.length > 0) return `${config.noteSavedReply} I couldn’t grant retrieval to: ${missing.join(", ")}.`;
    if (recipients.length === 0) return `${config.noteSavedReply} There are no other registered WhatsApp users to share it with.`;
    await createPendingNoteShare(db, noteId, personId);
    const pendingShare = await getPendingNoteShare(db, personId);
    if (pendingShare) await grantNoteAccess(db, pendingShare.id, noteId, personId, recipients.map((person) => person.id));
    return `${config.noteSavedReply} Retrieval is allowed for ${intent.shareTarget === "everyone" ? "everyone listed" : recipients.map((person) => person.display_name).join(", ")}.`;
  }

  if (intent.kind === "query_note") {
    const notes = await listNotes(db, personId);
    const day = intent.scope === "today" ? localDate(new Date().toISOString(), config.timezone) : intent.requestedDate;
    const dayNotes = day ? notes.filter((note) => localDate(note.created_at, config.timezone) === day) : notes;
    const matching = intent.keywords.length === 0
      ? dayNotes
      : dayNotes.filter((note) => intent.keywords.every((keyword) => note.original_text.toLowerCase().includes(keyword)));
    if (matching.length === 0) return config.noteNotFoundReply;
    if (matching.length === 1) return await restoreText(db, personId, matching[0].pseudonymized_text ?? matching[0].original_text);
    await createPendingNoteChoice(db, personId, matching.map((note) => note.id));
    return formatNoteChoices(matching, config.timezone);
  }

  if (intent.kind === "add_person") {
    const result = await createPendingSubject(db, intent.personName, personId, sourceMessageId);
    if (result.created) {
      await onPersonAdded?.(result.id, intent.personName);
      return renderReply(config.addPersonReply, { person: intent.personName });
    }
    return renderReply(config.personAlreadyExistsReply, {
      person: intent.personName,
      status: result.status ?? "pending",
    });
  }

  if (intent.kind === "record_person_attribute") {
    const person = await findPersonByName(db, intent.personName);
    if (!person) return renderReply(config.unknownPersonReply, { person: intent.personName });
    if (!(await authorize(db, { requesterPersonId: personId, capability: "person.attribute.write", targetPersonId: person.id, category: intent.attributeKey }))) return config.permissionDeniedReply;
    const existing = await listActivePersonAttributes(db, person.id, intent.attributeKey);
    if (existing.some((attribute) => attribute.normalized_value === intent.normalizedValue)) {
      return renderReply(config.attributeAlreadyKnownReply, {
        person: person.display_name,
        value: intent.value,
        attribute: intent.attributeLabel,
      }) + personStatusNotice(config, person.membership_status, person.display_name);
    }
    if (existing.length > 0) {
      return renderReply(config.attributeConflictReply, {
        person: person.display_name,
        attribute: intent.attributeLabel,
      });
    }
    await recordPersonAttribute(db, person.id, sourceMessageId, intent.attributeKey, intent.value, intent.normalizedValue);
    return renderReply(config.attributeSavedReply, {
      person: person.display_name,
      value: intent.value,
      attribute: intent.attributeLabel,
    }) + personStatusNotice(config, person.membership_status, person.display_name);
  }

  if (intent.kind === "query_person_attribute") {
    const person = await findPersonByName(db, intent.personName);
    if (!person) return renderReply(config.unknownPersonReply, { person: intent.personName });
    if (!(await authorize(db, { requesterPersonId: personId, capability: "person.attribute.read", targetPersonId: person.id, category: intent.attributeKey }))) return config.permissionDeniedReply;
    const existing = await listActivePersonAttributes(db, person.id, intent.attributeKey);
    if (existing.length === 0) {
      return renderReply(config.attributeNotFoundReply, { person: person.display_name });
    }
    if (existing.length > 1) {
      return renderReply(config.attributeAmbiguousReply, { person: person.display_name, attribute: intent.attributeLabel });
    }
    const attribute = existing[0];
    const values = { person: person.display_name, value: attribute.attribute_value, attribute: intent.attributeLabel };
    if (!intent.requestedValue) return renderReply(config.attributeQueryReply, values) + personStatusNotice(config, person.membership_status, person.display_name);
    if (attribute.normalized_value === intent.requestedValue) return renderReply(config.attributeMatchReply, values) + personStatusNotice(config, person.membership_status, person.display_name);
    return renderReply(config.attributeDifferentReply, { ...values, requested: intent.requestedValue }) + personStatusNotice(config, person.membership_status, person.display_name);
  }

  if (intent.kind === "record_fact") {
    if (intent.dateIssue === "ambiguous") return config.ambiguousDateReply;
    if (intent.dateIssue === "invalid") return config.invalidDateReply;
    const facts = await listFacts(db, personId);
    const conflicts = matchFacts(facts, intent.topic, config).matches;
    if (conflicts.length > 1) {
      return renderReply(config.ambiguousFactReply, { matches: conflicts.map(formatFact).join("; ") });
    }
    if (conflicts.length === 1 && config.factConflictPolicy === "confirm") {
      await createPendingFactAction(db, personId, sourceMessageId, "replace", conflicts[0], intent, config.factConfirmationTtlMinutes);
      return renderReply(config.factConflictReply, { existing: formatFact(conflicts[0]), statement: intent.statement });
    }
    await recordFact(db, personId, sourceMessageId, intent);
    return intent.needsYear
      ? renderReply(config.missingYearReply, { statement: intent.statement })
      : `Saved: ${intent.statement}.`;
  }

  if (intent.kind === "forget_fact") {
    if (config.factDeletePolicy !== "confirm") return optionalReply(config.unknownIntentReply);
    const facts = await listFacts(db, personId);
    const matches = matchFacts(facts, intent.topic, config).matches;
    if (matches.length === 0) return config.resolutionNotFoundReply;
    if (matches.length > 1) return config.resolutionAmbiguousReply;
    await createPendingFactAction(db, personId, sourceMessageId, "forget", matches[0], null, config.factConfirmationTtlMinutes);
    return renderReply(config.factDeleteReply, { existing: formatFact(matches[0]) });
  }

  const facts = await listFacts(db, personId);
  if (intent.kind === "waiting_question") {
    if (!config.enableWaitingFacts) return optionalReply(config.unknownIntentReply);
    const waiting = facts.filter((fact) => fact.status === "waiting");
    if (waiting.length === 0) return config.noWaitingFactsReply;
    return `You’re waiting for: ${waiting.map(formatFact).join("; ")}`;
  }

  if (intent.kind === "when_question") {
    const matchResult = matchFacts(facts, intent.topic, config);
    const matches = matchResult.matches;
    if (matches.length === 0) return config.noMatchingFactReply;
    if (matches.length > 1) {
      return renderReply(config.ambiguousFactReply, { matches: matches.map(formatFact).join("; ") });
    }
    return formatFact(matches[0]);
  }

  if (intent.kind !== "resolve_fact" && intent.kind !== "forget_fact") return optionalReply(config.unknownIntentReply);
  if (!config.enableFactResolution) return optionalReply(config.unknownIntentReply);
  const matchCount = await resolveFact(db, personId, intent.topic, config, sourceMessageId);
  if (matchCount === 0) return config.resolutionNotFoundReply;
  if (matchCount > 1) return config.resolutionAmbiguousReply;
  return config.resolutionSuccessReply;
}

async function authorize(db: D1Database, request: PermissionRequest): Promise<boolean> {
  const decision = await checkCapabilityWithDatabase(db, request);
  try {
    await recordPermissionAudit(db, request, decision);
  } catch {
    // Authorization remains usable during migration/tests; audit failures do not
    // expose data or widen the decision.
  }
  return decision.allowed;
}

function capabilityForIntent(kind: SupportedIntentKind): CapabilityName | undefined {
  switch (kind) {
    case "record_fact": return "memory.fact.write";
    case "when_question": return "memory.fact.read";
    case "waiting_question": return "memory.fact.read";
    case "resolve_fact": return "memory.fact.write";
    case "forget_fact": return "memory.fact.write";
    case "record_person_attribute": return "person.attribute.write";
    case "query_person_attribute": return "person.attribute.read";
    case "add_person": return "person.register";
    case "link_person_whatsapp": return "person.contact.link";
    case "confirm_person_whatsapp_link": return "person.contact.link";
    case "record_note": return "memory.note.write";
    case "query_note": return "memory.note.read";
    case "add_emergency_contact": return "emergency.contact.configure";
    case "confirm_emergency_contact": return "emergency.contact.configure";
    case "set_emergency_safe_word": return "emergency.contact.configure";
    case "confirm_emergency_safe_word": return "emergency.contact.configure";
    case "grant_permission": return "family.permission.manage";
    case "revoke_permission": return "family.permission.manage";
    case "help": return undefined;
    case "unknown": return undefined;
  }
}

function renderReply(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

function confirmationDecision(text: string): "yes" | "no" | undefined {
  const normalized = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/^(?:yes|y|confirm|replace|do it)$/.test(normalized)) return "yes";
  if (/^(?:no|n|cancel|leave it)$/.test(normalized)) return "no";
  return undefined;
}

function formatNoteChoices(notes: Array<{ created_at: string }>, timezone: string): string {
  return ["I found more than one matching note. Reply with its number:", ...notes.map((note, index) => `${index + 1}. ${formatDateTime(note.created_at, timezone)}`)].join("\n");
}

function formatDateTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function localDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function personStatusNotice(
  config: DeterministicConfig,
  status: "pending" | "approved" | "declined",
  person: string,
): string {
  return status === "approved" ? "" : renderReply(config.personPendingNotice, { person, status });
}

function optionalReply(reply: string): string | undefined {
  return reply || undefined;
}
