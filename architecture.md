# Family Memory Assistant: Minimal V1 Architecture

## Recommendation at a glance

Keep V1 as one Cloudflare Worker with D1 as the source of truth:

```text
WhatsApp / Dojo adapter
        |
        v
normalised inbound message
        |
        v
interpreter provider(s)
  - deterministic parser (V1)
  - optional local helper (later)
  - optional AI helper (later)
        |
        v
candidate intent
        |
        v
validation + json-rules-engine routing
        |
        v
capability registry
        |
        v
native TypeScript capability handler
        |
        +--> D1 repositories
        +--> WhatsApp reply
        +--> audit event
```

The important design decision is that **the interpreter is a replaceable input adapter, not the application orchestrator**. A deterministic parser, Tim's local helper, and an external AI helper must all return the same untrusted structured candidate. The same validation, permission checks, capability handlers, persistence, and audit code then apply to every provider.

For the current V1, use the deterministic parser and `json-rules-engine`. Do not add an AI service, Durable Object, queue, or workflow engine until a concrete requirement justifies it.

## 1. Component architecture

### WhatsApp adapter

`@dojocoding/whatsapp-sdk` owns WhatsApp-specific concerns:

- Meta webhook verification and signature validation;
- webhook parsing;
- duplicate delivery handling;
- WhatsApp 24-hour reply-window tracking;
- outbound request construction.

The rest of the application should receive a transport-neutral `InboundMessage` and use a small `MessageSender` interface for replies. No capability should import Meta payload types.

### Worker and router

The Worker remains the composition root and HTTP boundary. It should:

1. route the request;
2. authenticate and parse the webhook through the adapter;
3. acknowledge the webhook promptly;
4. dispatch application work;
5. translate the application result into a reply.

The Worker should not contain fact-matching or reminder business logic. That logic belongs in capabilities and repositories.

### Request normalisation

Normalisation converts a transport event into a stable internal message:

- trim and normalise text for matching, while preserving the original body;
- attach the sender and conversation identifiers;
- record the original message before interpretation;
- include received time and timezone context;
- preserve message type and raw payload only at the transport/persistence boundary.

Normalisation is not semantic interpretation. It should not decide that a message means `reminder.create`.

### Interpretation providers

An interpreter turns a normalised message into zero or more **untrusted intent candidates**. Providers are interchangeable:

- `DeterministicInterpreter`: regexes, simple date parsing, aliases, and explicit commands;
- `LocalHelperInterpreter`: a future local rules/NLP/module implementation;
- `AiInterpreter`: a future privacy-gated external AI implementation.

All providers implement the same interface and return the same candidate format. Provider selection is application configuration, not capability logic. A provider may also return `unknown` or `needs_clarification`.

A provider must never:

- write to D1;
- send WhatsApp messages;
- decide permissions;
- call external systems directly;
- be treated as the source of truth.

### `json-rules-engine`

Use `json-rules-engine` as a small, inspectable **routing and decision layer**. It receives normalised facts and selects a capability or escalation outcome.

Rules may:

- select a capability;
- decide that required fields are missing;
- select clarification or AI/local interpretation escalation;
- express simple routing prerequisites.

Rules should not:

- execute SQL;
- mutate facts or reminders;
- send WhatsApp messages;
- implement date arithmetic or matching algorithms;
- replace ordinary TypeScript business logic.

Keep rules few, versioned, and tested. If a rule becomes difficult to explain, move it into TypeScript.

### Capability handlers

Capabilities are ordinary TypeScript functions/classes with narrow dependencies. They:

- validate typed arguments again;
- perform permission checks through a future-proof boundary;
- read/write through repositories;
- return a user-facing result plus audit metadata;
- never trust an interpreter merely because it reported high confidence.

Examples:

- `memory.remember_fact`;
- `memory.recall_fact`;
- `memory.list_facts`;
- `reminder.create`;
- `reminder.list`;
- `reminder.cancel`;
- `person.lookup`;
- `person.remember_relationship`;
- `schedule.whats_today` and `schedule.whats_tomorrow`.

### D1

D1 is the durable source of truth for users, conversations, original messages, people, aliases, facts, reminders, permissions, and audit events. Use UTC internally and apply the family timezone only when parsing/displaying dates.

Keep SQL behind small repositories. This protects the capability layer from schema details without introducing a general data-access framework.

### Scheduled reminders

