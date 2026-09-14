export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "undelivered" | "failed";

const STATUS_RANK: Record<DeliveryStatus, number> = {
  queued: 1,
  sent: 2,
  delivered: 3,
  read: 4,
  undelivered: 3,
  failed: 3,
};

export function normalizeTwilioStatus(value: string | null): DeliveryStatus | null {
  if (value === "queued" || value === "sent" || value === "delivered" || value === "read" || value === "undelivered" || value === "failed") return value;
  return null;
}

export async function recordDeliveryStatus(
  db: D1Database,
  providerMessageId: string,
  status: DeliveryStatus,
  occurredAt: string,
  errorCode: string | null,
  errorMessage: string | null,
): Promise<"updated" | "ignored" | "unknown"> {
  const known = await db.prepare("SELECT whatsapp_message_id FROM messages WHERE whatsapp_message_id = ?1 AND direction = 'outbound' LIMIT 1")
    .bind(providerMessageId).first<{ whatsapp_message_id: string }>();
  if (!known) return "unknown";
  const existing = await db.prepare("SELECT status, occurred_at FROM message_delivery_status WHERE provider_message_id = ?1")
    .bind(providerMessageId).first<{ status: DeliveryStatus; occurred_at: string }>();
  if (existing && (STATUS_RANK[status] < STATUS_RANK[existing.status] || (STATUS_RANK[status] === STATUS_RANK[existing.status] && occurredAt <= existing.occurred_at))) return "ignored";
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO message_delivery_status
       (provider_message_id, provider, status, error_code, error_message, occurred_at, created_at, updated_at)
     VALUES (?1, 'twilio', ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(provider_message_id) DO UPDATE SET
       status = excluded.status, error_code = excluded.error_code, error_message = excluded.error_message,
       occurred_at = excluded.occurred_at, updated_at = excluded.updated_at`,
  ).bind(providerMessageId, status, errorCode, errorMessage?.slice(0, 500) ?? null, occurredAt, now).run();
  return existing ? "updated" : "updated";
}
