import type { MessageEvent } from "@dojocoding/whatsapp-sdk";
import { getDeterministicConfig, isDevelopment, type Env } from "./config.js";
import { developmentFixture } from "./fixture.js";
import { DojoWhatsAppTransport } from "./transport/dojo.js";
import { MetaWhatsAppTransport } from "./transport/whatsapp-meta.js";
import { TwilioWhatsAppTransport } from "./transport/twilio-whatsapp.js";
import type { InboundMessage, WhatsAppTransport } from "./transport/types.js";
import { buildMemoryReply } from "./capabilities/memory.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    console.log("[request]", request.method, url.pathname);
    if (url.pathname === "/dev/fixture" && request.method === "GET") {
      if (!isDevelopment(env)) return new Response("Not found", { status: 404 });
      return Response.json(developmentFixture);
    }

    if (url.pathname !== "/webhooks/whatsapp") {
      return new Response("Not found", { status: 404 });
    }
    const transport = createWhatsAppTransport(env);
    if (request.method === "GET") return transport.verifyWebhook(request);
    if (request.method === "POST") return handleWebhook(request, env, ctx, transport, env.WHATSAPP_TRANSPORT === "twilio");
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  },
};

function createWhatsAppTransport(env: Env): WhatsAppTransport {
  if (env.WHATSAPP_TRANSPORT === "twilio") return new TwilioWhatsAppTransport(env);
  return env.WHATSAPP_TRANSPORT === "meta"
    ? new MetaWhatsAppTransport(env)
    : new DojoWhatsAppTransport(env);
}

async function handleWebhook(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  transport: WhatsAppTransport,
  isTwilio: boolean,
): Promise<Response> {
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get(isTwilio ? "x-twilio-signature" : "x-hub-signature-256");
  let parsed: unknown;
  if (!isTwilio) {
    try {
      parsed = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      parsed = undefined;
    }
  }

  const result = await transport.handleWebhook(rawBody, signature, parsed, async (message) => {
    console.log("[whatsapp] message event", { type: message.type });
    const messageId = await saveInboundMessage(env.DB, message);
    if (!messageId) return;

    if (message.type !== "text" || !message.text) return;
    const person = await env.DB.prepare("SELECT id FROM people WHERE whatsapp_id = ?1 AND active = 1")
      .bind(message.senderId).first<{ id: string }>();
    if (!person) return;
    const replyBody = await buildMemoryReply(env.DB, person.id, messageId, message.text, getDeterministicConfig(env));
    if (!replyBody) return;

    const reply = await transport.sendText({ to: message.senderId, body: replyBody, replyTo: message.transportMessageId });
    await env.DB.prepare(
      `INSERT OR IGNORE INTO messages
       (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
       SELECT ?1, id, ?2, 'outbound', 'text', ?3, ?4, ?5
       FROM people WHERE whatsapp_id = ?6 AND active = 1`,
    ).bind(crypto.randomUUID(), reply.transportMessageId, reply.body, JSON.stringify(reply.rawResponse), new Date().toISOString(), message.senderId).run();
  }, request.url);
  console.log("[whatsapp] webhook result", { status: result.status });
  if (result.status === 200) ctx.waitUntil(result.dispatchPromise);
  if (isTwilio && result.status === 200) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  }
  return new Response(null, { status: result.status });
}

async function saveInboundMessage(db: D1Database, event: MessageEvent | InboundMessage): Promise<string | undefined> {
  const senderId = "transportMessageId" in event ? event.senderId : event.from;
  const person = await db
    .prepare("SELECT id FROM people WHERE whatsapp_id = ?1 AND active = 1")
    .bind(senderId)
    .first<{ id: string }>();
  // Unknown numbers are deliberately ignored: no message is persisted and no reply is sent.
  if (!person) return undefined;

  const normalized = "transportMessageId" in event;
  const transportMessageId = normalized ? event.transportMessageId : event.id;
  const messageType = event.type;
  const body = normalized
    ? event.text
    : event.type === "text" && typeof event.body.text === "object" && event.body.text !== null && "body" in event.body.text
      ? String(event.body.text.body)
      : null;
  const rawPayload = normalized ? event.rawPayload ?? event : event.body;
  const createdAt = normalized ? event.receivedAt : new Date(event.timestamp).toISOString();

  const messageId = normalized ? event.id : crypto.randomUUID();
  const result = await db.prepare(
    `INSERT OR IGNORE INTO messages
     (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
     VALUES (?1, ?2, ?3, 'inbound', ?4, ?5, ?6, ?7)`,
  ).bind(
    messageId, person.id, transportMessageId, messageType, body,
    JSON.stringify(rawPayload), createdAt,
  ).run();
  return result.meta.changes === 1 ? messageId : undefined;
}
export { buildMemoryReply, saveInboundMessage };
