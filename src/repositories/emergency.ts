export type EmergencyContact = { id: string; phone_number: string; label: string };
export type PendingEmergencySetup = { id: string; setup_kind: "contact" | "safe_word"; payload: string };

async function hashSafeWord(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase()));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createEmergencyContactSetup(db: D1Database, personId: string, phoneNumber: string): Promise<void> {
  const now = new Date();
  await db.batch([
    db.prepare("DELETE FROM pending_emergency_setups WHERE person_id = ?1 AND setup_kind = 'contact'").bind(personId),
    db.prepare(
      `INSERT INTO pending_emergency_setups (id, person_id, setup_kind, payload, created_at, expires_at)
       VALUES (?1, ?2, 'contact', ?3, ?4, ?5)`,
    ).bind(crypto.randomUUID(), personId, phoneNumber, now.toISOString(), new Date(now.getTime() + 30 * 60_000).toISOString()),
  ]);
}

export async function activateEmergencyContact(db: D1Database, personId: string, phoneNumber: string): Promise<boolean> {
  const pending = await db.prepare(
    `SELECT id FROM pending_emergency_setups
     WHERE person_id = ?1 AND setup_kind = 'contact' AND payload = ?2 AND expires_at > ?3 LIMIT 1`,
  ).bind(personId, phoneNumber, new Date().toISOString()).first<{ id: string }>();
  if (!pending) return false;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `INSERT INTO emergency_contacts (id, owner_person_id, phone_number, label, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'trusted emergency contact', 'active', ?4, ?4)
       ON CONFLICT(owner_person_id, phone_number) DO UPDATE SET status = 'active', updated_at = excluded.updated_at`,
    ).bind(crypto.randomUUID(), personId, phoneNumber, now),
    db.prepare("DELETE FROM pending_emergency_setups WHERE id = ?1").bind(pending.id),
  ]);
  return true;
}

export async function createSafeWordSetup(db: D1Database, personId: string, safeWord: string): Promise<void> {
  const now = new Date();
  await db.batch([
    db.prepare("DELETE FROM pending_emergency_setups WHERE person_id = ?1 AND setup_kind = 'safe_word'").bind(personId),
    db.prepare(
      `INSERT INTO pending_emergency_setups (id, person_id, setup_kind, payload, created_at, expires_at)
       VALUES (?1, ?2, 'safe_word', ?3, ?4, ?5)`,
    ).bind(crypto.randomUUID(), personId, await hashSafeWord(safeWord), now.toISOString(), new Date(now.getTime() + 30 * 60_000).toISOString()),
  ]);
}

export async function activateSafeWord(db: D1Database, personId: string, safeWord: string): Promise<boolean> {
  const pending = await db.prepare(
    `SELECT id, payload FROM pending_emergency_setups
     WHERE person_id = ?1 AND setup_kind = 'safe_word' AND expires_at > ?2 LIMIT 1`,
  ).bind(personId, new Date().toISOString()).first<{ id: string; payload: string }>();
  if (!pending || pending.payload !== await hashSafeWord(safeWord)) return false;
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(
      `INSERT INTO emergency_settings (person_id, safe_word_hash, safe_word_status, created_at, updated_at)
       VALUES (?1, ?2, 'active', ?3, ?3)
       ON CONFLICT(person_id) DO UPDATE SET safe_word_hash = excluded.safe_word_hash, safe_word_status = 'active', updated_at = excluded.updated_at`,
    ).bind(personId, pending.payload, now),
    db.prepare("DELETE FROM pending_emergency_setups WHERE id = ?1").bind(pending.id),
  ]);
  return true;
}

export async function isEmergencySafeWord(db: D1Database, personId: string, text: string): Promise<boolean> {
  const row = await db.prepare(
    "SELECT safe_word_hash FROM emergency_settings WHERE person_id = ?1 AND safe_word_status = 'active'",
  ).bind(personId).first<{ safe_word_hash: string | null }>();
  return Boolean(row?.safe_word_hash && row.safe_word_hash === await hashSafeWord(text));
}

export async function createEmergencyAlert(db: D1Database, personId: string, messageId: string): Promise<string | null> {
  const id = crypto.randomUUID();
  const result = await db.prepare(
    "INSERT OR IGNORE INTO emergency_alerts (id, person_id, trigger_message_id, created_at) VALUES (?1, ?2, ?3, ?4)",
  ).bind(id, personId, messageId, new Date().toISOString()).run();
  return result.meta.changes === 1 ? id : null;
}

export async function listEmergencyContacts(db: D1Database, personId: string): Promise<EmergencyContact[]> {
  const result = await db.prepare(
    "SELECT id, phone_number, label FROM emergency_contacts WHERE owner_person_id = ?1 AND status = 'active' ORDER BY created_at",
  ).bind(personId).all<EmergencyContact>();
  return result.results;
}

export async function recordEmergencyDelivery(
  db: D1Database,
  alertId: string,
  channel: "whatsapp" | "sms",
  recipientPhone: string,
  status: "sent" | "failed" | "simulated",
  providerMessageId: string | null,
  error: string | null,
): Promise<void> {
  await db.prepare(
    `INSERT INTO emergency_delivery_attempts
     (id, alert_id, channel, recipient_phone, status, provider_message_id, error, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  ).bind(crypto.randomUUID(), alertId, channel, recipientPhone, status, providerMessageId, error, new Date().toISOString()).run();
}
