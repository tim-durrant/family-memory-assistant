import type { Env } from "../config.js";
import { D1Adapter } from "../storage.js";
import type {
  InboundMessage,
  MessageHandler,
  OutboundMessage,
  WhatsAppTransport,
  WebhookDispatch,
} from "./types.js";

const GRAPH_API_VERSION = "v25.0";
const DEDUPLICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REPLY_WINDOW_TTL_MS = 24 * 60 * 60 * 1000;

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: MetaMessage[];
      };
    }>;
  }>;
};

type MetaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  [key: string]: unknown;
};

type MetaSendResponse = {
  messages?: Array<{ id?: string }>;
  [key: string]: unknown;
};

/** Direct implementation of the official WhatsApp Cloud API. */
export class MetaWhatsAppTransport implements WhatsAppTransport {
  private readonly storage: D1Adapter;

  constructor(private readonly env: Env) {
    this.storage = new D1Adapter(env.DB);
  }

  async verifyWebhook(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (
      url.searchParams.get("hub.mode") !== "subscribe" ||
      url.searchParams.get("hub.verify_token") !== this.env.WHATSAPP_VERIFY_TOKEN
    ) {
      return new Response(null, { status: 403 });
    }

    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }

  async handleWebhook(
    rawBody: Uint8Array,
    signature: string | null,
    parsedPayload: unknown,
    onMessage: MessageHandler,
  ): Promise<WebhookDispatch> {
    if (!(await verifySignature(rawBody, signature, this.env.WHATSAPP_APP_SECRET))) {
      return { status: 401, dispatchPromise: Promise.resolve() };
    }
    if (!isMetaWebhookPayload(parsedPayload)) {
      return { status: 400, dispatchPromise: Promise.resolve() };
    }

    const messages = extractMessages(parsedPayload, this.env.WHATSAPP_PHONE_NUMBER_ID);
    const dispatchPromise = Promise.all(messages.map(async (message) => {
      const accepted = await this.storage.setIfAbsent(
        `meta:webhook:${message.transportMessageId}`,
        true,
        DEDUPLICATION_TTL_MS,
      );
      if (accepted) {
        await this.storage.set(`meta:window:${message.senderId}`, true, REPLY_WINDOW_TTL_MS);
        await onMessage(message);
      }
    })).then(() => undefined);

    return { status: 200, dispatchPromise };
  }

  async sendText(input: { to: string; body: string; replyTo?: string }): Promise<OutboundMessage> {
    const windowOpen = await this.storage.get<boolean>(`meta:window:${input.to}`);
    if (!windowOpen) throw new Error("WhatsApp reply window is not open");

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: input.to,
          type: "text",
          text: { preview_url: false, body: input.body },
          ...(input.replyTo ? { context: { message_id: input.replyTo } } : {}),
        }),
      },
    );
    const rawResponse = await response.json() as MetaSendResponse;
    if (!response.ok) {
      throw new Error(`WhatsApp Graph API returned ${response.status}`);
    }

    const transportMessageId = rawResponse.messages?.[0]?.id;
    if (!transportMessageId) throw new Error("WhatsApp did not return an outbound message ID");
    return { transportMessageId, to: input.to, type: "text", body: input.body, rawResponse };
  }
}

function extractMessages(payload: MetaWebhookPayload, phoneNumberId: string): InboundMessage[] {
  const messages: InboundMessage[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || change.value?.metadata?.phone_number_id !== phoneNumberId) continue;
      for (const message of change.value.messages ?? []) {
        if (!message.id || !message.from) continue;
        const timestamp = Number(message.timestamp);
        messages.push({
          id: crypto.randomUUID(),
          transportMessageId: message.id,
          senderId: message.from,
          conversationId: message.from,
          type: message.type === "text" && typeof message.text?.body === "string" ? "text" : "unsupported",
          text: message.type === "text" && typeof message.text?.body === "string" ? message.text.body : null,
          receivedAt: Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : new Date().toISOString(),
          rawPayload: message,
        });
      }
    }
  }
  return messages;
}

function isMetaWebhookPayload(value: unknown): value is MetaWebhookPayload {
  if (typeof value !== "object" || value === null) return false;
  const payload = value as MetaWebhookPayload;
  return Array.isArray(payload.entry);
}

async function verifySignature(body: Uint8Array, signature: string | null, secret: string): Promise<boolean> {
  if (!signature?.startsWith("sha256=") || !/^[0-9a-f]{64}$/i.test(signature.slice(7))) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bodyBuffer = new ArrayBuffer(body.byteLength);
  new Uint8Array(bodyBuffer).set(body);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, bodyBuffer));
  const expected = signature.slice(7).toLowerCase();
  const actual = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(actual, expected);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export { extractMessages, verifySignature };