For V1, use a Cloudflare Cron Trigger to find due reminders and send them through the same `MessageSender` boundary. Make delivery idempotent by claiming/updating the reminder in D1 before sending, or by using a delivery key and a guarded status update.

Do not add a queue merely to send a small number of family reminders. Consider Cloudflare Queues later if delivery work becomes slow, bursty, or needs independent retries.

### Privacy gateway

The privacy gateway is the only route to an external AI provider. It should:

1. receive a minimal interpretation request;
2. remove or replace names, phone numbers, message IDs, and other sensitive identifiers with reversible tokens;
3. retain the token map only for the request's short lifetime;
4. call the selected provider;
5. restore tokens only in the returned candidate, if needed;
6. discard the map.

The gateway must not grant the provider database access or external credentials. Sensitive health content should be minimised, and no AI response should be saved as a fact without normal validation and source attribution.

For a future local helper, the gateway can be a no-op or a local redaction boundary depending on where the module runs. Keeping the interface now means that this choice does not leak into handlers.

### Audit/event logging

Write concise audit events for meaningful application decisions:

- inbound message accepted/rejected;
- interpretation provider and outcome;
- capability requested and validated;
- fact/reminder created, changed, resolved, or cancelled;
- clarification requested;
- AI/local provider invoked or refused;
- outbound message attempted/sent/failed.

Do not duplicate full sensitive message bodies in audit rows. The original message table remains the source record, with access restricted by the application.

## 2. Stable internal contracts

These are deliberately small. They are application contracts, not a complete enterprise schema system.

```ts
export type InterpretationSource =
  | "deterministic"
  | "local-helper"
  | "ai";

export type IntentCandidate = {
  capability: string | null;
  args: Record<string, unknown>;
  confidence: number; // 0..1; advisory, never an authority
  source: InterpretationSource;
  missing?: string[];
  reason?: string;
};

export type InboundMessage = {
  id: string;                 // internal message ID
  transportMessageId: string;
  senderId: string;           // approved internal/user identity after lookup
  conversationId: string;
  text: string;
  receivedAt: string;         // ISO UTC
  timezone: string;
};

export type InterpretationRequest = {
  message: InboundMessage;
  facts?: Record<string, unknown>; // safe, derived routing facts only
};

export interface Interpreter {
  readonly name: InterpretationSource;
  interpret(request: InterpretationRequest): Promise<IntentCandidate[]>;
}

export type CapabilityRequest<TArgs = Record<string, unknown>> = {
  requestId: string;
  capability: string;
  args: TArgs;
  caller: {
    userId: string;
    conversationId: string;
    senderId: string;
  };
  resolution: {
    source: InterpretationSource;
    confidence: number;
  };
  receivedMessageId: string;
};

export type CapabilityResult = {
  ok: boolean;
  reply?: string;
  data?: Record<string, unknown>;
  audit: {
    action: string;
    entityType?: string;
    entityId?: string;
  };
};

export interface Capability<TArgs = Record<string, unknown>> {
  readonly name: string;
  validate(args: Record<string, unknown>): TArgs;
  execute(request: CapabilityRequest<TArgs>): Promise<CapabilityResult>;
}
```

`validate` should throw or return a well-defined validation failure. It must perform deterministic checks even for a deterministic provider. A later permission layer can be inserted immediately before `execute` without changing the request shape:

```ts
export interface PermissionChecker {
  canExecute(request: CapabilityRequest): Promise<boolean>;
}
```

### Provider swapping

The composition root chooses providers, while the pipeline remains constant:

```ts
const interpreter: Interpreter = env.USE_LOCAL_HELPER === "true"
  ? new LocalHelperInterpreter(...)
  : new DeterministicInterpreter(...);

// Later, this could be AiInterpreter behind the privacy gateway.
const candidates = await interpreter.interpret({ message });
```

For a practical transition period, a `FallbackInterpreter` may try providers in order:

```ts
export class FallbackInterpreter implements Interpreter {
  readonly name = "deterministic" as const;

  constructor(private readonly providers: Interpreter[]) {}

  async interpret(request: InterpretationRequest): Promise<IntentCandidate[]> {
    for (const provider of this.providers) {
      const candidates = await provider.interpret(request);
      if (candidates.some((candidate) => candidate.capability && candidate.confidence >= 0.8)) {
        return candidates;
      }
    }
    return [{ capability: null, args: {}, confidence: 0, source: "deterministic", reason: "no provider resolved the request" }];
  }
}
```

