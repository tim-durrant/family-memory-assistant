import type { Env } from "../config.js";
import { D1Adapter } from "../storage.js";
import type {
  InboundMessage,
  MessageHandler,
  OutboundMessage,
  WhatsAppTransport,
  WebhookDispatch,
} from "./types.js";

const TWILIO_API_BASE_URL = "https://api.twilio.com/2010-04-01/Accounts";
const DEDUPLICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** WhatsApp transport backed by Twilio's Messaging API. */
export class TwilioWhatsAppTransport implements WhatsAppTransport {
  private readonly storage: D1Adapter;

  constructor(private readonly env: Env) {
    this.storage = new D1Adapter(env.DB);
    requireTwilioConfig(env);
  }

  async verifyWebhook(_request: Request): Promise<Response> {
    // Twilio does not use Meta's GET verification handshake.
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }

  async handleWebhook(
    rawBody: Uint8Array,
    signature: string | null,
    _parsedPayload: unknown,
    onMessage: MessageHandler,
    webhookUrl?: string,
  ): Promise<WebhookDispatch> {
    if (!webhookUrl || !(await verifyTwilioSignature(rawBody, signature, webhookUrl, this.env.TWILIO_AUTH_TOKEN!))) {
      return { status: 401, dispatchPromise: Promise.resolve() };
    }

    const fields = parseFormBody(rawBody);
    const message = normalizeInboundMessage(fields);
    if (!message) return { status: 400, dispatchPromise: Promise.resolve() };

    const dispatchPromise = this.storage
      .setIfAbsent(`twilio:webhook:${message.transportMessageId}`, true, DEDUPLICATION_TTL_MS)
      .then(async (accepted) => {
        if (accepted) await onMessage(message);
      });

    return { status: 200, dispatchPromise };
  }

  async sendText(input: { to: string; body: string; replyTo?: string }): Promise<OutboundMessage> {
    return this.sendTwilioText(input, toWhatsAppAddress(this.env.TWILIO_WHATSAPP_NUMBER!), toWhatsAppAddress(input.to));
  }

  async sendSms(input: { to: string; body: string }): Promise<OutboundMessage> {
    if (!this.env.TWILIO_SMS_NUMBER) throw new Error("Twilio SMS notifications require TWILIO_SMS_NUMBER");
    return this.sendTwilioText(input, this.env.TWILIO_SMS_NUMBER, normalizePhoneNumber(input.to));
  }

  private async sendTwilioText(input: { to: string; body: string; replyTo?: string }, from: string, to: string): Promise<OutboundMessage> {
    const accountSid = this.env.TWILIO_ACCOUNT_SID!;
    const body = new URLSearchParams({
      To: to,
      From: from,
      Body: input.body,
      ...(this.env.TWILIO_STATUS_CALLBACK_URL ? { StatusCallback: this.env.TWILIO_STATUS_CALLBACK_URL } : {}),
    });

    const response = await fetch(`${TWILIO_API_BASE_URL}/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${this.env.TWILIO_AUTH_TOKEN!}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const rawResponse = await readJsonOrText(response);
    if (!response.ok) {
      const detail = extractTwilioErrorDetail(rawResponse);
      throw new Error(`Twilio Messages API returned ${response.status}${detail ? `: ${detail}` : ""}`);
    }

    const transportMessageId = extractMessageSid(rawResponse);
    if (!transportMessageId) throw new Error("Twilio did not return a message SID");

    return {
      transportMessageId,
      to: normalizePhoneNumber(input.to),
      type: "text",
      body: input.body,
      rawResponse,
    };
  }
}

function requireTwilioConfig(env: Env): void {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_WHATSAPP_NUMBER) {
    throw new Error("Twilio transport requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER");
  }
}

function parseFormBody(rawBody: Uint8Array): URLSearchParams {
  return new URLSearchParams(new TextDecoder().decode(rawBody));
}

function normalizeInboundMessage(fields: URLSearchParams): InboundMessage | undefined {
  const messageSid = fields.get("MessageSid");
  const from = fields.get("From");
  if (!messageSid || !from) return undefined;

  const body = fields.get("Body");
  const receivedAt = new Date().toISOString();
  const normalizedFrom = normalizePhoneNumber(from);

  return {
    id: crypto.randomUUID(),
    transportMessageId: messageSid,
    senderId: normalizedFrom,
    conversationId: normalizedFrom,
    type: body !== null ? "text" : "unsupported",
    text: body,
    receivedAt,
    rawPayload: Object.fromEntries(fields.entries()),
  };
}

function normalizePhoneNumber(value: string): string {
  const withoutScheme = value.replace(/^whatsapp:/i, "");
  return withoutScheme.replace(/\D/g, "");
}

function toWhatsAppAddress(value: string): string {
  const digits = normalizePhoneNumber(value);
  return `whatsapp:+${digits}`;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function extractMessageSid(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("sid" in value)) return undefined;
  const sid = (value as { sid?: unknown }).sid;
  return typeof sid === "string" && sid.length > 0 ? sid : undefined;
}

function extractTwilioErrorDetail(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const error = value as { code?: unknown; message?: unknown; more_info?: unknown };
  const code = typeof error.code === "number" || typeof error.code === "string" ? String(error.code) : undefined;
  const message = typeof error.message === "string" ? error.message : undefined;
  if (!code && !message) return undefined;
  return [code, message].filter(Boolean).join(" ");
}

/** Validate Twilio's signature over the exact raw form body and webhook URL. */
async function verifyTwilioSignature(
  rawBody: Uint8Array,
  signature: string | null,
  webhookUrl: string,
  authToken: string,
): Promise<boolean> {
  if (!signature) return false;

  const fields = parseFormBody(rawBody);
  const names = [...new Set([...fields.keys()])].sort();
  let signedData = webhookUrl;
  for (const name of names) {
    signedData += name + fields.getAll(name).join("");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedData)));
  const expected = btoa(String.fromCharCode(...digest));
  return constantTimeEqual(expected, signature);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export {
  extractMessageSid,
  normalizeInboundMessage,
  normalizePhoneNumber,
  parseFormBody,
  toWhatsAppAddress,
  verifyTwilioSignature,
};
