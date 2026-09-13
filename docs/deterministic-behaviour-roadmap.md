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

Detailed module boundaries, contracts, dependency direction, and the target project structure are maintained in [`architecture.md`](../architecture.md). This roadmap tracks the delivery order for that architecture; it does not duplicate the architecture specification.

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
FAMILY_TIMEZONE=Australia/Brisbane
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
FAMILY_TIMEZONE=Australia/Brisbane
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

**Status: COMPLETE** — Persisted replacement/forget confirmations, auditable fact status changes, migration `0002_fact_lifecycle.sql`, and the full production record/replace/forget/cancel/retrieve smoke test are implemented and deployed as version `fb81a1ff-3c10-468c-9037-1c4626bcc08d`.

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
DETERMINISTIC_FACT_CONFLICT_POLICY=confirm
DETERMINISTIC_FACT_DELETE_POLICY=confirm
DETERMINISTIC_FACT_CONFIRMATION_TTL_MINUTES=30
```

### Exit criteria

- Corrections are auditable.
- Resolved facts do not disappear from history.
- Delete/forget behaviour is explicit and tested.

## Phase 8 — Introduce capability and permission boundaries

**Status: IN PROGRESS** — A central capability checker, D1 family-policy tables, permission audit records, and administrator-managed grant/revoke workflows are implemented and deployed. Broader cross-person rules and subject-scoped health access remain future work.

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
- Accept only explicit owner-language commands such as `Grant Sven read access to health information` and `Revoke Sven's access to health information`.
- Resolve target names against active people; reject unknown people, self-targeting, unsupported categories, inactive senders, and non-administrator actors.
- Record every grant/revoke in `permission_change_audit`; do not expose raw D1 settings or SQL-like commands to users.

Keep the current family administrator as the first permission model, but define the interface now:

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

## Phase 8 — Accumulate explicit person attributes

**Status: COMPLETE** — Deterministic recording and lookup of configured attributes, explicit subject registration, per-user approval, pending-subject attribute storage, and the live WhatsApp approval/attribute smoke test are implemented and deployed. Follow-up relationship classification remains planned below.

### Tasks

- Recognise explicit statements such as `Melody has long hair` without inferring unstated facts.
- Require `Add Melody as a family member` before creating a subject; never invent people from attribute statements.
- Resolve person names against explicitly registered D1 people rather than inventing people.
- Persist normalized attribute values with the source message ID for auditability.
- Answer descriptive and requested-value queries conservatively.
- Refuse conflicting values rather than silently overwriting them.
- Keep attribute definitions and reply templates configurable.
- Seek approval from every registered WhatsApp user, while allowing attributes to accumulate for pending or declined subjects.
- Keep subject registration separate from WhatsApp sender authorization.
- Add permission boundaries before supporting sensitive health or capacity attributes.

### Supported examples

```text
Melody has long hair
What hair does Melody have?
Does Melody have short hair?
```

### Exit criteria

- Migration `0003_person_attributes.sql` is applied in production.
- Known-person save, idempotent repeat, conflict refusal, descriptive lookup, mismatch lookup, unknown-person, and missing-attribute cases are tested.
- A live WhatsApp smoke test confirms the source message and attribute are stored and retrieved.
- The phase is not considered complete until production behaviour is verified.

## Phase 9 — Add clarification state

**Status: IN PROGRESS** — Persisted, sender- and conversation-scoped clarification state is implemented for missing-year facts, ambiguous fact choices, and relationship follow-ups. Maximum-turn and broader interruption behavior remain to be completed and covered across all clarification types.

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

### Relationship clarification

When a stored note mentions an unknown person, do not automatically create a family subject. Persist the note first, then ask the originating user to classify the relationship when the mention is clear enough:

```text
I noticed Lorna mentioned in that note. What is Lorna’s relationship to you?
Reply with: family member, doctor, or another relationship.
```

- `family member` starts the explicit family-subject approval workflow.
- `doctor` and other labels create a local external-contact relationship, not a family member.
- `another relationship` asks for a short label.
- The original note remains stored regardless of whether the user answers.
- Clarification state is scoped to the originating sender and expires safely.

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

