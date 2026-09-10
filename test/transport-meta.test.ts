import { describe, expect, it, vi } from "vitest";
import { extractMessages, MetaWhatsAppTransport, verifySignature } from "../src/transport/whatsapp-meta.js";
import type { Env } from "../src/config.js";

function testDatabase(windowOpen = true) {
  let dedupeInsertions = 0;
  const prepare = (sql: string) => ({
    bind: (..._args: unknown[]) => ({
      first: async () => sql.includes("SELECT value") && windowOpen
        ? { value: "true", expires_at: null }
        : undefined,
      run: async () => ({ success: true, meta: { changes: 1 } }),
    }),
  });
  return {
    prepare: (sql: string) => prepare(sql),
    batch: async (_statements: unknown[]) => [
      { success: true, meta: { changes: 0 } },
      { success: true, meta: { changes: dedupeInsertions++ === 0 ? 1 : 0 } },
    ],
  } as unknown as D1Database;
}

function testEnv(db: D1Database): Env {
  return {
    DB: db,
    WHATSAPP_APP_SECRET: "synthetic-app-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_ACCESS_TOKEN: "access-token",
    WHATSAPP_PHONE_NUMBER_ID: "production-phone",
    WHATSAPP_WABA_ID: "production-waba",
  };
}

async function signedPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  return `sha256=${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

describe("direct Meta WhatsApp transport", () => {
  it("verifies a valid Meta HMAC signature and rejects a tampered body", async () => {
    const body = new TextEncoder().encode("{\"hello\":\"world\"}");
    const secret = "synthetic-app-secret";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, body));
    const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");

    await expect(verifySignature(body, `sha256=${hex}`, secret)).resolves.toBe(true);
    await expect(verifySignature(new TextEncoder().encode("tampered"), `sha256=${hex}`, secret)).resolves.toBe(false);
    await expect(verifySignature(body, null, secret)).resolves.toBe(false);
  });

  it("dispatches a valid inbound message once when Meta retries it", async () => {
    const payload = JSON.stringify({
      entry: [{ changes: [{ field: "messages", value: {
        metadata: { phone_number_id: "production-phone" },
        messages: [{ from: "15550000002", id: "wamid.meta-dedup", timestamp: "1735689600", type: "text", text: { body: "hello" } }],
      } }] }],
    });
    const body = new TextEncoder().encode(payload);
    const transport = new MetaWhatsAppTransport(testEnv(testDatabase()));
    const handler = vi.fn(async () => undefined);
    const signature = await signedPayload(payload, "synthetic-app-secret");

    const first = await transport.handleWebhook(body, signature, JSON.parse(payload), handler);
    const second = await transport.handleWebhook(body, signature, JSON.parse(payload), handler);
    await Promise.all([first.dispatchPromise, second.dispatchPromise]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("constructs a direct Graph API text reply within the tracked window", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.meta-out" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new MetaWhatsAppTransport(testEnv(testDatabase()));

    const result = await transport.sendText({ to: "15550000002", body: "Saved", replyTo: "wamid.meta-in" });
    const [url, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0] ?? [];
    expect(url).toBe("https://graph.facebook.com/v25.0/production-phone/messages");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
    expect(JSON.parse(String(init.body))).toMatchObject({
      messaging_product: "whatsapp",
      to: "15550000002",
      type: "text",
      text: { body: "Saved" },
      context: { message_id: "wamid.meta-in" },
    });
    expect(result.transportMessageId).toBe("wamid.meta-out");
    vi.unstubAllGlobals();
  });

  it("normalises only messages for the configured phone number", () => {
    const messages = extractMessages({
      entry: [{ changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "production-phone" },
            messages: [{
              from: "15550000002",
              id: "wamid.meta-1",
              timestamp: "1735689600",
              type: "text",
              text: { body: "Remember the appointment" },
            }],
          },
        },
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "test-phone" },
            messages: [{ from: "15550000003", id: "wamid.other", type: "text", text: { body: "ignore" } }],
          },
        },
      ] }],
    }, "production-phone");

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      transportMessageId: "wamid.meta-1",
      senderId: "15550000002",
      type: "text",
      text: "Remember the appointment",
      receivedAt: "2025-01-01T00:00:00.000Z",
    });
  });
});
