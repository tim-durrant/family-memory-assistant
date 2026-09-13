# Intent v1.1 Boundary Labelling Policy

This policy defines the labels used when two intents share the same topic or vocabulary. It applies to the synthetic boundary corpus and must be used when reviewing future examples.

## `record_fact`

Use when the user wants a concise factual statement, event, date, status, or time to be retained as structured memory. The statement may be conversational and does not require the literal word `remember`.

## `record_note`

Use when the user explicitly asks to preserve a longer or free-form entry, reflection, observation, or note. Delimiters such as `save this note`, `write this down`, or `add this to my notes` are strong evidence.

## `query_fact`

Use when the user asks for a stored fact, date, time, status, or event detail. Questions such as `when`, `what date`, or `what is the status` normally target structured facts.

## `query_note`

Use when the user asks to read, find, retrieve, or search the text of a note or previous writing. Phrases such as `what did I write`, `show my note`, or `find the entry` are strong evidence.

## `forget_fact`

Use only when the user explicitly asks to delete, forget, erase, remove, or discard a stored fact. This remains subject to confirmation in the application.

## `needs_clarification`

Use when a message appears plausibly related to a supported capability but does not provide enough information to act safely. It is actionable ambiguity, not an unsupported request.

## `unknown`

Use for unsupported requests, unrelated conversation, or messages for which no supported capability is reasonably indicated. Do not force these into the nearest known intent.

## Boundary rules

- Topic words do not determine intent by themselves. `dentist`, `soccer`, and `appointment` may occur in several labels.
- A classifier prediction is advisory. Structured request construction, identity resolution, validation, permission checks, and confirmation remain deterministic.
- Synthetic examples must not contain real names, phone numbers, health information, documents, or secrets.
- Keep contrastive paraphrase families together when creating train/dev/test splits.
