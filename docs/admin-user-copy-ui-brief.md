# Administrator UserCopy UI brief

## Goal

Provide an authenticated administrator UI for safely editing family-scoped `UserCopy` overrides without deploying the Worker. The UI must call an application-owned admin API; it must never connect directly to D1 or contain a Cloudflare API token.

## Recommended shape

```text
SwiftUI iOS/macOS app or web admin UI
        |
        v
authenticated Worker admin routes
        |
        v
validation + administrator authorization + audit
        |
        v
family_settings (D1)
```

The existing `family_settings` table can store whitelisted `copy.*` keys. The Worker remains responsible for validation, scoping, and persistence.

## Minimum UI

- Authenticate the administrator using the existing approved identity model, ideally with a separate admin session rather than a WhatsApp message alone.
- Select the family/owner scope only from authorized families.
- List editable copy keys with friendly descriptions and current effective/default values.
- Edit text in a bounded field with a live preview.
- Show allowed placeholders for each template, for example `{journalEntry}`, `{statement}`, and `{existing}`.
- Validate length, required placeholders, unsupported placeholders, control characters, and unsafe blank values before submission.
- Show a confirmation diff before saving.
- Support reset-to-default without deleting audit history.
- Display last updated time and administrator identity.

## API surface

Possible Worker routes:

```text
GET  /admin/families/:familyId/user-copy
PUT  /admin/families/:familyId/user-copy/:key
DELETE /admin/families/:familyId/user-copy/:key
```

The API must:

- authenticate the session;
- require administrator permission for the selected family;
- whitelist keys such as `copy.journalEntryLabel` and `copy.missingYearReply`;
- validate the template against its allowed placeholders;
- enforce maximum lengths and safe text rules;
- use parameterized D1 writes;
- record an audit event containing key, family scope, actor, old/new hashes or redacted values, and timestamp;
- avoid returning secrets or unrelated family data.

## Rollout stages

1. Read-only effective-copy endpoint and preview screen.
2. Single-key update with validation and audit.
3. Reset-to-default and revision history.
4. Optional draft/approval workflow for sensitive or high-impact copy changes.
5. Localization/versioning if multiple languages are needed.

## iOS/macOS and existing tools

A small native client is practical with SwiftUI. It can use `URLSession` to call the authenticated Worker API and share most code between iOS and macOS. D1 should not be exposed directly to the client.

The Cloudflare dashboard can administer D1 for an operator, but it is not an appropriate family-facing UserCopy editor: it is too low-level, exposes database concerns, and does not provide the required copy validation or family-scoped workflow.

Generic tools such as Retool, Appsmith, or Budibase could provide a quick internal web UI if they are configured to call the Worker admin API rather than receive D1 credentials. They should be treated as operator tools, with the same authentication, audit, and scope restrictions. A direct D1 REST/API-token integration from an iOS or macOS app is not recommended because it would require distributing privileged Cloudflare credentials.

## Acceptance criteria

- An administrator can change a permitted phrase without a Worker deployment.
- A non-administrator cannot read or alter another family's copy.
- Invalid placeholders and unsafe/oversized text are rejected before D1 writes.
- Every change and reset is auditable.
- The WhatsApp runtime uses the new value on the next configuration load, subject to any explicitly documented cache lifetime.
- No Cloudflare API token or direct D1 credential exists in the client.
