import { describe, expect, it, vi } from "vitest";
import { WhatsAppClient } from "@dojocoding/whatsapp-sdk";

describe("outbound acknowledgement", () => {
  it("constructs the WhatsApp text reply request", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new WhatsAppClient({
      phoneNumberId: "phone-id",
      wabaId: "waba-id",
      token: "token",
      appSecret: "secret",
    });

    await client.sendText({ to: "15550000002", body: "Saved: I’ve recorded that.", replyTo: "wamid.in" });
    const [url, init] = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0] ?? [];
    expect(url).toContain("/phone-id/messages");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer token");
    expect(JSON.parse(String(init.body))).toMatchObject({
      messaging_product: "whatsapp",
      to: "15550000002",
      type: "text",
      text: { body: "Saved: I’ve recorded that." },
      context: { message_id: "wamid.in" },
    });
    vi.unstubAllGlobals();
  });
});
