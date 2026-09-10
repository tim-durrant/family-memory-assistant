import {
  WebhookReceiver,
  WhatsAppClient,
  WindowTracker,
  type MessageEvent,
} from "@dojocoding/whatsapp-sdk";
import type { Env } from "../config.js";
import { D1Adapter } from "../storage.js";
import type {
  InboundMessage,
  MessageHandler,
  OutboundMessage,
  WhatsAppTransport,
  WebhookDispatch,
} from "./types.js";

/**
 * Current WhatsApp implementation. Keeping Dojo here prevents its event types
 * from leaking into the application and gives the direct Meta adapter parity
 * targets for the migration.
 */
export class DojoWhatsAppTransport implements WhatsAppTransport {
  private readonly storage: D1Adapter;
  private readonly tracker: WindowTracker;
  private readonly client: WhatsAppClient;

  constructor(private readonly env: Env) {
    this.storage = new D1Adapter(env.DB);
    this.tracker = new WindowTracker({
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      storage: this.storage,
    });
    this.client = new WhatsAppClient({
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      wabaId: env.WHATSAPP_WABA_ID,
      token: env.WHATSAPP_ACCESS_TOKEN,
      appSecret: env.WHATSAPP_APP_SECRET,
      windowTracker: this.tracker,
    });
  }

  async verifyWebhook(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const receiver = new WebhookReceiver({
      appSecret: this.env.WHATSAPP_APP_SECRET,
      verifyToken: this.env.WHATSAPP_VERIFY_TOKEN,
    });
    const result = await receiver.handleVerifyRequest({
      mode: url.searchParams.get("hub.mode"),
      verifyToken: url.searchParams.get("hub.verify_token"),
      challenge: url.searchParams.get("hub.challenge"),
    });
    if (result.status !== 200) return new Response(null, { status: 403 });
    return new Response(result.body, { status: 200 });
  }

  async handleWebhook(
    rawBody: Uint8Array,
    signature: string | null,
    parsedPayload: unknown,
    onMessage: MessageHandler,
  ): Promise<WebhookDispatch> {
    const receiver = new WebhookReceiver({
      appSecret: this.env.WHATSAPP_APP_SECRET,
      verifyToken: this.env.WHATSAPP_VERIFY_TOKEN,
      storage: this.storage,
    });
    receiver.on("message", async (event: MessageEvent) => {
      await this.tracker.notifyInbound(event.from);
      await onMessage(normalizeMessage(event));
    });
    receiver.on("error", (error: unknown) => console.error("[whatsapp] handler failed", error));

    const result = await receiver.handlePayload(rawBody, signature, parsedPayload);
    if (result.status !== 200) {
      return { status: result.status, dispatchPromise: Promise.resolve() };
    }
    return { status: result.status, dispatchPromise: result.dispatchPromise };
  }

  async sendText(input: { to: string; body: string; replyTo?: string }): Promise<OutboundMessage> {
    const response = await this.client.sendText(input);
    const transportMessageId = response.messages?.[0]?.id;
    if (!transportMessageId) throw new Error("WhatsApp did not return an outbound message ID");

    return {
      transportMessageId,
      to: input.to,
      type: "text",
      body: input.body,
      rawResponse: response,
    };
  }
}

export function normalizeMessage(event: MessageEvent): InboundMessage {
  const text = extractText(event);
  return {
    id: crypto.randomUUID(),
    transportMessageId: event.id,
    senderId: event.from,
    conversationId: event.from,
    type: event.type === "text" ? "text" : "unsupported",
    text,
    receivedAt: new Date(event.timestamp).toISOString(),
    rawPayload: event.body,
  };
}

function extractText(event: MessageEvent): string | null {
  if (event.type !== "text" || typeof event.body.text !== "object" || event.body.text === null) return null;
  if (!("body" in event.body.text) || typeof event.body.text.body !== "string") return null;
  return event.body.text.body;
}
