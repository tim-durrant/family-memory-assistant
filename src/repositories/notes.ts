export type NoteRow = {
  id: string;
  person_id: string;
  note_type: string;
  original_text: string;
  pseudonymized_text: string | null;
  source_message_id: string;
  event_date: string | null;
  created_at: string;
  updated_at: string;
};

export async function recordNote(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  originalText: string,
  noteType = "general",
  eventDate: string | null = null,
  pseudonymizedText: string | null = null,
): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO notes
     (id, person_id, note_type, original_text, pseudonymized_text, source_message_id, event_date, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)`,
  ).bind(id, personId, noteType, originalText, pseudonymizedText, sourceMessageId, eventDate, now).run();
  return id;
}

export type PendingNoteChoice = {
  id: string;
  person_id: string;
  note_ids: string;
  created_at: string;
  expires_at: string;
};

export async function createPendingNoteChoice(db: D1Database, personId: string, noteIds: string[]): Promise<void> {
  const now = new Date();
  await db.batch([
    db.prepare("DELETE FROM pending_note_choices WHERE person_id = ?1").bind(personId),
    db.prepare(
      `INSERT INTO pending_note_choices (id, person_id, note_ids, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(crypto.randomUUID(), personId, JSON.stringify(noteIds), now.toISOString(), new Date(now.getTime() + 30 * 60_000).toISOString()),
  ]);
}

export async function getPendingNoteChoice(db: D1Database, personId: string): Promise<PendingNoteChoice | null> {
  return db.prepare(
    `SELECT id, person_id, note_ids, created_at, expires_at
     FROM pending_note_choices WHERE person_id = ?1 AND expires_at > ?2 LIMIT 1`,
  ).bind(personId, new Date().toISOString()).first<PendingNoteChoice>();
}

export async function clearPendingNoteChoice(db: D1Database, personId: string): Promise<void> {
  await db.prepare("DELETE FROM pending_note_choices WHERE person_id = ?1").bind(personId).run();
}

export async function listRegisteredPeople(db: D1Database, ownerPersonId: string): Promise<Array<{ id: string; display_name: string }>> {
  const result = await db.prepare(
    `SELECT id, display_name FROM people
     WHERE active = 1 AND is_sender = 1 AND id != ?1 ORDER BY display_name`,
  ).bind(ownerPersonId).all<{ id: string; display_name: string }>();
  return result.results;
}

export async function createPendingNoteShare(db: D1Database, noteId: string, ownerPersonId: string): Promise<void> {
  const now = new Date();
  await db.batch([
    db.prepare("DELETE FROM pending_note_shares WHERE owner_person_id = ?1").bind(ownerPersonId),
    db.prepare(
      `INSERT INTO pending_note_shares (id, note_id, owner_person_id, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(crypto.randomUUID(), noteId, ownerPersonId, now.toISOString(), new Date(now.getTime() + 30 * 60_000).toISOString()),
  ]);
}

export async function clearPendingNoteShare(db: D1Database, ownerPersonId: string): Promise<void> {
  await db.prepare("DELETE FROM pending_note_shares WHERE owner_person_id = ?1").bind(ownerPersonId).run();
}

export async function getPendingNoteShare(db: D1Database, ownerPersonId: string): Promise<{ id: string; note_id: string } | null> {
  return db.prepare(
    `SELECT id, note_id FROM pending_note_shares
     WHERE owner_person_id = ?1 AND expires_at > ?2 LIMIT 1`,
  ).bind(ownerPersonId, new Date().toISOString()).first<{ id: string; note_id: string }>();
}

export async function grantNoteAccess(db: D1Database, pendingId: string, noteId: string, ownerPersonId: string, granteeIds: string[]): Promise<void> {
  const statements = granteeIds.map((granteeId) => db.prepare(
    `INSERT OR IGNORE INTO note_access_grants (id, note_id, owner_person_id, grantee_person_id, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  ).bind(crypto.randomUUID(), noteId, ownerPersonId, granteeId, new Date().toISOString()));
  statements.push(db.prepare("DELETE FROM pending_note_shares WHERE id = ?1").bind(pendingId));
  await db.batch(statements);
}

export async function listNotes(db: D1Database, personId: string): Promise<NoteRow[]> {
  const result = await db.prepare(
    `SELECT DISTINCT n.id, n.person_id, n.note_type, n.original_text, n.pseudonymized_text, n.source_message_id,
            n.event_date, n.created_at, n.updated_at
     FROM notes n
     LEFT JOIN note_access_grants g ON g.note_id = n.id AND g.grantee_person_id = ?1
     WHERE n.person_id = ?1 OR g.grantee_person_id = ?1
     ORDER BY n.created_at DESC`,
  ).bind(personId).all<NoteRow>();
  return result.results;
}