In production, provider order and fallback policy should be explicit configuration. Do not silently send sensitive content to an external AI just because a local provider failed.

### Example candidate

```json
{
  "capability": "reminder.create",
  "args": {
    "personId": "person_17",
    "message": "take the bins out",
    "when": "2026-09-07T09:00:00+10:00"
  },
  "confidence": 0.96,
  "source": "deterministic"
}
```

The same shape may be returned by `local-helper` or `ai`. The handler does not know or care which interpreter produced it.

## 3. Example rules and capability

### Normalised rule facts

Rules should receive simple facts such as:

```ts
{
  intent: "create_reminder",
  hasPerson: true,
  hasMessage: true,
  hasWhen: true
}
```

### Example `json-rules-engine` rule

```ts
import { Rule } from "json-rules-engine";

export const createReminderRule = new Rule({
  name: "route-complete-reminder",
  event: {
    type: "capability",
    params: { capability: "reminder.create" }
  },
  conditions: {
    all: [
      { fact: "intent", operator: "equal", value: "create_reminder" },
      { fact: "hasPerson", operator: "equal", value: true },
      { fact: "hasMessage", operator: "equal", value: true },
      { fact: "hasWhen", operator: "equal", value: true }
    ]
  }
});
```

The rule emits a routing event. The application then obtains `reminder.create` from a capability registry, validates its arguments, checks permissions, and executes it. The rule does not create the reminder.

### Example handler

```ts
type CreateReminderArgs = {
  personId: string;
  message: string;
  when: string;
};

export class CreateReminderCapability implements Capability<CreateReminderArgs> {
  readonly name = "reminder.create";

  constructor(private readonly reminders: ReminderRepository) {}

  validate(args: Record<string, unknown>): CreateReminderArgs {
    if (typeof args.personId !== "string" || !args.personId) throw new Error("personId is required");
    if (typeof args.message !== "string" || !args.message.trim()) throw new Error("message is required");
    if (typeof args.when !== "string" || Number.isNaN(Date.parse(args.when))) throw new Error("valid when is required");
    return { personId: args.personId, message: args.message.trim(), when: args.when };
  }

  async execute(request: CapabilityRequest<CreateReminderArgs>): Promise<CapabilityResult> {
    const id = await this.reminders.create({
      ownerId: request.caller.userId,
      personId: request.args.personId,
      message: request.args.message,
      remindAt: request.args.when,
    });

    return {
      ok: true,
      reply: `Reminder saved for ${request.args.when}.`,
      data: { reminderId: id },
      audit: { action: "reminder.created", entityType: "reminder", entityId: id },
    };
  }
}
```

For V1, the existing memory functions can be moved behind capabilities incrementally. Do not rewrite working webhook plumbing merely to achieve the final folder layout.

## 4. People, identity, relationships, roles, and aliases

Use `Person` as the only identity record:

```ts
export type Person = {
  id: string;
  canonicalName: string;
  whatsappId?: string;
  aliases: string[];
  relationships: string[]; // e.g. ["daughter", "sister"]
  roles: string[];         // e.g. ["doctor", "mechanic"]
  active: boolean;
};
```

Roles and relationships are metadata, not identities. For example, `person_17` may be both a neighbour and mechanic, and `person_22` may be both a daughter and employee. Do not create `mechanic_01` or `daughter_01` as person records.

A phrase such as `my doctor` may initially resolve to a role reference with no person ID. Store it as unresolved context or ask for a name; never invent an identity. When the user later says `Dr Jones is my doctor`, attach the role to the identified person.

The minimum V1 entity resolution order is:

1. exact WhatsApp ID, when available;
2. exact normalised canonical name;
3. exact normalised alias;
4. explicit relationship match, if exactly one person has it;
5. role match, if exactly one person has it;
6. clarification if zero or multiple candidates remain.

Use a simple score for diagnostics, not as permission to guess:

- WhatsApp ID: 1.0;
- exact canonical/alias: 0.95;
- exact relationship/role: 0.80;
- partial text match: below the automatic-resolution threshold.

Persist aliases only when explicitly stated or confirmed. An AI/local helper may suggest a mapping, but the normal entity resolver and user clarification must approve it.

## 5. Minimal D1 model

