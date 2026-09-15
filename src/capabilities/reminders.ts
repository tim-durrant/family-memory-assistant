import { localDateTimeToIso, type MemoryIntent } from "../interpretation/deterministic.js";
import { createReminder, claimDueReminders, markReminderFailed, markReminderSent } from "../repositories/reminders.js";
import type { WhatsAppTransport } from "../transport/types.js";

export type ReminderOfferPayload = {
  factId?: string;
  reminderText?: string;
  dueDate?: string;
  defaultTime?: string;
  timezone?: string;
};

export type ReminderOfferAnswer =
  | { kind: "yes" | "no" }
  | { kind: "time"; hour: number; minute: number }
  | { kind: "invalid" };

export function isCasualReminderCandidate(intent: Extract<MemoryIntent, { kind: "record_fact" }>): boolean {
  return /^remember\b/i.test(intent.statement)
    && Boolean(intent.effectiveDate)
    && !intent.needsYear
    && intent.dateIssue === "none"
    && intent.category !== "health";
}

export function parseReminderOfferAnswer(text: string, defaultTime = "08:00"): ReminderOfferAnswer {
  const normalized = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/^(?:yes|y|confirm)$/.test(normalized)) {
    const [hour, minute] = defaultTime.split(":").map(Number);
    return { kind: "time", hour, minute };
  }
  if (/^(?:no|n)$/.test(normalized)) return { kind: "no" };
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return { kind: "invalid" };
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (minute > 59 || (match[3] && (hour < 1 || hour > 12)) || (!match[3] && hour > 23)) return { kind: "invalid" };
  if (match[3] === "am" && hour === 12) hour = 0;
  if (match[3] === "pm" && hour !== 12) hour += 12;
  return { kind: "time", hour, minute };
}

export async function createReminderFromOffer(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  payload: ReminderOfferPayload,
  answer: Extract<ReminderOfferAnswer, { kind: "time" }>,
): Promise<{ publicCode: string; dueAt: string } | null> {
  if (!payload.reminderText || !payload.dueDate || !payload.timezone) return null;
  const [year, month, day] = payload.dueDate.split("-").map(Number);
  const dueAt = localDateTimeToIso(year, month, day, answer.hour, answer.minute, payload.timezone);
  if (!dueAt) return null;
  const reminder = await createReminder(db, personId, sourceMessageId, payload.reminderText, dueAt, payload.timezone);
  return { publicCode: reminder.publicCode, dueAt };
}

export function stripRememberPrefix(statement: string): string {
  return statement.replace(/^remember\s+/i, "").replace(/[.!?]+$/, "");
}

export function reminderOfferPrompt(payload: ReminderOfferPayload): string {
  if (!payload.dueDate || !payload.defaultTime || !payload.timezone) return "Reply yes to schedule a reminder, or reply with a different time. Reply no to skip the reminder.";
  const [hour, minute] = payload.defaultTime.split(":").map(Number);
  const displayTime = new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(Date.UTC(2026, 0, 1, hour, minute))).toLowerCase();
  const displayDate = new Intl.DateTimeFormat("en-AU", { timeZone: payload.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${payload.dueDate}T12:00:00Z`));
  return `Reply yes to schedule a reminder for ${displayTime} on ${displayDate}, or reply with a different time such as 3:00 pm. Reply no to skip the reminder.`;
}

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
