import { describe, expect, it, vi } from "vitest";
import {
  computeSignature,
  WebhookReceiver,
  type MessageEvent,
} from "@dojocoding/whatsapp-sdk";

const secret = "synthetic-app-secret";
const payload = JSON.stringify({
  object: "whatsapp_business_account",
  entry: [{ id: "waba", changes: [{ field: "messages", value: {
    metadata: { phone_number_id: "phone" },
    messages: [{ from: "15550000002", id: "wamid.test-1", timestamp: "1735689600", type: "text", text: { body: "hello" } }],
  } }] }],
});

describe("Dojo webhook contract", () => {
  it("dispatches a valid text message once even when Meta retries it", async () => {
    const handler = vi.fn(async (_event: MessageEvent) => undefined);
    const receiver = new WebhookReceiver({ appSecret: secret, verifyToken: "verify" });
    receiver.on("message", handler);
    const signature = await computeSignature(payload, secret);

    const first = await receiver.handlePayload(new TextEncoder().encode(payload), signature, JSON.parse(payload));
    const second = await receiver.handlePayload(new TextEncoder().encode(payload), signature, JSON.parse(payload));
    if (first.status !== 200 || second.status !== 200) {
      throw new Error(`Expected successful webhook results: ${first.status}, ${second.status}`);
    }
    await Promise.all([first.dispatchPromise, second.dispatchPromise]);
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]?.[0].type).toBe("text");
  });

  it("rejects a tampered or unsigned delivery", async () => {
    const receiver = new WebhookReceiver({ appSecret: secret, verifyToken: "verify" });
    const result = await receiver.handlePayload(payload, null, JSON.parse(payload));
    expect(result.status).toBe(401);
  });
});
