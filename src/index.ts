import type { MessageEvent } from "@dojocoding/whatsapp-sdk";
import { getDeterministicConfig, getDeterministicConfigForPerson, isDevelopment, type Env } from "./config.js";
import { developmentFixture } from "./fixture.js";
import { DojoWhatsAppTransport } from "./transport/dojo.js";
import { MetaWhatsAppTransport } from "./transport/whatsapp-meta.js";
import { TwilioWhatsAppTransport } from "./transport/twilio-whatsapp.js";
import type { InboundMessage, WhatsAppTransport } from "./transport/types.js";
import { buildMemoryReply } from "./capabilities/memory.js";
import { listApprovalRecipients } from "./repositories/people.js";
import { recordEmergencyDelivery } from "./repositories/emergency.js";
import { emergencyNotificationMode } from "./emergency-notifications.js";
import { D1Adapter } from "./storage.js";
import { unauthorizedSenderResponseMode } from "./config.js";
import { acceptWhatsAppLinkCode, extractWhatsAppLinkCode } from "./repositories/whatsapp-links.js";
import { claimDueReminders, markReminderFailed, markReminderSent } from "./repositories/reminders.js";

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const transport = createWhatsAppTransport(env);
    const reminders = await claimDueReminders(env.DB);
    for (const reminder of reminders) {
      const person = await env.DB.prepare("SELECT whatsapp_id FROM people WHERE id = ?1 AND active = 1 AND is_sender = 1")
        .bind(reminder.person_id).first<{ whatsapp_id: string }>();
      if (!person?.whatsapp_id) {
        await markReminderFailed(env.DB, reminder.id, reminder.claim_token!, "Reminder owner has no active WhatsApp sender");
        continue;
      }
      try {
        const sent = await transport.sendText({ to: person.whatsapp_id, body: `Reminder: ${reminder.reminder_text}` });
        await markReminderSent(env.DB, reminder.id, reminder.claim_token!);
        await env.DB.prepare(
          `INSERT OR IGNORE INTO messages
           (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
           VALUES (?1, ?2, ?3, 'outbound', 'text', ?4, ?5, ?6)`,
        ).bind(crypto.randomUUID(), reminder.person_id, sent.transportMessageId, sent.body, JSON.stringify(sent.rawResponse), new Date().toISOString()).run();
      } catch (error) {
        await markReminderFailed(env.DB, reminder.id, reminder.claim_token!, error instanceof Error ? error.message : "Reminder delivery failed");
      }
    }
  },
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
    if (message.type === "text" && message.text) {
      const linkCode = extractWhatsAppLinkCode(message.text);
      if (linkCode) {
        const link = await acceptWhatsAppLinkCode(env.DB, linkCode, message.senderId);
        if (link) {
          await transport.sendText({
            to: message.senderId,
            body: `I’ve received the one-time code. The family administrator must now confirm linking you as ${link.personName}.`,
          });
          await transport.sendText({
            to: link.ownerWhatsAppId,
            body: `${link.personName}’s WhatsApp number has presented the one-time code. Reply: Confirm the WhatsApp link for ${link.personName}`,
          });
          return;
        }
      }
    }
    const messageId = await saveInboundMessage(env.DB, message);
    if (!messageId) {
      await maybeReplyToUnauthorizedSender(env, transport, message);
      return;
    }

    if (message.type !== "text" || !message.text) return;
    const person = await env.DB.prepare("SELECT id FROM people WHERE whatsapp_id = ?1 AND active = 1 AND is_sender = 1")
      .bind(message.senderId).first<{ id: string }>();
    if (!person) return;
    const approvalRecipients: Array<{ id: string; whatsapp_id: string }> = [];
    const replyBody = await buildMemoryReply(
      env.DB,
      person.id,
      messageId,
      message.text,
      await getDeterministicConfigForPerson(env, person.id),
      async (subjectId) => {
        approvalRecipients.push(...await listApprovalRecipients(env.DB, subjectId, person.id));
      },
      async (alertId, recipients, body) => {
        const mode = emergencyNotificationMode(env.EMERGENCY_NOTIFICATION_MODE);
        if (mode === "disabled") return { whatsappSent: false, smsSent: false };
        if (mode === "dry-run") {
          for (const recipient of recipients) {
            await recordEmergencyDelivery(env.DB, alertId, "whatsapp", recipient, "simulated", null, "Emergency notification dry-run");
            await recordEmergencyDelivery(env.DB, alertId, "sms", recipient, "simulated", null, "Emergency notification dry-run");
          }
          return { whatsappSent: true, smsSent: true, simulated: true };
        }
        let whatsappSent = false;
        let smsSent = false;
        for (const recipient of recipients) {
          try {
            const whatsapp = await transport.sendText({ to: recipient, body });
            await recordEmergencyDelivery(env.DB, alertId, "whatsapp", recipient, "sent", whatsapp.transportMessageId, null);
            whatsappSent = true;
          } catch (error) {
            await recordEmergencyDelivery(env.DB, alertId, "whatsapp", recipient, "failed", null, error instanceof Error ? error.message : "WhatsApp delivery failed");
          }
          const sendSms = "sendSms" in transport && typeof transport.sendSms === "function"
            ? transport.sendSms.bind(transport)
            : undefined;
          if (!sendSms) {
            await recordEmergencyDelivery(env.DB, alertId, "sms", recipient, "failed", null, "SMS transport is not configured");
            continue;
          }
          try {
            const sms = await sendSms({ to: recipient, body });
            await recordEmergencyDelivery(env.DB, alertId, "sms", recipient, "sent", sms.transportMessageId, null);
            smsSent = true;
          } catch (error) {
            await recordEmergencyDelivery(env.DB, alertId, "sms", recipient, "failed", null, error instanceof Error ? error.message : "SMS delivery failed");
          }
        }
        return { whatsappSent, smsSent };
      },
      message.conversationId,
    );
    if (!replyBody) return;

    const reply = await transport.sendText({ to: message.senderId, body: replyBody, replyTo: message.transportMessageId });
    await env.DB.prepare(
      `INSERT OR IGNORE INTO messages
       (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
       SELECT ?1, id, ?2, 'outbound', 'text', ?3, ?4, ?5
       FROM people WHERE whatsapp_id = ?6 AND active = 1 AND is_sender = 1`,
    ).bind(crypto.randomUUID(), reply.transportMessageId, reply.body, JSON.stringify(reply.rawResponse), new Date().toISOString(), message.senderId).run();

    for (const recipient of approvalRecipients) {
      const approvalReply = await transport.sendText({
        to: recipient.whatsapp_id,
        body: getDeterministicConfig(env).personApprovalReply.replace(/\{person\}/g, extractAddedPersonName(message.text)),
      });
      await env.DB.prepare(
        `INSERT OR IGNORE INTO messages
         (id, person_id, whatsapp_message_id, direction, message_type, body, raw_payload, created_at)
         VALUES (?1, ?2, ?3, 'outbound', 'text', ?4, ?5, ?6)`,
      ).bind(crypto.randomUUID(), recipient.id, approvalReply.transportMessageId, approvalReply.body, JSON.stringify(approvalReply.rawResponse), new Date().toISOString()).run();
    }
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