## Long-form notes and local entity mentions

**Status: COMPLETE** — Exact notes, conservative local mentions, relationship clarification, local external contacts, reversible name pseudonyms, and sensitive-data redaction are implemented and deployed. The privacy-preserving AI work below remains planned.

### Tasks

- Add exact long-form `notes` storage with source message ID, sender, note type, creation timestamp, and optional event date.
- Recognise explicit natural-language note boundaries such as `Save this note:` without rewriting the content.
- Retrieve the original text by date, note type, or a deterministic note identifier.
- Extract conservative, note-linked mentions such as `Doctor Brown` or `Lorna` without creating family members automatically.
- Add persisted relationship clarification for unknown mentions.
- Store external contacts separately from family subjects.
- Preserve exact original text and provenance for every extraction.

### Exit criteria

- Long-form text can be stored and returned exactly.
- A mention such as `Lorna` does not create a family member automatically.
- The user can classify Lorna as `family member`, `doctor`, or another relationship.
- Family-member classification uses the existing approval workflow.
- External-contact classification does not trigger family approval.
- Tests cover interruption, expiry, repeated clarification, and unknown/ambiguous names.

## Planned privacy-preserving AI implementation order

These steps are intentionally ordered so no AI provider is contacted before the local identity, redaction, and consent boundaries are testable.

### 1. Build a canonical local entity registry

- Give family subjects and external contacts stable local `entity_id` values.
- Maintain aliases such as `Dr Williams`, `Doctor Williams`, and `Williams` only when deterministic rules or explicit confirmation support the match.
- Keep family membership, external-contact status, and WhatsApp sender authorization separate.
- Preserve source note/message IDs for every alias and relationship decision.

### 2. Add explicit relationship metadata

- Store relationships such as `doctor`, `mother`, `son`, `friend`, or `primary GP` separately from entity identity.
- Mark each relationship as `explicit`, `confirmed`, or `inferred`.
- Never promote an inferred relationship to a confirmed fact without an explicit confirmation path.
- Preserve source spans and provenance, for example `her son Jack`.

### 3. Replace surface-name tokens with stable typed tokens

- Assign stable, family-scoped tokens such as `<PERSON_01>`, `<DOCTOR_01>`, and `<FAMILY_MEMBER_02>`.
- Keep the canonical identity separate from the rendered role label so a corrected relationship does not require changing identity.
- Preserve coreference: repeated references to the same local entity must use the same token within a payload.
- Ensure aliases and repeated mentions resolve to the same token where verified.
- Replay verified mappings into later payloads before detection so consistency does not depend entirely on detecting the same name again.
- Use longest-match-first replacement and word-boundary handling for free-text names to avoid corrupting unrelated words.

### 4. Protect the mapping vault

- Encrypt mapping values at the application layer with authenticated encryption such as AES-GCM; platform encryption at rest is an additional layer, not a substitute.
- Keep the encryption key in a Worker Secret/Secrets Store binding, never in source code, D1, or ordinary variables.
- Define key rotation, backup, and recovery behavior before production AI use; a lost key must not silently produce incorrect restoration.
- Use bounded vault lifetimes for AI requests: a sliding expiry for active work plus a hard maximum expiry.
- Delete temporary request mappings after successful restoration or hard expiry where the product does not require long-term reuse.
- Keep durable family/entity relationships separate from short-lived AI request mappings.

### 5. Add semantic-preserving privacy profiles

- Standard profile: redact direct identifiers while retaining clinically necessary content such as symptoms, diagnoses, medications, dosages, roles, and relevant dates.
- Strict profile: generalize or remove selected quasi-identifiers such as exact age, rare dates, locations, or distinctive combinations.
- Show which categories are retained and which are redacted.
- Never claim that automated processing guarantees anonymity.
- Add residual-identifier checks before any outbound request.

### 6. Add layered detection and fail-closed decisions

