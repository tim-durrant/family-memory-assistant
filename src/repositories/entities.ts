import type { EntityMentionCandidate } from "../interpretation/entity-mentions.js";

export type PendingEntityClarification = {
  id: string;
  entity_id: string;
  display_name: string;
  requester_person_id: string;
  note_id: string;
};

export async function recordEntityMention(
  db: D1Database,
  candidate: EntityMentionCandidate,
  noteId: string,
  sourceMessageId: string,
  requesterPersonId: string,
): Promise<{ clarificationCreated: boolean; displayName: string }> {
  const now = new Date().toISOString();
  let entity = await db.prepare(
    "SELECT id, display_name FROM named_entities WHERE normalized_name = lower(?1) LIMIT 1",
  ).bind(candidate.displayName).first<{ id: string; display_name: string }>();
  if (!entity) {
    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO named_entities
       (id, display_name, normalized_name, entity_kind, created_by_person_id, created_at, updated_at)
       VALUES (?1, ?2, lower(?2), 'mention_only', ?3, ?4, ?4)`,
    ).bind(id, candidate.displayName, requesterPersonId, now).run();
    entity = { id, display_name: candidate.displayName };
  }

  await db.prepare(
    `INSERT INTO entity_mentions
     (id, entity_id, note_id, source_message_id, surface_text, source_start, source_end, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  ).bind(crypto.randomUUID(), entity.id, noteId, sourceMessageId, candidate.displayName, candidate.sourceStart, candidate.sourceEnd, now).run();

  const existingClarification = await db.prepare(
    `SELECT id FROM pending_entity_clarifications
     WHERE entity_id = ?1 AND requester_person_id = ?2 AND status = 'pending' AND expires_at > ?3 LIMIT 1`,
  ).bind(entity.id, requesterPersonId, now).first<{ id: string }>();
  if (existingClarification) return { clarificationCreated: false, displayName: entity.display_name };

  await db.prepare(
    `INSERT INTO pending_entity_clarifications
     (id, entity_id, requester_person_id, note_id, status, expires_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?6)`,
  ).bind(crypto.randomUUID(), entity.id, requesterPersonId, noteId, new Date(Date.now() + 30 * 60_000).toISOString(), now, now).run();
  return { clarificationCreated: true, displayName: entity.display_name };
}

export async function getPendingEntityClarification(
  db: D1Database,
  requesterPersonId: string,
): Promise<PendingEntityClarification | null> {
  return db.prepare(
    `SELECT c.id, c.entity_id, e.display_name, c.requester_person_id, c.note_id
     FROM pending_entity_clarifications c
     JOIN named_entities e ON e.id = c.entity_id
     WHERE c.requester_person_id = ?1 AND c.status = 'pending' AND c.expires_at > ?2
     ORDER BY c.created_at ASC LIMIT 1`,
  ).bind(requesterPersonId, new Date().toISOString()).first<PendingEntityClarification>();
}

export async function classifyPendingEntity(
  db: D1Database,
  clarification: PendingEntityClarification,
  requesterPersonId: string,
  relationship: string,
  sourceMessageId: string,
): Promise<void> {
  const now = new Date().toISOString();
  if (relationship === "family member") {
    await db.prepare(
      "UPDATE named_entities SET updated_at = ?1 WHERE id = ?2",
    ).bind(now, clarification.entity_id).run();
  } else {
    await db.batch([
      db.prepare(
        "UPDATE named_entities SET entity_kind = 'external_contact', updated_at = ?1 WHERE id = ?2",
      ).bind(now, clarification.entity_id),
      db.prepare(
        `INSERT OR IGNORE INTO entity_relationships
         (id, entity_id, person_id, relationship_label, source_message_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      ).bind(crypto.randomUUID(), clarification.entity_id, requesterPersonId, relationship, sourceMessageId, now),
    ]);
  }
  await db.prepare(
    "UPDATE pending_entity_clarifications SET status = 'resolved', updated_at = ?1 WHERE id = ?2",
  ).bind(now, clarification.id).run();
}
