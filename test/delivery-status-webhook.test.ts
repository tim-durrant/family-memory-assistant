import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import type { Env } from "../src/config.js";

const AUTH_TOKEN = "twilio-test-auth-token";

function database(knownMessage = true): D1Database {
  const prepare = (sql: string) => ({
    bind: (..._args: unknown[]) => ({
      first: async () => sql.includes("FROM messages") && knownMessage ? { whatsapp_message_id: "SM123" } : null,
      run: async () => ({ success: true, meta: { changes: 1 } }),
    }),
  });
  return { prepare } as unknown as D1Database;
}

function environment(knownMessage = true): Env {
  return {
    DB: database(knownMessage),
    WHATSAPP_TRANSPORT: "twilio",
    WHATSAPP_APP_SECRET: "unused",
    WHATSAPP_VERIFY_TOKEN: "unused",
    WHATSAPP_ACCESS_TOKEN: "unused",
    WHATSAPP_PHONE_NUMBER_ID: "unused",
    WHATSAPP_WABA_ID: "unused",
    TWILIO_AUTH_TOKEN: AUTH_TOKEN,
  };
}

async function signature(url: string, body: string): Promise<string> {
  const fields = new URLSearchParams(body);
  const names = [...new Set([...fields.keys()])].sort();
  let signedData = url;
  for (const name of names) signedData += name + fields.getAll(name).join("");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedData)));
  return btoa(String.fromCharCode(...digest));
}

const context = {} as ExecutionContext;

describe("Twilio delivery-status webhook", () => {
  it("accepts a valid callback for a known outbound message", async () => {
    const url = "https://example.test/webhooks/twilio/status";
    const body = "MessageSid=SM123&MessageStatus=delivered&Timestamp=2026-09-15T00%3A00%3A00.000Z";
    const response = await worker.fetch(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": await signature(url, body), "content-type": "application/x-www-form-urlencoded" },
      body,
    }), environment(), context);
    expect(response.status).toBe(204);
  });

  it("rejects invalid signatures and malformed statuses", async () => {
    const url = "https://example.test/webhooks/twilio/status";
    const validBody = "MessageSid=SM123&MessageStatus=delivered";
    const invalid = await worker.fetch(new Request(url, { method: "POST", headers: { "x-twilio-signature": "invalid" }, body: validBody }), environment(), context);
    expect(invalid.status).toBe(401);
    const malformedBody = "MessageSid=SM123&MessageStatus=processing";
    const malformed = await worker.fetch(new Request(url, { method: "POST", headers: { "x-twilio-signature": await signature(url, malformedBody) }, body: malformedBody }), environment(), context);
    expect(malformed.status).toBe(400);
  });

  it("acknowledges callbacks for unknown provider messages without writing", async () => {
    const url = "https://example.test/webhooks/twilio/status";
    const body = "MessageSid=SM-unknown&MessageStatus=failed";
    const response = await worker.fetch(new Request(url, {
      method: "POST",
      headers: { "x-twilio-signature": await signature(url, body) },
      body,
    }), environment(false), context);
    expect(response.status).toBe(204);
  });
});