- Layer 1: deterministic patterns for emails, phones, identifiers, addresses, and other configured formats.
- Layer 2: a local entity recognizer for people, organizations, facilities, and locations when justified by measured need.
- Layer 3: the local known-entity dictionary and previously verified mappings.
- Layer 4: an explicit risk decision: `allow`, `review`, or `block`.
- Treat uncertain detection as `review` or `block`, never as permission to send with “probably safe” confidence.
- Provide a detection-only mode that writes no mapping state, so previews and tests cannot mutate the vault.
- Evaluate detectors against representative family notes before trusting them with health data.

#### Optional detector providers

- Define a provider-neutral detector interface returning spans, entity types, confidence, model version, and decision metadata.
- Consider self-hosted Microsoft Presidio as an optional local/container detector layer. Its analyzer and anonymizer/deanonymizer are useful references, but its encrypted operator does not replace our stable typed-token vault.
- Use Presidio or another local detector only after measuring false positives/negatives on representative family notes; do not treat its results as perfect.
- Treat Google Cloud DLP reversible tokenization and format-preserving encryption as enterprise integration options, not defaults. They add value for governed bulk processing or cross-system joins, but introduce another cloud boundary, cost, residency, and key-management surface.
- Treat Amazon Comprehend Medical PHI detection as an optional clinical review detector only. It is English-focused detection, not a complete reversible pseudonymisation system, and sending raw health text to AWS is itself an external disclosure requiring consent and governance.
- Never call an external detector before the user has approved the relevant outbound processing policy.
- Managed providers may return `review` or `block` evidence; they must not silently override the local fail-closed policy.

### 7. Add the local AI-consent gateway

- Prepare the redacted payload locally before asking for consent.
- Show a useful preview or summary of what will be sent.
- Explain that detected identifiers were redacted but automated redaction is not perfect.
- Store consent against the authenticated sender, exact payload hash, privacy profile, task, provider, source message, and short expiry.
- Require a new approval if the payload or task changes.
- Send nothing until the user explicitly approves with `yes`.

Suggested prompt:

```text
I need additional help to answer this. I prepared a redacted copy. Detected names, contact details, medical identifiers, and addresses have been replaced with private tokens; clinically relevant information has been retained. Some identifying information may still remain because automated redaction is not perfect. Do you approve sending this specific redacted copy to the AI service? Reply yes or no.
```

### 8. Add response-token validation and local restoration

- Restore only tokens issued by the local gateway.
- Reject or quarantine unknown, malformed, or newly invented identity tokens.
- Treat unresolved or damaged tokens as fatal for side-effecting tool calls; do not silently substitute or execute.
- Restore names and local relationships only after validating the AI response boundary.
- Keep the original note and AI payload audit records separate.
- Never expose the mapping table to the AI provider.
- Prefer complete-response processing over streaming when restoration is required.
- Consider short-lived per-request aliases over longer-lived vault tokens to reduce provider-side correlation across requests.

### 9. Define the AI prompt and output safety contract

Before implementing a provider adapter, define task-specific prompt contracts rather than one general-purpose assistant prompt.

- Treat every note, pasted document, retrieved fact, and tool result as untrusted data, not as instructions to the model.
- Delimit user content clearly and explicitly tell the model not to follow instructions found inside that content.
- Tell the model that typed tokens are opaque identifiers: preserve them exactly, do not rename them, merge them, split them, or invent new ones.
- Provide only the semantic context required for the approved task; do not expose the local mapping, phone numbers, provider credentials, or hidden system configuration.
- Require the model to distinguish stated information, uncertainty, inference, and unanswered questions.
- For health-related tasks, require a cautious informational response, no diagnosis or treatment authority, and escalation language when the configured safety policy requires it.
- Prohibit autonomous side effects. AI may propose a draft or structured action, but deterministic capabilities must validate and require confirmation before reminders, messages, fact changes, or other mutations.
- Require a structured response schema with a task result, uncertainty/limitations, token references, and requested follow-up information where applicable.
- Validate response schema, size, token set, token type, and allowed operations locally before displaying or executing anything.
- Test prompts against prompt injection, token corruption, fabricated citations, unsupported medical certainty, data-exfiltration requests, and adversarial pasted notes.
- Keep provider/model/version/prompt-template identifiers in audit metadata.

