import type { DeterministicConfig } from "../config.js";

export type PersonRow = {
  id: string;
  display_name: string;
  membership_status: "pending" | "approved" | "declined";
  whatsapp_id?: string | null;
};

export type PersonAttributeRow = {
  id: string;
  person_id: string;
  attribute_key: string;
  attribute_value: string;
  normalized_value: string;
  status: string;
  source_message_id: string;
  valid_from: string | null;
  valid_until: string | null;
  last_change_message_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function findPersonByName(db: D1Database, name: string): Promise<PersonRow | null> {
  return db.prepare(
    "SELECT id, display_name, membership_status, whatsapp_id FROM people WHERE active = 1 AND lower(display_name) = lower(?1) LIMIT 1",
  ).bind(name.trim()).first<PersonRow>();
}

export async function listActivePersonAttributes(
  db: D1Database,
  personId: string,
  attributeKey: string,
): Promise<PersonAttributeRow[]> {
  const result = await db.prepare(
    `SELECT id, person_id, attribute_key, attribute_value, normalized_value, status,
            source_message_id, valid_from, valid_until, last_change_message_id, created_at, updated_at
     FROM person_attributes
     WHERE person_id = ?1 AND attribute_key = ?2 AND status = 'active'
       AND (valid_until IS NULL OR valid_until > ?3)
     ORDER BY created_at`,
  ).bind(personId, attributeKey, new Date().toISOString()).all<PersonAttributeRow>();
  return result.results;
}

export async function recordPersonAttribute(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  attributeKey: string,
  value: string,
  normalizedValue: string,
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO person_attributes
     (id, person_id, attribute_key, attribute_value, normalized_value, status,
      source_message_id, valid_from, valid_until, last_change_message_id, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, NULL, NULL, ?7, ?7)`,
  ).bind(
    crypto.randomUUID(), personId, attributeKey, value, normalizedValue, sourceMessageId, now,
  ).run();
}

export function attributeLabel(
  config: Pick<DeterministicConfig, "personAttributeDefinitions">,
  key: string,
  fallback: string,
): string {
  return config.personAttributeDefinitions.find((definition) => definition.key === key)?.aliases[0] ?? fallback;
}
