import { describe, expect, it } from "vitest";
import { normalizeTwilioStatus, recordDeliveryStatus } from "../src/repositories/delivery-status.js";

type Current = { status: "queued" | "sent" | "delivered" | "read" | "undelivered" | "failed"; occurred_at: string } | null;

function database(options: { known?: boolean; current?: Current } = {}) {
  let current = options.current ?? null;
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM messages")) return (options.known === false ? null : { whatsapp_message_id: "SM123" }) as T;
              if (sql.includes("FROM message_delivery_status")) return current as T;
              return null as T;
            },
            async run() {
              current = { status: String(params[1]) as NonNullable<Current>["status"], occurred_at: String(params[4]) };
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, getCurrent: () => current };
}

describe("Twilio delivery status", () => {
  it("accepts only supported statuses", () => {
    expect(normalizeTwilioStatus("delivered")).toBe("delivered");
    expect(normalizeTwilioStatus("read")).toBe("read");
    expect(normalizeTwilioStatus("processing")).toBeNull();
    expect(normalizeTwilioStatus(null)).toBeNull();
  });

  it("ignores unknown provider messages", async () => {
    await expect(recordDeliveryStatus(database({ known: false }).db, "SM-unknown", "delivered", "2026-09-15T00:00:00.000Z", null, null))
      .resolves.toBe("unknown");
  });

  it("ignores older or duplicate callbacks and accepts newer states", async () => {
    const fixture = database({ current: { status: "delivered", occurred_at: "2026-09-15T00:05:00.000Z" } });
    await expect(recordDeliveryStatus(fixture.db, "SM123", "sent", "2026-09-15T00:04:00.000Z", null, null)).resolves.toBe("ignored");
    await expect(recordDeliveryStatus(fixture.db, "SM123", "delivered", "2026-09-15T00:05:00.000Z", null, null)).resolves.toBe("ignored");
    await expect(recordDeliveryStatus(fixture.db, "SM123", "read", "2026-09-15T00:06:00.000Z", null, null)).resolves.toBe("updated");
    expect(fixture.getCurrent()?.status).toBe("read");
  });
});