### 10. Add the provider-neutral AI adapter

- Keep AI behind a transport/provider-neutral interface.
- Send only the approved, redacted payload.
- Record provider, model, request ID, consent reference, latency, and outcome without storing the original unredacted payload in provider logs.
- Add timeout, retry, failure, and no-answer behavior without silently retrying consent.
- Keep the adapter disabled by default until all preceding privacy gates pass.
- Use a service binding or private Worker-to-Worker path where practical; do not expose the vault API publicly without strong caller authentication.
- Treat an external privacy service such as Privacy Guard as an optional replaceable adapter, not as a new canonical data store.
- Review provider region, retention, request logging, sub-processors, plan requirements, and data residency before enabling production traffic.

## Planned non-AI safety and usability capabilities

These capabilities should be implemented before or alongside AI work. They remain deterministic and must not depend on a model.

### 1. Capability/action registry and help

- Define supported actions as typed, machine-readable capability entries rather than scattered help text.
- Give each action canonical terms, safe synonyms, examples, permission requirements, and availability status.
- Support deterministic help requests such as `help please`, `how do I use this`, and `how do I save a note`.
- Advertise only implemented and enabled actions; label reminders, PDF generation, AI assistance, and other future features as unavailable rather than pretending they work.
- Include examples for saving facts, saving/retrieving long notes, looking up stored information, family-member registration, emergency setup, and safe-word use.
- Keep help responses concise and offer a topic-specific follow-up.

### 2. Trusted emergency contacts

- Allow an authenticated WhatsApp user to explicitly add, verify, rename, disable, and remove one or more trusted emergency phone numbers.
- Store consent/provenance for each contact and require confirmation before activation.
- Keep emergency contacts separate from family-memory subjects and ordinary address-book mentions.
- Protect phone numbers with the same application-layer security and audit policy as other sensitive mappings.
- Define delivery order, retry policy, idempotency, failure reporting, and contact changes before production use.

### 3. Safe-word emergency routing

- Let the user explicitly configure one or more exact safe words/phrases and the trusted recipients/channels they target.
- Match safe words deterministically after conservative normalization; do not use fuzzy or AI matching for the trigger.
- Treat sensory overload, meltdown, shutdown, violence, fire, accident, and other user-declared urgent situations as equally important. Do not require the system to judge whether an event is a “typical” emergency.
- On a valid trigger, send a predefined, minimal WhatsApp message and standard SMS to configured recipients.
- Do not include the user’s full note or sensitive context by default; use a configurable emergency template and optional timestamp/location policy.
- Require a cancellation/status policy so accidental triggers can be handled without suppressing genuine requests.
- Clearly state that the feature contacts trusted people and is not a replacement for local emergency services.

### 4. Provider-neutral emergency notifications

- Extend the transport boundary with a notification sender that supports WhatsApp and SMS without coupling capabilities to Twilio.
- Record each delivery attempt, provider message ID, status, error, and retry state.
- Acknowledge inbound WhatsApp quickly and dispatch notifications asynchronously with `waitUntil`/a durable job mechanism.
- Prevent duplicate alerts when webhook retries occur.
- Add a test/simulation mode that never contacts real recipients.
- Verify the recipient and sender configuration before enabling production routing.

### 5. Delivery status and WhatsApp read receipts

