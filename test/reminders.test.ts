import { describe, expect, it } from "vitest";
import { buildMemoryReply } from "../src/capabilities/memory.js";
import { DEFAULT_DETERMINISTIC_CONFIG } from "../src/config.js";
import { interpretMessage } from "../src/interpretation/deterministic.js";
import { claimDueReminders } from "../src/repositories/reminders.js";

type ReminderRow = {
  id: string;
  person_id: string;
  source_message_id: string;
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

function database(reminders: ReminderRow[] = []) {
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM reminders") && sql.includes("status IN")) return (reminders.filter((item) => item.status === "pending" || item.status === "claimed")) as T[] as T;
              return null as T;
            },
            async all<T>() {
              if (sql.includes("FROM reminders")) return { results: reminders as T[] };
              return { results: [] as T[] };
            },
            async run() {
              if (sql.includes("INSERT INTO reminders")) {
                const now = new Date().toISOString();
                reminders.push({
                  id: String(params[0]), person_id: String(params[1]), source_message_id: String(params[2]), public_code: String(params[3]), reminder_text: String(params[4]),
                  due_at: String(params[5]), timezone: String(params[6]), status: "pending", claim_token: null, claimed_at: null,
                  sent_at: null, last_error: null, created_at: now, updated_at: now,
                });
              }
              if (sql.includes("SET status = 'claimed'")) {
                const reminder = reminders.find((item) => item.id === String(params[2]) && item.status === "pending");
                if (!reminder) return { success: true, meta: { changes: 0 } };
                reminder.status = "claimed";
                reminder.claim_token = String(params[0]);
                reminder.claimed_at = String(params[1]);
                reminder.updated_at = String(params[1]);
                return { success: true, meta: { changes: 1 } };
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return db;
}

const enabledConfig = { ...DEFAULT_DETERMINISTIC_CONFIG, enableReminderCreation: true };

describe("deterministic reminders", () => {
  it("parses an explicit local date and time", () => {
    expect(interpretMessage("Remind me on 15 November 2026 at 9:00 to call Mum")).toEqual({
      kind: "create_reminder",
      dueAt: "2026-11-14T23:00:00.000Z",
      reminderText: "call Mum",
    });
  });

  it("rejects incomplete, invalid, and ambiguous reminder dates", () => {
    expect(interpretMessage("Remind me sometime to call Mum")).toEqual({ kind: "unknown" });
    expect(interpretMessage("Remind me on 31 February 2026 at 9:00 to call Mum")).toEqual({ kind: "unknown" });
    expect(interpretMessage("Remind me on 15 November 2026 to call Mum")).toEqual({ kind: "unknown" });
  });

  it("creates, lists, and cancels reminders through the capability", async () => {
    const reminders: ReminderRow[] = [];
    const db = database(reminders);
    await expect(buildMemoryReply(db, "person-1", "message-1", "Remind me on 15 November 2026 at 9:00 to call Mum", enabledConfig))
      .resolves.toMatch(/^Reminder \d{2}[A-Z] created for/);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].reminder_text).toBe("call Mum");

    const listed = [{
      id: "reminder-1", person_id: "person-1", source_message_id: "message-1", public_code: "47K", reminder_text: "call Mum",
      due_at: "2026-11-14T23:00:00.000Z", timezone: "Australia/Brisbane", status: "pending" as const,
      claim_token: null, claimed_at: null, sent_at: null, last_error: null, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    }];
    await expect(buildMemoryReply(database(listed), "person-1", "message-2", "List my reminders"))
      .resolves.toContain("47K");
    await expect(buildMemoryReply(database(listed), "person-1", "message-3", "Cancel reminder 47K"))
      .resolves.toBe("Cancelled reminder 47K.");
  });

  it("claims each due reminder once", async () => {
    const reminder: ReminderRow = {
      id: "reminder-1", person_id: "person-1", source_message_id: "message-1", public_code: "47K", reminder_text: "call Mum",
      due_at: "2026-01-01T00:00:00.000Z", timezone: "UTC", status: "pending", claim_token: null,
      claimed_at: null, sent_at: null, last_error: null, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
    };
    const db = database([reminder]);
    const first = await claimDueReminders(db, "2026-01-01T00:01:00.000Z");
    const second = await claimDueReminders(db, "2026-01-01T00:01:00.000Z");
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(0);
    expect(reminder.status).toBe("claimed");
  });
});
