# Deterministic Behaviour Roadmap

## Purpose

This is the chronological implementation plan for making the family-memory assistant reliable, predictable, and useful while keeping behaviour deterministic.

The goal is not to build a general natural-language AI system. The goal is to make a small set of explicit capabilities work exceptionally well, with:

- reproducible interpretation;
- configuration instead of scattered literals;
- explicit clarification rather than guessing;
- D1 as the source of truth;
- transport-independent business logic;
- tests for every supported language pattern;
- safe, explainable failure modes.

## Current baseline

Already working:

- Cloudflare Worker production deployment.
- Cloudflare D1 persistence.
- Twilio production WhatsApp transport.
- Signed Twilio webhook validation.
- Inbound message deduplication.
- Original inbound message persistence.
- Deterministic fact recording and lookup.
- Basic date extraction.
- Production save-and-retrieve round trip.

Current implementation is intentionally small. The former combined memory module is now a compatibility facade over separate interpretation, capability, and repository layers. Keep those boundaries protected by tests as the assistant grows.

## Guiding rules

1. **Never guess when ambiguity matters.** Ask a clarification question.
2. **Persist the original message before interpretation.** The source message remains auditable.
3. **Use stable typed intents internally.** Do not pass raw regular-expression matches through the application.
4. **Keep provider details at the transport boundary.** The memory layer must not know about Twilio or WhatsApp payloads.
5. **Move user-adjustable behaviour into configuration or D1.** Do not create a new hardcoded synonym for every request.
6. **Validate before writing.** Parsed candidates are inputs, not truth.
7. **Prefer explicit commands for destructive or ambiguous actions.**
8. **Add a regression test before expanding a parser rule.**
9. **Use UTC internally and apply the configured family timezone for interpretation and display.**
10. **Do not add AI, embeddings, vector search, queues, or Durable Objects until a demonstrated requirement justifies them.**

## Phase 0 — Freeze the working production baseline

**Status: COMPLETE** — Verified against the live Twilio/Cloudflare deployment and documented in [`production-smoke-test.md`](production-smoke-test.md).

### Tasks

- Record the currently working WhatsApp save/retrieve flow as an end-to-end test scenario.
- Confirm the production D1 database contains the intended permitted sender.
- Confirm Twilio webhook and Worker deployment settings are documented.
- Make sure production logs do not contain message bodies, secrets, or full webhook URLs.
- Keep a known-good deployment/version reference before refactoring.

### Configuration

Keep provider and environment settings outside business logic:

```text
WHATSAPP_TRANSPORT=twilio
FAMILY_TIMEZONE=Australia/Sydney
TWILIO_ACCOUNT_SID=<secret>
TWILIO_AUTH_TOKEN=<secret>
TWILIO_WHATSAPP_NUMBER=<configured sender>
```

### Exit criteria

- A user can record a dated fact and retrieve it in a later WhatsApp message.
- Existing tests pass.
- A rollback deployment is identifiable.

## Phase 1 — Establish a deterministic configuration boundary

**Status: COMPLETE** — Typed configuration, validated environment overrides, documented defaults, and configuration tests are implemented.

### Tasks

Create a typed configuration object rather than reading environment variables throughout the application.

Separate configuration into:

- transport configuration;
- parser configuration;
- response configuration;
- safety and authorization configuration;
- feature flags.

For example:

```ts
export type DeterministicConfig = {
  timezone: string;
  minimumTopicTermLength: number;
  enableWaitingFacts: boolean;
  enableFactResolution: boolean;
  enableReminderCreation: boolean;
  unknownIntentReply: string;
  ambiguousFactReply: string;
  missingYearReply: string;
};
```

### Configuration sources

Use this precedence:

1. validated environment variables for deployment-wide settings;
2. D1 user/family settings for family-specific preferences;
3. code defaults only for safe, documented fallback values.

Do not store regexes or response text in unrelated handlers. If patterns become configurable, validate them at startup and fail safely rather than accepting malformed configuration.

### Exit criteria

- The application has one validated configuration object.
- Parser and reply behaviour can be changed without editing multiple modules.
- Tests cover default and overridden configuration.

## Phase 2 — Separate interpretation from persistence

**Status: COMPLETE** — Deterministic interpretation, fact repositories, and memory capability orchestration are separated with compatibility re-exports and passing regression tests.

### Tasks

Refactor `src/memory.ts` incrementally into three conceptual layers:

```text
interpretation
  input text → MemoryIntent

validation
  MemoryIntent → validated command/query

capability/repository execution
  validated command/query → D1 result and reply
```

Possible target files:

```text
src/interpretation/deterministic.ts
src/capabilities/memory.ts
src/repositories/facts.ts
src/repositories/messages.ts
```

Do not move everything in one rewrite. Extract one function at a time while keeping existing tests green.

### Exit criteria

- `interpretMessage()` has no database dependency.
- Database functions do not parse natural language.
- The Worker composition root coordinates the layers.
- The current save/retrieve behaviour is unchanged.

