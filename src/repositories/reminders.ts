export type Reminder = {
  id: string;
  person_id: string;
  source_message_id: string | null;
  public_code: string | null;
  reminder_text: string;
  due_at: string;
  timezone: string;
  status: "pending" | "claimed" | "sent" | "failed" | "cancelled";
  claim_token: string | null;
  claimed_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function createReminder(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  reminderText: string,
  dueAt: string,
  timezone: string,
): Promise<{ id: string; publicCode: string }> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const id = crypto.randomUUID();
    const publicCode = randomReminderCode();
    const now = new Date().toISOString();
    try {
      await db.prepare(
        `INSERT INTO reminders
         (id, person_id, source_message_id, public_code, reminder_text, due_at, timezone, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?8)`,
      ).bind(id, personId, sourceMessageId, publicCode, reminderText, dueAt, timezone, now).run();
      return { id, publicCode };
    } catch (error) {
      if (attempt === 9) throw error;
    }
  }
  throw new Error("Could not allocate a reminder reference");
}

export async function listReminders(db: D1Database, personId: string): Promise<Reminder[]> {
  const result = await db.prepare(
    `SELECT id, person_id, source_message_id, public_code, reminder_text, due_at, timezone, status,
            claim_token, claimed_at, sent_at, last_error, created_at, updated_at
     FROM reminders WHERE person_id = ?1 AND status IN ('pending', 'claimed') ORDER BY due_at`,
  ).bind(personId).all<Reminder>();
  return result.results;
}

export async function cancelReminder(db: D1Database, personId: string, reminderCode: string): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE reminders SET status = 'cancelled', updated_at = ?1
     WHERE public_code = ?2 AND person_id = ?3 AND status IN ('pending', 'claimed')`,
  ).bind(new Date().toISOString(), reminderCode, personId).run();
  return result.meta.changes === 1;
}

export async function claimDueReminders(db: D1Database, now = new Date().toISOString()): Promise<Reminder[]> {
  const result = await db.prepare(
    `SELECT id, person_id, source_message_id, public_code, reminder_text, due_at, timezone, status,
            claim_token, claimed_at, sent_at, last_error, created_at, updated_at
     FROM reminders WHERE status = 'pending' AND due_at <= ?1 ORDER BY due_at LIMIT 50`,
  ).bind(now).all<Reminder>();
  const claimed: Reminder[] = [];
  for (const reminder of result.results) {
    const token = crypto.randomUUID();
    const claimedAt = new Date().toISOString();
    const update = await db.prepare(
      `UPDATE reminders SET status = 'claimed', claim_token = ?1, claimed_at = ?2, updated_at = ?2
       WHERE id = ?3 AND status = 'pending' AND due_at <= ?4`,
    ).bind(token, claimedAt, reminder.id, now).run();
    if (update.meta.changes === 1) claimed.push({ ...reminder, status: "claimed", claim_token: token, claimed_at: claimedAt, updated_at: claimedAt });
  }
  return claimed;
}

export async function markReminderSent(db: D1Database, reminderId: string, claimToken: string): Promise<void> {
  await db.prepare(
    `UPDATE reminders SET status = 'sent', sent_at = ?1, updated_at = ?1
     WHERE id = ?2 AND claim_token = ?3 AND status = 'claimed'`,
  ).bind(new Date().toISOString(), reminderId, claimToken).run();
}

export async function markReminderFailed(db: D1Database, reminderId: string, claimToken: string, error: string): Promise<void> {
  await db.prepare(
    `UPDATE reminders SET status = 'failed', last_error = ?1, updated_at = ?2
     WHERE id = ?3 AND claim_token = ?4 AND status = 'claimed'`,
  ).bind(error.slice(0, 500), new Date().toISOString(), reminderId, claimToken).run();
}

function randomReminderCode(): string {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return `${values[0] % 100}`.padStart(2, "0") + String.fromCharCode(65 + (values[1] % 26));
}
