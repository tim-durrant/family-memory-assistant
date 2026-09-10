import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import type { Env } from "../src/config.js";

const SECRET = "synthetic-app-secret";

function database(): D1Database {
  const prepare = (sql: string) => ({
    bind: (..._args: unknown[]) => ({
      first: async () => sql.includes("SELECT id FROM people") ? { id: "person-1" } : undefined,
      run: async () => ({ success: true, meta: { changes: 1 } }),
    }),
  });
  return {
    prepare,
    batch: async (_statements: unknown[]) => [
      { success: true, meta: { changes: 0 } },
      { success: true, meta: { changes: 1 } },
    ],
  } as unknown as D1Database;
}

function environment(): Env {
  return {
    DB: database(),
    ENVIRONMENT: "development",
    WHATSAPP_TRANSPORT: "meta",
    WHATSAPP_APP_SECRET: SECRET,
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_ACCESS_TOKEN: "access-token",
    WHATSAPP_PHONE_NUMBER_ID: "production-phone",
    WHATSAPP_WABA_ID: "production-waba",
  };
}

async function signature(body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `sha256=${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

describe("Worker with direct Meta transport", () => {
  it("accepts a signed Meta webhook through the production route", async () => {
    const payload = JSON.stringify({
      entry: [{ changes: [{ field: "messages", value: {
        metadata: { phone_number_id: "production-phone" },
        messages: [{ from: "15550000002", id: "wamid.worker-meta", timestamp: "1735689600", type: "text", text: { body: "hello" } }],
      } }] }],
    });
    const response = await worker.fetch(
      new Request("https://example.test/webhooks/whatsapp", {
        method: "POST",
        headers: { "x-hub-signature-256": await signature(payload) },
        body: payload,
      }),
      environment(),
      { waitUntil: (promise: Promise<unknown>) => promise } as unknown as ExecutionContext,
    );

    expect(response.status).toBe(200);
  });

  it("performs Meta webhook verification through the same route", async () => {
    const response = await worker.fetch(
      new Request("https://example.test/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-123"),
      environment(),
      {} as ExecutionContext,
    );

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("challenge-123");
  });
});