Keep the existing initial migration intact and add later migrations for accepted extensions. Stable opaque IDs should be generated by the application; names must never be primary keys.

### Required tables

- `users`: assistant owners and configuration such as timezone.
- `conversations`: transport conversation and current short-lived interaction state.
- `people`: persistent identities, including the owner and trusted contacts.
- `person_aliases`: one alias per person, scoped to the owner.
- `facts`: structured memory with source message, status, uncertainty, and dates.
- `reminders`: due time, target person, status, and delivery metadata.
- `messages`: immutable original inbound/outbound message records.
- `audit_events`: append-only application decision records.
- `whatsapp_adapter_state`: Dojo deduplication and reply-window state.

### Suggested additions

```sql
CREATE TABLE person_aliases (
  person_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (person_id, normalized_alias),
  FOREIGN KEY (person_id) REFERENCES people(id)
);

CREATE INDEX person_aliases_lookup
  ON person_aliases (normalized_alias);

CREATE TABLE person_relationships (
  person_id TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (person_id, relationship),
  FOREIGN KEY (person_id) REFERENCES people(id)
);

CREATE TABLE person_roles (
  person_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (person_id, role),
  FOREIGN KEY (person_id) REFERENCES people(id)
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  message_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  source TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

If the existing `people.role` column is already deployed, retain it for compatibility while migrating new code toward `person_roles`. Do not rewrite production history casually. A small JSON column could represent roles/relationships in a private prototype, but separate lookup tables are preferable once exact alias and relationship resolution is required.

## 6. Durable Objects: not required for V1

D1 plus Workers is sufficient for durable memory and the current webhook flow.

Use D1 for:

- facts, people, reminders, messages, and audit history;
- deduplication and reply-window state through the existing adapter;
- guarded updates that prevent conflicting reminder transitions.

A Durable Object becomes useful if a specific conversation needs a single strongly ordered coordinator for rapid concurrent messages, or if short-lived pseudonymisation/session state must be isolated from D1. It is not needed merely because conversational state exists.

If introduced later, use one object per conversation/user for ephemeral state such as:

- awaiting a year or clarification;
- a pending confirmation;
- a short-lived token map;
- a small idempotency lock.

Do not make the Durable Object a second source of truth. Persist accepted facts and reminders in D1.

## 7. AI and local-helper escalation boundary

The escalation sequence should be:

1. normalise and persist the original message;
2. run deterministic interpretation and entity resolution;
3. run routing rules;
4. if one candidate is complete and confidently valid, validate and execute the native capability;
5. otherwise ask a clarification question when a deterministic clarification is possible;
6. only if configured and permitted, invoke the selected fallback interpreter;
7. validate its candidate using the same capability schemas and entity resolver;
8. apply permissions and business rules;
9. execute the native capability;
10. audit the provider, confidence, validation result, and outcome.

AI/local interpretation should be triggered only when:

- deterministic parsing cannot identify a capability;
- required arguments need extraction from genuinely ambiguous language;
- entity resolution has multiple plausible candidates and a clarification question cannot reasonably resolve it;
- a configured helper can answer a read-only request that has no native V1 capability.

A fallback provider must return structured data only. For example:

```ts
export type InterpreterResponse = {
  candidates: IntentCandidate[];
  explanation?: string; // diagnostic only; never shown or trusted as facts
};
```

The application must reject:

- unknown capability names;
- unknown or missing arguments;
- invalid dates or IDs;
- unsupported medical claims;
- permission-sensitive actions without an explicit permission check;
- requests to send, forward, delete, or overwrite data unless a native capability explicitly supports them.

An AI-generated candidate is not a command. It is equivalent to user-supplied form data from an untrusted client.

### Modular provider packaging

Keep providers in separate modules and inject them into the application:

```text
interpretation/
  interpreter.ts          # shared interfaces
  deterministic.ts        # current parser
  fallback.ts             # ordered provider selection
  local-helper.ts         # future local module
  ai.ts                   # future external AI adapter
  privacy-gateway.ts      # only for providers needing redaction
