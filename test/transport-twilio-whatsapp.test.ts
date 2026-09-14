import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/config.js";
import {
  normalizeInboundMessage,
  normalizePhoneNumber,
  toWhatsAppAddress,
  verifyTwilioSignature,
  TwilioWhatsAppTransport,
} from "../src/transport/twilio-whatsapp.js";

const webhookUrl = "https://example.workers.dev/webhooks/whatsapp";
const authToken = "synthetic-twilio-auth-token";

function testDatabase(): D1Database {
  let seen = false;
  const prepare = (sql: string) => ({
    bind: (..._args: unknown[]) => ({
      first: async () => undefined,
      run: async () => ({ success: true, meta: { changes: 1 } }),
    }),
  });
  return {
    prepare,
    batch: async () => {
      const inserted = !seen;
      seen = true;
      return [
        { success: true, meta: { changes: 0 } },
        { success: true, meta: { changes: inserted ? 1 : 0 } },
      ];
    },
  } as unknown as D1Database;
}

function env(): Env {
  return {
    DB: testDatabase(),
    WHATSAPP_APP_SECRET: "meta-app-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-token",
    WHATSAPP_ACCESS_TOKEN: "meta-access-token",
    WHATSAPP_PHONE_NUMBER_ID: "meta-phone",
    WHATSAPP_WABA_ID: "meta-waba",
    TWILIO_ACCOUNT_SID: "AC1234567890",
    TWILIO_AUTH_TOKEN: authToken,
    TWILIO_WHATSAPP_NUMBER: "+61494813033",
    TWILIO_STATUS_CALLBACK_URL: "https://example.workers.dev/webhooks/twilio/status",
  };
}

async function twilioSignature(body: string, url = webhookUrl): Promise<string> {
  const fields = new URLSearchParams(body);
  const signedData = url + [...new Set([...fields.keys()])].sort().map((name) => name + fields.getAll(name).join("")).join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedData)));
  return btoa(String.fromCharCode(...digest));
}

describe("Twilio WhatsApp transport", () => {
  it("normalizes Twilio WhatsApp addresses and inbound fields", () => {
    const message = normalizeInboundMessage(new URLSearchParams({
      MessageSid: "SM-inbound-1",
      From: "whatsapp:+61 412 345 678",
      To: "whatsapp:+61494813033",
      Body: "My driving test is 12 October 2026",
    }));

    expect(message).toMatchObject({
      transportMessageId: "SM-inbound-1",
      senderId: "61412345678",
      conversationId: "61412345678",
      type: "text",
      text: "My driving test is 12 October 2026",
    });
    expect(normalizePhoneNumber("whatsapp:+61 412 345 678")).toBe("61412345678");
    expect(toWhatsAppAddress("61412345678")).toBe("whatsapp:+61412345678");
  });

  it("validates Twilio's signed form webhook using the exact URL", async () => {
    const body = "Body=hello&From=whatsapp%3A%2B61412345678&MessageSid=SM-1";
    const signature = await twilioSignature(body);

    await expect(verifyTwilioSignature(new TextEncoder().encode(body), signature, webhookUrl, authToken)).resolves.toBe(true);
    await expect(verifyTwilioSignature(new TextEncoder().encode("Body=tampered&From=x&MessageSid=SM-1"), signature, webhookUrl, authToken)).resolves.toBe(false);
    await expect(verifyTwilioSignature(new TextEncoder().encode(body), signature, `${webhookUrl}?changed=1`, authToken)).resolves.toBe(false);
  });

  it("dispatches a valid inbound webhook only once when Twilio retries it", async () => {
    const body = "Body=hello&From=whatsapp%3A%2B61412345678&MessageSid=SM-dedup-1";
    const signature = await twilioSignature(body);
    const transport = new TwilioWhatsAppTransport(env());
    const handler = vi.fn(async () => undefined);

    const first = await transport.handleWebhook(new TextEncoder().encode(body), signature, undefined, handler, webhookUrl);
    const second = await transport.handleWebhook(new TextEncoder().encode(body), signature, undefined, handler, webhookUrl);
    await Promise.all([first.dispatchPromise, second.dispatchPromise]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it("constructs a Twilio WhatsApp text request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ sid: "SM-outbound-1" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new TwilioWhatsAppTransport(env());

    const result = await transport.sendText({ to: "+61412345678", body: "Saved" });
    const [url, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0] ?? [];
    const params = new URLSearchParams(String(init.body));

    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/AC1234567890/Messages.json");
    expect(new Headers(init.headers).get("authorization")).toBe(`Basic ${btoa("AC1234567890:" + authToken)}`);
    expect(params.get("To")).toBe("whatsapp:+61412345678");
    expect(params.get("From")).toBe("whatsapp:+61494813033");
    expect(params.get("Body")).toBe("Saved");
    expect(params.get("StatusCallback")).toBe("https://example.workers.dev/webhooks/twilio/status");
    expect(result.transportMessageId).toBe("SM-outbound-1");
    vi.unstubAllGlobals();
  });
});
