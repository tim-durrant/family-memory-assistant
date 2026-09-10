# Production Smoke Test

This is the repeatable Phase 0 baseline for the production family-memory assistant.

## Production endpoints

Worker:

```text
https://family-memory-assistant.tim-j-durrant.workers.dev
```

Twilio incoming WhatsApp webhook:

```text
https://family-memory-assistant.tim-j-durrant.workers.dev/webhooks/whatsapp
```

Method:

```text
HTTP POST
```

The Twilio sender is configured as the production WhatsApp transport. Fallback and status-callback URLs remain unset until their separate handlers are implemented.

## Baseline scenario

Use an approved sender already present in production D1.

### Record

Send:

```text
My driving test is 12 October 2026
```

Expected reply:

```text
Saved: My driving test is 12 October 2026.
```

### Retrieve

Send:

```text
When is my driving test?
```

Expected reply:

```text
My driving test is 12 October 2026 (2026-10-12)
```

Minor wording changes are acceptable, but the date and canonical ISO date must be correct.

## Expected Worker log shape

Tail the deployed Worker in a separate terminal:

```sh
docker compose run --rm app npx wrangler tail family-memory-assistant --format pretty
```

For each valid inbound message, logs may contain:

```text
[request] POST /webhooks/whatsapp
[whatsapp] webhook result { status: 200 }
[whatsapp] message event { type: "text" }
```

Logs must not contain:

- message bodies;
- Twilio Auth Tokens, Account credentials, or API keys;
- full signed webhook URLs or query secrets;
- raw WhatsApp/Twilio payloads;
- unnecessary personal data.

## Production D1 baseline

Verify without printing full phone numbers or message content:

```sh
docker compose run --rm app npx wrangler d1 execute family-memory --remote --command "SELECT COUNT(*) AS active_people FROM people WHERE active = 1; SELECT id, substr(whatsapp_id, -4) AS phone_suffix, active FROM people;" --env=""
```

The production baseline currently has one active permitted sender. The phone suffix is intentionally used only as a redacted confirmation.

## Verification checklist

- [x] Worker is deployed on the production `workers.dev` URL.
- [x] `WHATSAPP_TRANSPORT` is `twilio` in the production Wrangler configuration.
- [x] Twilio production sender is online.
- [x] Incoming Twilio webhook reaches the Worker with HTTP 200.
- [x] Twilio signature validation succeeds.
- [x] Inbound message is deduplicated by provider message ID.
- [x] Original inbound message is persisted in production D1.
- [x] Deterministic fact is recorded.
- [x] Deterministic fact is retrieved in a later message.
- [x] Reply is sent through Twilio after compliance approval.
- [ ] Delivery-status callback is configured and tested.
- [ ] Production message/error logging is reviewed after status callbacks are added.

## Checks after application changes

Run locally in Docker:

```sh
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
```

Deploy explicitly to the top-level production environment:

```sh
docker compose run --rm app npx wrangler deploy --env=""
```

Repeat the record/retrieve scenario after changes to transport, D1 migrations, message interpretation, date handling, or reply generation.

## Rollback evidence

Record the current Cloudflare Worker deployment/version identifier before a production change. Use Wrangler deployment history to identify the last known-good version if rollback is required:

```sh
docker compose run --rm app npx wrangler deployments list --env=""
```