## Phase 3 — Define the supported intent vocabulary

**Status: COMPLETE** — The V1 intent catalog is explicit, documented with examples/counterexamples, and unsupported requests now safely return `unknown` instead of falling through to fact recording.

### Initial intents

Keep the vocabulary deliberately small:

```text
record_fact
when_question
waiting_question
resolve_fact
unknown
```

Add new intents only when there is a corresponding capability and test suite.

### Intent contract

Use explicit typed data:

```ts
export type MemoryIntent =
  | {
      kind: "record_fact";
      statement: string;
      category: string;
      status: string;
      effectiveDate: string | null;
      needsYear: boolean;
    }
  | { kind: "when_question"; topic: string }
  | { kind: "waiting_question" }
  | { kind: "resolve_fact"; topic: string }
  | { kind: "unknown" };
```

Every intent must define:

- required fields;
- normalization rules;
- validation rules;
- ambiguity behaviour;
- user-facing success and failure responses.

### Exit criteria

- Every intent has documented examples and counterexamples.
- Unsupported language returns `unknown` instead of accidentally recording a fact.
- Each intent has unit tests.

## Phase 4 — Build a normalization pipeline

**Status: COMPLETE** — Pure text normalization, configurable polite fillers, and regression coverage for punctuation/Unicode/polite/indirect questions are implemented and deployed.

### Tasks

Normalize input in stages, preserving the original message separately:

```text
original body
  → Unicode and whitespace normalization
  → punctuation normalization
  → polite filler removal
  → alias/topic normalization
  → intent matching
```

Support harmless variations such as:

```text
When is my driving test?
When is my driving test please?
Please, when is my driving test?
Could you tell me when my driving test is?
```

Do not remove words that may change meaning. Keep the transformation functions small and testable.

### Configurable data

Polite fillers, aliases, and category keywords should eventually come from validated configuration or D1 tables rather than growing one large regular expression.

Suggested D1 tables for user-managed language:

```text
person_aliases
fact_topic_aliases
intent_phrases
```

Only trusted owners should be able to add or confirm aliases.

### Exit criteria

- Polite variants resolve to the same intent.
- Original message text is unchanged in D1.
- Normalized text is never displayed as if it were the original message.
- Tests cover punctuation, casing, whitespace, and polite language.

## Phase 5 — Improve date and time interpretation safely

**Status: COMPLETE** — Calendar validation, timezone-aware relative dates, conservative numeric-date handling, and deterministic date tests are implemented and deployed.

### Tasks

Support, in order:

1. full dates with year;
2. full dates without year, followed by clarification;
3. numeric dates only when the configured locale makes them unambiguous;
4. relative dates such as `tomorrow` using the configured family timezone;
5. times and recurring schedules only after the date model is stable.

Use a date utility with explicit timezone handling. Do not use the Worker machine timezone implicitly.

Validate:

- real calendar dates;
- leap years;
- date rollover;
- past/future interpretation;
- ambiguous formats such as `10/12/26`.

### Configuration

```text
FAMILY_TIMEZONE=Australia/Sydney
DATE_LOCALE=en-AU
AMBIGUOUS_NUMERIC_DATE_POLICY=clarify
```

### Exit criteria

- Every stored date has a canonical ISO representation.
- Ambiguous dates produce clarification rather than a guess.
- Tests run deterministically with a fixed clock and timezone.

## Phase 6 — Make fact matching deliberate and explainable

**Status: COMPLETE** — Topic normalization, configurable stop words and aliases, deliberate exact/all-term matching diagnostics, safe no-match handling, and regression coverage are implemented and deployed as version `4c06a35d-701c-42c5-8c28-c5b5fa6f1b01`.

### Current limitation

Simple term containment is a useful V1 fallback but can produce false positives and misses natural variations.

### Tasks

Introduce a normalized topic representation:

```text
raw topic
  → lowercase
  → alias expansion
  → stop-word removal
  → controlled singular/plural normalization
  → topic terms
```

Use an explicit matching policy:

1. exact canonical topic;
2. confirmed alias;
3. all significant terms match one fact;
4. multiple matches cause clarification;
5. no match returns an honest unknown answer.

Do not add fuzzy matching until false-positive tests exist. A wrong family-memory answer is worse than a clarification question.

### Exit criteria

- Matching decisions can be explained in diagnostics.
- Multiple matches never silently select one.
- Similar but unrelated facts do not cross-match.
- Alias behaviour is covered by tests.

## Phase 7 — Add fact lifecycle and correction behaviour

### Tasks

Support explicit fact lifecycle operations:

```text
record
replace
resolve
supersede
forget/delete
```

Require confirmation for destructive actions. Keep source message IDs on all fact changes.

When a new fact conflicts with an existing one:

1. identify the possible conflict;
2. show the existing fact;
3. ask whether to replace it;
4. only then mark the old fact `superseded` and insert the new fact.

Do not overwrite history silently.

### Configuration

```text
FACT_CONFLICT_POLICY=confirm
FACT_DELETE_POLICY=confirm
```

