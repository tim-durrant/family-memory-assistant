import { claimDueReminders, markReminderFailed, markReminderSent } from "../repositories/reminders.js";
import type { WhatsAppTransport } from "../transport/types.js";

/** Claims and delivers due reminders; safe to invoke from every Cron retry. */
export async function deliverDueReminders(
  db: D1Database,
  transport: Pick<WhatsAppTransport, "sendText">,
  now = new Date().toISOString(),
): Promise<{ claimed: number; sent: number; failed: number }> {
  const reminders = await claimDueReminders(db, now);
  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    const person = await db.prepare("SELECT whatsapp_id FROM people WHERE id = ?1 AND active = 1 AND is_sender = 1")
      .bind(reminder.person_id).first<{ whatsapp_id: string }>();
    if (!person?.whatsapp_id) {
      await markReminderFailed(db, reminder.id, reminder.claim_token!, "Reminder owner has no active WhatsApp sender");
      failed += 1;
      continue;
    }
    try {
      const delivered = await transport.sendText({ to: person.whatsapp_id, body: `Reminder: ${reminder.reminder_text}` });
      await markReminderSent(db, reminder.id, reminder.claim_token!);
      await db.prepare(
        `INSERT OR IGNORE INTO messages
         (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
         VALUES (?1, ?2, ?3, 'outbound', 'text', ?4, ?5, ?6)`,
      ).bind(crypto.randomUUID(), reminder.person_id, delivered.transportMessageId, delivered.body, JSON.stringify(delivered.rawResponse), new Date().toISOString()).run();
      sent += 1;
    } catch (error) {
      await markReminderFailed(db, reminder.id, reminder.claim_token!, error instanceof Error ? error.message : "Reminder delivery failed");
      failed += 1;
    }
  }
  return { claimed: reminders.length, sent, failed };
}
