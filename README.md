# Family memory assistant

Current milestone: Twilio production WhatsApp webhook -> Cloudflare Worker -> D1 original message record -> deterministic memory reply.

## Local setup

This project uses OrbStack/Docker and the `node:22-bookworm-slim` image. No Node.js installation is required on macOS. Copy `.dev.vars.example` to `.dev.vars` and fill in local credentials, then install dependencies inside the container:

```sh
docker compose run --rm app npm install
docker compose run --rm app npx wrangler d1 migrations apply family-memory --local --env local
docker compose up
```

Run checks inside the container:

```sh
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
```

Seed a synthetic permitted sender in local D1 before testing:

```sql
INSERT INTO people (id, display_name, whatsapp_id, role, active, created_at, updated_at)
VALUES ('person-synthetic', 'Synthetic Daughter', '15550000002', 'owner', 1, datetime('now'), datetime('now'));
```

`GET /dev/fixture` returns a synthetic development fixture. It does not bypass webhook signature checks; tests should use the relevant transport signature helper.

## Deterministic configuration

Deterministic behaviour is assembled by `getDeterministicConfig()` in `src/config.ts`. Safe defaults preserve the current behaviour; deployment overrides are validated before use.

Supported overrides include:

```text
FAMILY_TIMEZONE=Australia/Brisbane
DATE_LOCALE=en-AU
AMBIGUOUS_NUMERIC_DATE_POLICY=clarify
CLARIFICATION_TTL_MINUTES=30
DETERMINISTIC_MIN_TOPIC_TERM_LENGTH=3
DETERMINISTIC_ENABLE_WAITING_FACTS=true
DETERMINISTIC_ENABLE_FACT_RESOLUTION=true
DETERMINISTIC_ENABLE_REMINDER_CREATION=false
DETERMINISTIC_FACT_CONFLICT_POLICY=confirm
DETERMINISTIC_FACT_DELETE_POLICY=confirm
DETERMINISTIC_FACT_CONFIRMATION_TTL_MINUTES=30
DETERMINISTIC_POLITE_FILLERS=please,kindly
DETERMINISTIC_TOPIC_STOP_WORDS=a,an,are,at,for,in,is,my,on,the,to,was,were
# Explicit person attributes: alias=stored-key pairs separated by commas.
# Multiple aliases for one key use |, for example hair|hair length=hair_length.
DETERMINISTIC_PERSON_ATTRIBUTES=hair=hair_length
# Person-registration reply templates use the defaults in src/config.ts.
# Explicit registration is required: Add Melody as a family member.
# Optional confirmed aliases: alias=canonical pairs separated by commas.
# DETERMINISTIC_TOPIC_ALIASES=driving appointment=driving test
```

User-facing reply templates can also be overridden with the `DETERMINISTIC_*_REPLY` variables documented by the `Env` type. An empty `DETERMINISTIC_UNKNOWN_INTENT_REPLY` deliberately preserves the current behaviour of ignoring unsupported/greeting messages.

Validated family-specific overrides are stored in D1 `family_settings` and take precedence over deployment defaults for supported settings such as `enableFactResolution`, `enableWaitingFacts`, `enableReminderCreation`, `factConflictPolicy`, `factDeletePolicy`, and `factConfirmationTtlMinutes`. Invalid values are rejected by the same validators used for deployment configuration; unsupported keys are ignored until their capability is implemented.

## Production notes

- Keep the D1 database ID in `wrangler.toml` aligned with the intended Cloudflare account; it is an identifier, not a secret.
- Set production secrets with `docker compose run --rm app npx wrangler secret put ... --env=""`; never commit `.dev.vars` or production data.
- Production uses `WHATSAPP_TRANSPORT=twilio` and the Twilio incoming webhook is `/webhooks/whatsapp`.
- Emergency SMS delivery additionally requires `TWILIO_SMS_NUMBER` to be configured with an SMS-capable Twilio sender; without it, emergency SMS attempts fail closed and are audited.
- Emergency notifications are controlled by `EMERGENCY_NOTIFICATION_MODE=disabled|dry-run|live`; use `dry-run` for testing because it records simulated WhatsApp/SMS attempts without contacting recipients.
- Configure Twilio's incoming-message URL as `https://<worker-domain>/webhooks/whatsapp` with HTTP POST.
- The Worker validates `X-Twilio-Signature`, acknowledges valid requests with empty TwiML, and uses `waitUntil` for D1/reply processing.
- Unknown senders receive no response and are not stored by default. Set `UNAUTHORIZED_SENDER_RESPONSE_MODE=reply` to send a rate-limited static authorization message after valid signature verification; unknown messages are still not stored.
- See [`docs/production-smoke-test.md`](docs/production-smoke-test.md) for the repeatable production baseline.
