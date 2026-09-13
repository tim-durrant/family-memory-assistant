export type PersonApproval = {
  id: string;
  person_id: string;
  person_name: string;
  voter_person_id: string;
  decision: "pending" | "approved" | "declined";
  status?: "pending" | "approved" | "declined";
};

export async function createPendingSubject(
  db: D1Database,
  displayName: string,
  creatorPersonId: string,
  sourceMessageId: string,
): Promise<{ id: string; created: boolean; status?: "pending" | "approved" | "declined" }> {
  const existing = await db.prepare(
    "SELECT id, membership_status FROM people WHERE active = 1 AND lower(display_name) = lower(?1) LIMIT 1",
  ).bind(displayName.trim()).first<{ id: string; membership_status: "pending" | "approved" | "declined" }>();
  if (existing) return { id: existing.id, created: false, status: existing.membership_status };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const voters = await db.prepare(
    "SELECT id FROM people WHERE active = 1 AND is_sender = 1 AND whatsapp_id IS NOT NULL ORDER BY id",
  ).all<{ id: string }>();
  const statements = [
    db.prepare(
      `INSERT INTO people
       (id, display_name, whatsapp_id, role, active, membership_status, is_sender, created_by_person_id, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'trusted_contact', 1, 'pending', 0, ?4, ?5, ?5)`,
    ).bind(id, displayName.trim(), `subject:${id}`, creatorPersonId, now),
    ...voters.results.map((voter) => db.prepare(
      `INSERT INTO person_membership_approvals
       (id, person_id, voter_person_id, decision, source_message_id, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?5)`,
    ).bind(crypto.randomUUID(), id, voter.id, sourceMessageId, now)),
  ];
  await db.batch(statements);
  return { id, created: true };
}

export async function getPendingApprovalForVoter(
  db: D1Database,
  voterPersonId: string,
): Promise<PersonApproval | null> {
  return db.prepare(
    `SELECT a.id, a.person_id, p.display_name AS person_name, a.voter_person_id, a.decision
     FROM person_membership_approvals a
     JOIN people p ON p.id = a.person_id
     WHERE a.voter_person_id = ?1 AND a.decision = 'pending'
     ORDER BY a.created_at DESC LIMIT 1`,
  ).bind(voterPersonId).first<PersonApproval>();
}

export async function decidePersonApproval(
  db: D1Database,
  voterPersonId: string,
  decision: "approved" | "declined",
  sourceMessageId: string,
): Promise<PersonApproval | null> {
  const pending = await getPendingApprovalForVoter(db, voterPersonId);
  if (!pending) return null;
  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE person_membership_approvals
     SET decision = ?1, source_message_id = ?2, decided_at = ?3, updated_at = ?3
     WHERE id = ?4 AND voter_person_id = ?5 AND decision = 'pending'`,
  ).bind(decision, sourceMessageId, now, pending.id, voterPersonId).run();

  const declined = await db.prepare(
    "SELECT 1 FROM person_membership_approvals WHERE person_id = ?1 AND decision = 'declined' LIMIT 1",
  ).bind(pending.person_id).first<{ 1: number }>();
  const remaining = await db.prepare(
    "SELECT 1 FROM person_membership_approvals WHERE person_id = ?1 AND decision = 'pending' LIMIT 1",
  ).bind(pending.person_id).first<{ 1: number }>();
  const status = declined ? "declined" : remaining ? "pending" : "approved";
  await db.prepare(
    "UPDATE people SET membership_status = ?1, updated_at = ?2 WHERE id = ?3",
  ).bind(status, now, pending.person_id).run();
  return { ...pending, decision, status };
}

export async function listApprovalRecipients(
  db: D1Database,
  subjectId: string,
  excludePersonId?: string,
): Promise<Array<{ id: string; whatsapp_id: string }>> {
  const result = await db.prepare(
    `SELECT p.id, p.whatsapp_id
     FROM person_membership_approvals a
     JOIN people p ON p.id = a.voter_person_id
     WHERE a.person_id = ?1 AND a.decision = 'pending' AND p.active = 1 AND p.is_sender = 1 AND p.whatsapp_id IS NOT NULL
       AND (?2 IS NULL OR p.id != ?2)`
  ).bind(subjectId, excludePersonId ?? null).all<{ id: string; whatsapp_id: string }>();
  return result.results;
}
