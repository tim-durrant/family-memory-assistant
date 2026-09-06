# Family memory assistant

First milestone: verified WhatsApp Cloud API webhook -> D1 original message record -> acknowledgement reply.

## Local setup

This project uses OrbStack/Docker and the `node:22-bookworm-slim` image. No Node.js installation is required on macOS. Copy `.dev.vars.example` to `.dev.vars` and fill in local credentials, then install dependencies inside the container:

```sh
docker compose run --rm app npm install
docker compose run --rm app npx wrangler d1 migrations apply family-memory --local
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

`GET /dev/fixture` returns a synthetic Meta-shaped payload in development. It does not bypass webhook signature checks; tests should use the SDK's `computeSignature` helper.

## Production notes

- Keep the D1 database ID in `wrangler.toml` aligned with the intended Cloudflare account; it is an identifier, not a secret.
- Set production secrets with `docker compose run --rm app npx wrangler secret put`; never commit `.dev.vars` or production data.
- Configure Meta's callback URL as `/webhooks/whatsapp` and use the verification token from the secret.
- The Worker acknowledges valid payloads immediately and uses `waitUntil` for D1/reply processing.
- Unknown senders receive no response and are not stored.