### Exit criteria

- Corrections are auditable.
- Resolved facts do not disappear from history.
- Delete/forget behaviour is explicit and tested.

## Phase 8 — Introduce capability and permission boundaries

### Tasks

Move memory operations behind narrow capability handlers:

```text
memory.remember_fact
memory.recall_fact
memory.list_facts
memory.resolve_fact
memory.forget_fact
```

Each capability must:

- validate typed arguments;
- receive the authenticated person/user context;
- query repositories rather than embedding broad SQL;
- return a structured result and audit metadata;
- enforce permissions before mutation.

Keep the current family owner as the first permission model, but define the interface now:

```ts
interface PermissionChecker {
  canExecute(request: CapabilityRequest): Promise<boolean>;
}
```

### Exit criteria

- Read and write operations have separate capability names.
- Unknown capabilities cannot execute.
- A trusted contact cannot access owner-only categories without an explicit rule.
- Permission failures are safe and user-friendly.

## Phase 9 — Add clarification state

### Tasks

Model clarification as persisted, short-lived conversation state rather than hidden parser memory.

Examples:

```text
Which year should I use?
Which driving test do you mean?
Which person does “my doctor” refer to?
```

Store:

- conversation ID;
- pending intent;
- missing field;
- source message ID;
- expiry time;
- permitted follow-up sender.

Use D1 initially. Consider a Durable Object only if concurrent messages create a demonstrated ordering problem.

### Configuration

```text
CLARIFICATION_TTL_MINUTES=30
MAX_CLARIFICATION_TURNS=2
```

### Exit criteria

- A follow-up answer completes the pending action.
- Expired clarification state is ignored safely.
- A different sender cannot complete another person’s pending action.
- Tests cover interruption, expiry, and ambiguous replies.

## Phase 10 — Add reminders through the same deterministic capabilities

### Tasks

Only after fact behaviour is stable:

1. add `reminder.create`, `reminder.list`, and `reminder.cancel`;
2. validate dates and timezone explicitly;
3. persist reminders in D1;
4. use a Cloudflare Cron Trigger to find due reminders;
5. claim each reminder before sending;
6. send through the transport-neutral sender boundary;
7. record delivery outcome.

Do not put reminder scheduling inside the WhatsApp webhook request.

### Exit criteria

- A reminder cannot be delivered twice after retries.
- Reminder creation and cancellation are permission-checked.
- Cron execution is idempotent.
- Delivery failures are visible through audit/status records.

## Phase 11 — Add documents and media only after text behaviour is reliable

### Tasks

Introduce object storage for generated PDFs and uploaded media only when a concrete feature requires it.

Keep the flow provider-neutral:

```text
capability
  → generate or retrieve object
  → create short-lived access URL
  → transport adapter sends document/media
```

Do not store large binary content in D1. Store metadata, ownership, retention, and source message references in D1.

### Configuration

```text
DOCUMENT_RETENTION_DAYS=90
MEDIA_MAX_BYTES=<validated limit>
SIGNED_URL_TTL_SECONDS=900
```

### Exit criteria

- Documents are access-controlled.
- URLs expire.
- Media handling does not expose unrelated family data.
- The Twilio adapter remains responsible only for provider formatting.

## Phase 12 — Add deterministic quality gates

Before adding more features, maintain these gates:

### Parser tests

- Every supported phrase has a test.
- Every known ambiguous phrase has a clarification test.
- Every unsupported phrase has a safe-failure test.
- Date tests use fixed time and timezone.

### Capability tests

- Valid arguments succeed.
- Invalid arguments do not mutate D1.
- Permission failures do not leak data.
- Repeated requests are idempotent where appropriate.

### Worker tests

- Twilio signatures are verified.
- Duplicate webhooks are ignored.
- Unknown senders are ignored.
- D1 writes happen before interpretation.
- Outbound failures are recorded or surfaced safely.

### Production checks

```sh
docker compose run --rm app npm run typecheck
docker compose run --rm app npm test
docker compose run --rm app npx wrangler deploy --env=""
```

Use a production smoke test after each transport or schema change:

```text
record a fact
retrieve a fact
send an unsupported request
repeat a webhook if possible
```

## Recommended implementation order summary

1. Freeze the working Twilio/D1 baseline.
2. Centralize validated configuration.
3. Separate deterministic interpretation from D1 execution.
4. Document and test the supported intent vocabulary.
5. Add normalization and polite-language handling.
6. Harden dates and timezone behaviour.
7. Improve explainable fact matching and aliases.
8. Add fact correction and lifecycle operations.
9. Add capabilities and permissions.
10. Add persisted clarification state.
11. Add reminders and Cron delivery.
12. Add documents/media through object storage.
13. Maintain parser, capability, Worker, and production quality gates.

The guiding stopping rule is simple: each phase should make the current deterministic assistant more reliable before the next feature is added. Do not move to AI or broad natural-language coverage until the explicit deterministic capabilities have strong tests, safe ambiguity handling, and clear configuration boundaries.
