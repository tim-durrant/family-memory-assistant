import type { EntityMentionCandidate } from "../interpretation/entity-mentions.js";
import { restoreRedactions } from "./redactions.js";

export type PseudonymMapping = {
  original_name: string;
  pseudonym: string;
};

export async function getOrCreatePseudonym(
  db: D1Database,
  ownerPersonId: string,
  candidate: EntityMentionCandidate,
  entityKind: "family_subject" | "external_contact" | "person_mention" = "person_mention",
): Promise<PseudonymMapping> {
  const normalizedName = candidate.displayName.toLowerCase();
  const existing = await db.prepare(
    `SELECT original_name, pseudonym
     FROM pseudonym_mappings
     WHERE owner_person_id = ?1 AND normalized_name = ?2 LIMIT 1`,
  ).bind(ownerPersonId, normalizedName).first<PseudonymMapping>();
  if (existing) return existing;

  const mapping = {
    original_name: candidate.displayName,
    pseudonym: `${entityKind === "family_subject" ? "FAMILY" : entityKind === "external_contact" ? "EXTERNAL" : "PERSON"}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
  };
  await db.prepare(
    `INSERT INTO pseudonym_mappings
     (id, owner_person_id, original_name, normalized_name, pseudonym, entity_kind, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
  ).bind(crypto.randomUUID(), ownerPersonId, mapping.original_name, normalizedName, mapping.pseudonym, entityKind, new Date().toISOString()).run();
  return mapping;
}

export function redactText(text: string, replacements: Array<{ start: number; end: number; pseudonym: string }>): string {
  return [...replacements]
    .sort((left, right) => right.start - left.start)
    .reduce((result, replacement) => result.slice(0, replacement.start) + replacement.pseudonym + result.slice(replacement.end), text);
}

export async function restoreText(db: D1Database, ownerPersonId: string, text: string): Promise<string> {
  const result = await db.prepare(
    "SELECT original_name, pseudonym FROM pseudonym_mappings WHERE owner_person_id = ?1",
  ).bind(ownerPersonId).all<PseudonymMapping>();
  const restoredNames = result.results.reduce(
    (restored, mapping) => restored.replaceAll(mapping.pseudonym, mapping.original_name),
    text,
  );
  return restoreRedactions(db, ownerPersonId, restoredNames);
}