```

`local-helper.ts` and `ai.ts` should depend on `Interpreter`, not vice versa. Capability handlers should depend on neither. This makes “use the local helper instead of AI” a configuration/composition change rather than a business-logic rewrite.

## 8. Recommended project structure

The target structure is deliberately modular. `index.ts` is only the Worker composition root; it must not contain business logic.

```text
src/
  index.ts                         # compact Worker entry point
  application/
    create-application.ts          # dependency composition root
  transport/
    whatsapp-webhook.ts            # provider-specific HTTP/webhook adapter
    whatsapp-client.ts             # outbound provider port/adapter
    types.ts                       # transport boundary types
  pipeline/
    process-inbound-message.ts     # application orchestration only
  contracts/
    inbound-message.ts
    classification.ts
    structured-request.ts
    capability.ts
    response.ts
  modules/
    message-normaliser/
      normalise.ts                 # text/format normalisation only
      types.ts
    intent-classifier/
      classify.ts                  # untrusted intent classification
      features.ts
      model.ts
      types.ts
    structured-request-builder/
      build-request.ts             # classification -> typed request
      types.ts
    identity-resolver/
      resolve-people.ts            # names/roles/patient/delegate resolution
    validation-gate/
      validate-request.ts           # validation and permission decisions
    capabilities/
      memory.ts
      people.ts
      permissions.ts
      health.ts
      documents.ts
    response-planner/
      plan-response.ts
    response-renderer/
      render-response.ts
  repositories/                     # domain-facing repository ports/adapters
  infrastructure/
    d1/                             # D1 implementations only
    whatsapp/                       # Twilio/Meta implementations only
  config.ts
  fixture.ts
migrations/
intent-lab/                          # offline evaluation/training only
test/
  contracts/
  pipeline/
  modules/
  infrastructure/
```

Dependency direction must point inward:

```text
index -> application -> pipeline -> modules -> contracts
                                  modules -> repository/infrastructure interfaces
infrastructure -> contracts/interfaces
```

Modules must not import `index.ts`, transport payload types, or concrete D1 implementations. They receive narrow interfaces through constructors/functions. A classifier never writes data, a capability never parses natural language, and a renderer never queries D1.

This is a target layout, not a request to move every current file immediately. Migrate one vertical slice at a time, beginning with the existing fact lookup/record flow. Preserve compatibility exports while tests move to the new contracts. `src/index.ts` should become compact only after the pipeline owns the extracted orchestration; reducing its line count without moving responsibility would merely hide coupling.

## 9. Technologies and features not to introduce in V1

Do not introduce these yet:

- Open Policy Agent/Rego; use a small `PermissionChecker` interface and TypeScript checks first.
- Cloudflare Workflows; a Cron Trigger is enough for simple reminders.
- A general-purpose workflow or agent engine.
- Vector databases, embeddings, semantic search, or graph databases.
- A dedicated microservice architecture; keep one Worker.
- A message queue unless real background work or retry volume demands it.
- Event sourcing; use ordinary D1 records plus focused audit events.
- A dashboard as the primary interface.
- A large NLP framework.
- Direct AI access to D1, secrets, WhatsApp, or external connectors.
- Complex ontology or role identity records.
- Automatic forwarding of private or health-related information.

## Future hooks worth preserving now

Preserve these small interfaces and conventions, but do not implement their future systems yet:

1. **Transport boundary**: `InboundMessage` and `MessageSender`, so WhatsApp can later coexist with another channel.
2. **Interpreter boundary**: `Interpreter` and `IntentCandidate`, so deterministic, local, and AI providers are interchangeable.
3. **Capability contract**: typed validation, caller context, resolution metadata, and structured results.
4. **Capability registry**: capability names map to native handlers; future connectors can add capabilities without changing routing.
5. **Permission boundary**: call a `PermissionChecker` before execution, even if V1's implementation is simple.
6. **Repository boundary**: keep D1 SQL out of handlers so a later connector or storage change is localised.
7. **Privacy gateway boundary**: make external interpretation pass through one redaction/credential boundary.
8. **Audit metadata**: record source, request/message IDs, action, and entity IDs for later reporting and policy review.
9. **Reminder delivery boundary**: Cron can be replaced by a queue or Workflow without changing reminder creation.
10. **Tenant/user scoping**: include `userId` in capability context and repository queries from the beginning, even with one family.
11. **Opaque IDs and UTC**: avoid migrations away from human-readable keys and local timestamps later.
12. **Clarification state**: model pending questions as conversation state, not as hidden AI memory.

The architecture is therefore future-compatible at its seams, without making future products part of V1. The first useful product remains a small, deterministic family-memory assistant whose truth lives in D1 and whose interpreters can be replaced without granting them control of the system.
