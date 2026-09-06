import {
  WebhookReceiver,
  WhatsAppClient,
  WindowTracker,
  type MessageEvent,
} from "@dojocoding/whatsapp-sdk";
import { isDevelopment, type Env } from "./config.js";
import { developmentFixture } from "./fixture.js";
import { D1Adapter } from "./storage.js";

const ACKNOWLEDGEMENT = "Saved: I’ve recorded that.";

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
    if (request.method === "GET") return handleVerification(request, env);
    if (request.method === "POST") return handleWebhook(request, env, ctx);
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  },
};

function createReceiver(env: Env, db: D1Adapter, tracker: WindowTracker, client: WhatsAppClient) {
  const receiver = new WebhookReceiver({
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
    storage: db,
  });
  receiver.on("message", async (event: MessageEvent) => {
    console.log("[whatsapp] message event", { type: event.type });
    const saved = await saveInboundMessage(env.DB, event);
    if (!saved) return;
    await tracker.notifyInbound(event.from);

    if (event.type !== "text") return;
    const body = event.body.text;
    const text = typeof body === "object" && body !== null && "body" in body && typeof body.body === "string"
      ? body.body
      : "";
    if (!text) return;

    const reply = await client.sendText({ to: event.from, body: ACKNOWLEDGEMENT, replyTo: event.id });
    const outboundId = reply.messages?.[0]?.id;
    if (outboundId) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO messages
         (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
         SELECT ?1, id, ?2, 'outbound', 'text', ?3, ?4, ?5
         FROM people WHERE whatsapp_id = ?6 AND active = 1`,
      ).bind(crypto.randomUUID(), outboundId, ACKNOWLEDGEMENT, JSON.stringify(reply), new Date().toISOString(), event.from).run();
    }
  });
  receiver.on("error", (error: unknown) => console.error("[whatsapp] handler failed", error));
  return receiver;
}

async function handleVerification(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const receiver = new WebhookReceiver({
    appSecret: env.WHATSAPP_APP_SECRET,
    verifyToken: env.WHATSAPP_VERIFY_TOKEN,
  });
  const result = await receiver.handleVerifyRequest({
    mode: url.searchParams.get("hub.mode"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });
  if (result.status !== 200) return new Response(null, { status: 403 });
  return new Response(result.body, { status: 200 });
}

async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const rawBody = new Uint8Array(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256");
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    parsed = undefined;
  }

  const db = new D1Adapter(env.DB);
  const tracker = new WindowTracker({ phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID, storage: db });
  const client = new WhatsAppClient({
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    wabaId: env.WHATSAPP_WABA_ID,
    token: env.WHATSAPP_ACCESS_TOKEN,
    appSecret: env.WHATSAPP_APP_SECRET,
    windowTracker: tracker,
  });
  const receiver = createReceiver(env, db, tracker, client);
  const result = await receiver.handlePayload(rawBody, signature, parsed);
  console.log("[whatsapp] webhook result", { status: result.status });
  if (result.status === 200) ctx.waitUntil(result.dispatchPromise);
  return new Response(null, { status: result.status });
}

async function saveInboundMessage(db: D1Database, event: MessageEvent): Promise<boolean> {
  const person = await db
    .prepare("SELECT id FROM people WHERE whatsapp_id = ?1 AND active = 1")
    .bind(event.from)
    .first<{ id: string }>();
  // Unknown numbers are deliberately ignored: no message is persisted and no reply is sent.
  if (!person) return false;

  const result = await db.prepare(
    `INSERT OR IGNORE INTO messages
     (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
     VALUES (?1, ?2, ?3, 'inbound', ?4, ?5, ?6, ?7)`,
  ).bind(
    crypto.randomUUID(), person.id, event.id, event.type,
    event.type === "text" && typeof event.body.text === "object" && event.body.text !== null && "body" in event.body.text
      ? String(event.body.text.body) : null,
    JSON.stringify(event.body), new Date(event.timestamp).toISOString(),
  ).run();
  return result.meta.changes === 1;
}

export { saveInboundMessage };
