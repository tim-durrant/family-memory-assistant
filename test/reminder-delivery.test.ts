import { describe, expect, it } from "vitest";
import { deliverDueReminders } from "../src/capabilities/reminders.js";

type Row = {
  id: string;
  person_id: string;
  reminder_text: string;
  due_at: string;
  status: "pending" | "claimed" | "sent" | "failed" | "cancelled";
  claim_token: string | null;
  claimed_at: string | null;
};

function database(rows: Row[], sender: string | null = "+61400000000") {
  const messages: string[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM people")) return (sender ? { whatsapp_id: sender } : null) as T;
              return null as T;
            },
            async all<T>() {
              if (sql.includes("status = 'pending'")) return { results: rows.filter((row) => row.status === "pending") as T[] };
              return { results: [] as T[] };
            },
            async run() {
              if (sql.includes("SET status = 'claimed'")) {
                const row = rows.find((item) => item.id === String(params[2]) && item.status === "pending");
                if (!row) return { success: true, meta: { changes: 0 } };
                row.status = "claimed";
                row.claim_token = String(params[0]);
                row.claimed_at = String(params[1]);
                return { success: true, meta: { changes: 1 } };
              }
              if (sql.includes("SET status = 'sent'")) {
                const row = rows.find((item) => item.id === String(params[1]) && item.claim_token === String(params[2]));
                if (row) row.status = "sent";
              }
              if (sql.includes("SET status = 'failed'")) {
                const row = rows.find((item) => item.id === String(params[2]) && item.claim_token === String(params[3]));
                if (row) row.status = "failed";
              }
              if (sql.includes("INSERT OR IGNORE INTO messages")) messages.push(String(params[3]));
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, messages };
}

function reminder(id: string): Row {
  return { id, person_id: "person-1", reminder_text: "call Mum", due_at: "2026-01-01T00:00:00.000Z", status: "pending", claim_token: null, claimed_at: null };
}

describe("scheduled reminder delivery", () => {
  it("delivers and records a due reminder only once", async () => {
    const fixture = database([reminder("reminder-1")]);
    const transport = { sendText: async (input: { to: string; body: string }) => ({ transportMessageId: "outbound-1", to: input.to, type: "text" as const, body: input.body, rawResponse: {} }) };
    await expect(deliverDueReminders(fixture.db, transport, "2026-01-01T00:01:00.000Z")).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });
    await expect(deliverDueReminders(fixture.db, transport, "2026-01-01T00:02:00.000Z")).resolves.toEqual({ claimed: 0, sent: 0, failed: 0 });
    expect(fixture.messages).toEqual(["Reminder: call Mum"]);
  });

  it("marks failed delivery and missing senders without sending", async () => {
    const failed = database([reminder("reminder-1")]);
    const transport = { sendText: async () => { throw new Error("provider unavailable"); } };
    await expect(deliverDueReminders(failed.db, transport, "2026-01-01T00:01:00.000Z")).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });
    const missing = database([reminder("reminder-2")], null);
    const neverSend = { sendText: async () => { throw new Error("must not send"); } };
    await expect(deliverDueReminders(missing.db, neverSend, "2026-01-01T00:01:00.000Z")).resolves.toEqual({ claimed: 1, sent: 0, failed: 1 });
  });
});