- Configure a Twilio Status Callback URL for outbound WhatsApp and SMS messages where the provider supports it.
- Add a provider-neutral delivery-status capability that records `queued`, `sent`, `delivered`, `read`, `undelivered`, and `failed` transitions where available.
- Verify callback signatures, validate the provider message ID, and make status updates idempotent because callbacks can be retried or arrive out of order.
- Keep outbound message records linked to the originating capability, alert, approval request, or response without logging message bodies or secrets.
- Treat a WhatsApp `read` event as evidence that the outbound message was opened, not as evidence that the recipient understood it, agreed with it, or is safe.
- Do not use a read receipt to close, cancel, or suppress an emergency alert. Emergency acknowledgement requires an explicit configured reply or a separately verified human response.
- Do not promise blue ticks: recipient privacy settings may prevent `read` being reported, and the Worker cannot force a recipient’s WhatsApp UI to show a read receipt.
- Treat SMS delivery as a separate channel; SMS does not provide the same WhatsApp read-receipt semantics.
- Add tests for duplicate, delayed, out-of-order, unknown-message, invalid-signature, and unsupported-status callbacks.

### 6. Documents and PDF generation

- Add an explicit deterministic PDF/document capability only after the action registry and permissions exist.
- Confirm the requested source note/facts, preview the document scope, and require confirmation before generation or delivery.
- Keep generated documents access-controlled, auditable, and subject to retention rules.

### 7. Permissions and audit before sensitive capabilities

- Apply the capability permission checker to help topics, contact management, emergency setup, notes, health attributes, and document generation.
- Audit configuration changes and emergency dispatches without logging unnecessary note bodies or secrets.
- Test unknown senders, unauthorized contact changes, duplicate triggers, provider failures, and partial notification success.

## Business logic agreed during the current design cycle

This section records the implementation decisions for the next set of user-facing behaviours. These are product rules, not invitations to add unrestricted natural-language inference.

### A. Structured person attributes and natural-language questions

**Status: PARTIALLY COMPLETE** — Hair was part of the original configured attribute set. Eye-colour support and natural variants such as `What colour are Melody’s eyes?` are now implemented and deployed. General custom attributes remain planned.

- Keep the storage model generic: `person_id`, canonical `attribute_key`, original value, normalized value, source message ID, and lifecycle status.
- Resolve configured aliases to stable keys; do not create a new attribute merely because a sentence contains `has` or `is`.
- Add natural-language variants through tested interpreter rules, not by treating unsupported questions as facts.
- Preserve the original statement and distinguish structured attribute retrieval from ordinary fact retrieval.
- Future custom attributes should be created through a user-friendly clarification flow, not a database-style command.

### B. Minimal-friction classification and learned filing preferences

**Status: PLANNED** — Design agreed; no learned routing implementation yet.

- Detect candidate templates such as `My favourite <topic> is <value>`.
- If classification is uncertain, ask one short question using user-facing terms such as `Personal detail` and `Note`, rather than `attribute` or `database` terminology.
- Persist the selected route as a scoped, versioned preference for the authenticated user and template family.
- Apply the learned preference to similar future statements only when the pattern, subject, and non-sensitive topic are sufficiently clear.
- Generate structured subtypes such as `favourite.tv_show`, `favourite.drink`, and `favourite.colour`; do not collapse unrelated values into one literal `favourite` field.
- Make learned rules reviewable, reversible, auditable, and isolated from other family members.
- Never learn automatic routing for health, financial, legal, emergency, or permission statements without a separate safety policy.
- A new or ambiguous topic may still require clarification; learning reduces repetitive prompts but does not remove safety boundaries.

Suggested flow:

```text
My favourite TV show is The Chosen
  → candidate classification
  → 1. Personal detail  2. Note
  → store the selected user/template preference
  → later matching favourite statements use the preferred route
```

### C. Sensitive-health message lane

**Status: PLANNED** — Health terms must be treated as sensitive data, even when the user states them plainly.

- Add a conservative, versioned offline health vocabulary for recognition and normalization only; it must not diagnose or establish medical truth.
- Detect health statements, negation, uncertainty, historical language, and references to another person before ordinary fact handling.
- Route likely health statements into a dedicated low-friction workflow rather than generic fact recording.
- Preserve the exact original text and provenance before any interpretation.
- With health-record saving not explicitly enabled, ask for one compact choice, for example: `1. Save as health record 2. Save as private note 3. Don’t save`.
- With explicit health-record consent already enabled, use a shorter `1. Save 2. Cancel` confirmation.
- Store semantic qualifiers such as confirmed diagnosis, being investigated, symptom/concern, historical condition, or negated condition separately from the condition term.
- Never convert `I might have diabetes`, `the doctor ruled out diabetes`, or `my mother has diabetes` into an unqualified diagnosis.
- Keep emergency detection separate from ordinary health-record storage.
- Do not send health text to an AI provider by default. Future AI use requires the existing local redaction, consent, fail-closed validation, and provider audit gates.

