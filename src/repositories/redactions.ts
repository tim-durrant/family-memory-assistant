import type { SensitiveCandidate } from "../interpretation/sensitive-data.js";

export type RedactionMapping = {
  original_value: string;
  redaction_token: string;
};

export async function getOrCreateRedaction(
  db: D1Database,
  ownerPersonId: string,
  candidate: SensitiveCandidate,
): Promise<RedactionMapping> {
  const normalized = candidate.value.toLowerCase();
  const existing = await db.prepare(
    `SELECT original_value, redaction_token
     FROM redaction_mappings
     WHERE owner_person_id = ?1 AND normalized_value = ?2 AND redaction_kind = ?3 LIMIT 1`,
  ).bind(ownerPersonId, normalized, candidate.kind).first<RedactionMapping>();
  if (existing) return existing;

  const mapping = {
    original_value: candidate.value,
    redaction_token: `REDACTED_${candidate.kind.toUpperCase()}_${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`,
  };
  await db.prepare(
    `INSERT INTO redaction_mappings
     (id, owner_person_id, original_value, normalized_value, redaction_token, redaction_kind, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)`,
  ).bind(crypto.randomUUID(), ownerPersonId, mapping.original_value, normalized, mapping.redaction_token, candidate.kind, new Date().toISOString()).run();
  return mapping;
}

export async function restoreRedactions(db: D1Database, ownerPersonId: string, text: string): Promise<string> {
  const result = await db.prepare(
    "SELECT original_value, redaction_token FROM redaction_mappings WHERE owner_person_id = ?1",
  ).bind(ownerPersonId).all<RedactionMapping>();
  return result.results.reduce(
    (restored, mapping) => restored.replaceAll(mapping.redaction_token, mapping.original_value),
    text,
  );
}
