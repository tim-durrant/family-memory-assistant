export type ClarificationState = {
  id: string;
  person_id: string;
  conversation_id: string;
  pending_intent: string;
  missing_field: string;
  payload_json: string;
  source_message_id: string;
  status: "pending" | "completed" | "cancelled" | "expired";
  turn_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

export async function createClarificationState(
  db: D1Database,
  personId: string,
  conversationId: string,
  pendingIntent: string,
  missingField: string,
  payload: unknown,
  sourceMessageId: string,
  ttlMinutes: number,
): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();
  await db.batch([
    db.prepare(
      `UPDATE clarification_state
       SET status = 'cancelled', updated_at = ?1
       WHERE person_id = ?2 AND conversation_id = ?3 AND status = 'pending'`,
    ).bind(now, personId, conversationId),
    db.prepare(
      `INSERT INTO clarification_state
       (id, person_id, conversation_id, pending_intent, missing_field, payload_json,
        source_message_id, status, turn_count, created_at, updated_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 0, ?8, ?8, ?9)`,
    ).bind(
      crypto.randomUUID(), personId, conversationId, pendingIntent, missingField,
      JSON.stringify(payload), sourceMessageId, now, expiresAt,
    ),
  ]);
}

export async function getPendingClarification(
  db: D1Database,
  personId: string,
  conversationId: string,
): Promise<ClarificationState | null> {
  return db.prepare(
    `SELECT id, person_id, conversation_id, pending_intent, missing_field, payload_json,
            source_message_id, status, turn_count, created_at, updated_at, expires_at
     FROM clarification_state
     WHERE person_id = ?1 AND conversation_id = ?2 AND status = 'pending' AND expires_at > ?3
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(personId, conversationId, new Date().toISOString()).first<ClarificationState>();
}

export async function completeClarification(
  db: D1Database,
  stateId: string,
): Promise<void> {
  await db.prepare(
    `UPDATE clarification_state SET status = 'completed', updated_at = ?1
     WHERE id = ?2 AND status = 'pending'`,
  ).bind(new Date().toISOString(), stateId).run();
}

export async function cancelClarification(
  db: D1Database,
  personId: string,
  conversationId: string,
): Promise<void> {
  await db.prepare(
    `UPDATE clarification_state SET status = 'cancelled', updated_at = ?1
     WHERE person_id = ?2 AND conversation_id = ?3 AND status = 'pending'`,
  ).bind(new Date().toISOString(), personId, conversationId).run();
}

export async function incrementClarificationTurn(
  db: D1Database,
  stateId: string,
): Promise<void> {
  await db.prepare(
    `UPDATE clarification_state SET turn_count = turn_count + 1, updated_at = ?1
     WHERE id = ?2 AND status = 'pending'`,
  ).bind(new Date().toISOString(), stateId).run();
}