### D. Immediate document and media capture

**Status: PLANNED** — The original document must be stored before classification, OCR, or AI processing.

- Accept WhatsApp images and document media, and later support phone-uploaded media through an authenticated upload path.
- Validate provider signature/context, MIME type, file signature, size, filename, and content limits before storage.
- Store binary originals privately in R2; store only metadata, ownership, category, retention, source message ID, processing state, and content hash in D1.
- Assign `uncategorized` initially so a slow classifier cannot cause document loss.
- Ask for a minimal category such as health record, appointment/referral, medication, financial/government, personal, or other.
- Keep original, OCR text, redacted derivative, and AI summary as separate objects/results with separate provenance.
- Use short-lived, access-controlled retrieval links or transport-mediated delivery; never expose public object URLs.
- Apply retention, deletion, access-audit, duplicate-hash, and sender/recipient permission rules.

### E. Document privacy reduction before optional AI

**Status: PLANNED** — AI may process a derivative only after explicit consent.

- For text PDFs, extract text and replace detected names, phone numbers, emails, addresses, patient numbers, government identifiers, and configured family entities with local typed tokens.
- For scans/photos, use OCR bounding boxes and create a pixel-redacted derivative; text-only deletion is insufficient.
- Remove or neutralize filenames, EXIF, embedded metadata, barcodes/QR codes, hidden PDF layers, and other residual identifiers where technically possible.
- Run residual-identifier checks and return `allow`, `review`, or `block`; uncertain redaction must not be treated as safe.
- Keep original-to-token mappings locally, encrypted at the application layer, and bounded to the processing request where possible.
- Show the user that automated redaction is not guaranteed to remove every identifier.
- Default document processing choices to `store only` or `process privacy-reduced copy`; sending the original requires a separate explicit choice.
- Store AI consent against the exact derivative hash, task, privacy profile, provider, source document, and expiry.
- Treat AI classification/extraction as a draft. It cannot silently establish a diagnosis, alter the canonical document, or perform side effects.

### F. Verified WhatsApp identity linking

**Status: COMPLETE** — Migration `0015_whatsapp_person_links.sql`, one-time-code flow, owner confirmation, expiry, duplicate-number protection, and help entry are deployed.

- Keep approved family membership separate from WhatsApp sender authorization.
- Owner starts a link for an approved subject; the Worker creates a short-lived pending link and one-time code.
- The proposed person sends the code from their own WhatsApp number; the unregistered sender is not persisted as a normal chat participant.
- The Worker records the proposed number and notifies the owner.
- Only an active owner confirmation can set `people.whatsapp_id` and `is_sender = 1`.
- Reject expired, reused, unknown, duplicate, non-owner, and conflicting link attempts.
- Audit link creation, code presentation, confirmation, failure, and later revocation.

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
10. Add persisted clarification state and relationship classification.
11. Add exact long-form notes, local entity mentions, and local redaction.
12. Add delivery status and read-receipt tracking with explicit acknowledgement semantics.
13. Build canonical entities, typed tokens, encrypted bounded vaults, layered detection, semantic privacy profiles, and consent.
14. Add fail-closed restoration and the provider-neutral AI adapter only after the privacy gates pass.
15. Add reminders and Cron delivery.
16. Add documents/media through object storage.
17. Maintain parser, capability, Worker, and production quality gates.

The guiding stopping rule is simple: each phase should make the current deterministic assistant more reliable before the next feature is added. Do not move to AI or broad natural-language coverage until the explicit deterministic capabilities have strong tests, safe ambiguity handling, and clear configuration boundaries.
