# Meta app-review screencasts

Use sanitized test data and the deployed production Worker. Do not show access tokens, app secrets, Cloudflare credentials, real family messages, or private phone numbers. If any credential appears in a recording, rotate it immediately.

## Recommended split-screen recording layout

Use WhatsApp on the left and a Zed terminal on the right. The terminal should follow the deployed Worker so the recording demonstrates the complete path from the phone, through Meta's webhook delivery, to Cloudflare and back to WhatsApp:

```sh
npx wrangler tail family-memory-assistant --format pretty
```

Use the authenticated Wrangler session or a narrowly scoped Cloudflare API token supplied through the shell environment. Do not type a token into the visible terminal. If the Worker was deployed under a different name, use the exact production Worker name from `wrangler.toml`.

For the driving-test sequence, the visible terminal should show events broadly equivalent to:

```text
[request] POST /webhooks/whatsapp
[whatsapp] webhook result { status: 200 }
[whatsapp] message event { type: 'text' }
```

Then send the later question and show the same request/event sequence again while WhatsApp displays the retrieved date. The Worker acknowledges the webhook promptly and performs persistence/reply work through the request lifecycle; the exact tail formatting may vary by Wrangler version.

Prefer a narrow terminal crop that shows timestamps, request paths, status, and message type only. Do not display raw payloads, phone numbers, access-token environment variables, database contents, or unrelated production traffic.

## Screencast 1: `whatsapp_business_messaging`

This is the primary end-to-end user journey. Record one continuous flow from WhatsApp conversation to the later retrieval response.

1. Show the WhatsApp conversation with the approved reviewer/test sender.
2. Send:

   ```text
   My driving test is 12 October 2026
   ```

3. Show the bot reply:

   ```text
   Saved: My driving test is 12 October 2026.
   ```

4. Send a separate later message:

   ```text
   When is my driving test?
   ```

5. Show the bot retrieving the stored fact, including the normalized date:

   ```text
   My driving test is 12 October 2026 (2026-10-12)
   ```

6. Briefly show that the sender is an approved user and that the message is handled by the production callback. Do not expose D1 rows, tokens, or unrelated family data.

Reviewer explanation:

> The app receives an inbound WhatsApp text through Meta's Cloud API webhook, stores the original message and a source-linked structured fact in Cloudflare D1, and replies through the WhatsApp Cloud API. A later question searches only that user's active facts and returns the recorded date. The app does not invent an answer when no matching fact exists.

## Screencast 2: `whatsapp_business_management`

The selected Meta use case requires this permission, so it must remain in the submission. Its legitimate purpose in this project is the initial authorized-business onboarding: discovering and selecting the correct WABA and phone-number asset, especially when Meta exposes more than one WABA (for example, a test WABA and a production/Embedded WABA). It is not used to read family conversations or family memory data.

The current production Worker uses the resulting WABA and phone-number IDs for the messaging integration, but it does not currently expose a user-facing management screen or call the management Graph endpoints at runtime. Therefore the explanation and recording must describe this accurately rather than implying that the family-memory chat itself manages business assets.

Record the management/API test flow that was used to authorize and identify the production asset:

1. Show the authorized Meta business/WABA selection or the documented onboarding operation.
2. Show that the app requests access to WhatsApp business assets in order to identify the correct WABA and phone number.
3. Show a redacted successful result identifying the selected asset and phone-number status; hide IDs, tokens, phone numbers, and business names.
4. Show that the selected phone is then used by the separate messaging flow in Screencast 1.
5. Explain that access is limited to the WhatsApp business assets needed to operate this one family assistant and is not used to access unrelated business accounts or message content.

Reviewer explanation:

> The app requires WhatsApp Business Management access during onboarding to identify and authorize the correct WhatsApp Business Account and phone-number asset. This is important because the business may have separate test and production WABAs. The selected asset IDs configure the messaging integration; the app does not use management access to inspect family conversations or unrelated business data.

Do not present generic dashboard navigation as if it were a normal family-app feature. If Meta requires an API test call, use the documented Graph API operation that actually performed the asset discovery/authorization and redact its response carefully.

## Before recording

- Confirm the production Worker is deployed and the callback URL is stable.
- Confirm the production WABA is subscribed to the app.
- Confirm the production phone is `CONNECTED` and `VERIFIED`.
- Confirm the reviewer/test sender is present in `people` and active.
- Send a real test message while watching `wrangler tail`; verify the Worker receives it, D1 persists it, and WhatsApp receives the reply.
- Use synthetic names, dates, and phone numbers in all recordings.
- Crop or blur browser address bars, token fields, account IDs, and unrelated notifications.
- Keep the reviewer instructions aligned with the exact test number and message sequence shown in the video.