async function maybeReplyToUnauthorizedSender(env: Env, transport: WhatsAppTransport, message: InboundMessage): Promise<void> {
  if (unauthorizedSenderResponseMode(env.UNAUTHORIZED_SENDER_RESPONSE_MODE) !== "reply") return;
  const allowed = await new D1Adapter(env.DB).setIfAbsent(`unauthorized-reply:${await senderFingerprint(message.senderId)}`, true, 24 * 60 * 60 * 1000);
  if (!allowed) return;
  try {
    await transport.sendText({ to: message.senderId, body: env.UNAUTHORIZED_SENDER_REPLY ?? "This number is not authorised to use this service." });
  } catch {
    console.log("[whatsapp] unauthorized sender response failed");
  }
}

async function senderFingerprint(senderId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(senderId));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function saveInboundMessage(db: D1Database, event: MessageEvent | InboundMessage): Promise<string | undefined> {
  const senderId = "transportMessageId" in event ? event.senderId : event.from;
  const person = await db
    .prepare("SELECT id FROM people WHERE whatsapp_id = ?1 AND active = 1 AND is_sender = 1")
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
function extractAddedPersonName(text: string): string {
  return text.replace(/^add\s+(.+?)\s+as\s+a?\s*family member\s*$/i, "$1").trim();
}

export { buildMemoryReply, saveInboundMessage };
