export type InboundMessage = {
  id: string;
  transportMessageId: string;
  senderId: string;
  conversationId: string;
  type: "text" | "unsupported";
  text: string | null;
  receivedAt: string;
  rawPayload?: unknown;
};

export type OutboundMessage = {
  transportMessageId: string;
  to: string;
  type: "text";
  body: string;
  rawResponse: unknown;
};

export type WebhookDispatch = {
  status: number;
  dispatchPromise: Promise<void>;
};

export type MessageHandler = (message: InboundMessage) => Promise<void>;

/**
 * The application-facing WhatsApp boundary. Implementations may use Dojo,
 * Meta's Graph API directly, or another transport without changing business logic.
 */
export interface WhatsAppTransport {
  verifyWebhook(request: Request): Promise<Response>;

  handleWebhook(
    rawBody: Uint8Array,
    signature: string | null,
    parsedPayload: unknown,
    onMessage: MessageHandler,
    webhookUrl?: string,
  ): Promise<WebhookDispatch>;

  sendText(input: {
    to: string;
    body: string;
    replyTo?: string;
  }): Promise<OutboundMessage>;
}
