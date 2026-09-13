# Family Memory Intent Policy v1.2

This policy is the labelling authority for the `intent-v1.2` dataset. The previous v1.1 corpus remains preserved for historical comparison.

## Intent boundaries

- `record_fact`: retain a concise factual statement, event, date, time, or status as structured memory.
- `record_note`: explicitly preserve a note, entry, reflection, observation, or free-form text.
- `query_fact`: retrieve structured fact information such as a date, time, event, or status.
- `query_note`: retrieve previous written content, a note, entry, or saved text.
- `resolve_fact`: explicitly mark something resolved, complete, finished, dealt with, or no longer pending.
- `forget_fact`: explicitly ask to forget, delete, erase, remove, or discard a stored fact. The application still requires confirmation.
- `needs_clarification`: a supported action is plausible but the message is too incomplete or ambiguous to execute safely.
- `unknown`: unsupported, unrelated, or non-actionable content.

## Conservative ambiguity rules

- `I no longer need the reminder about lunch` is `needs_clarification`, not `resolve_fact` or `forget_fact`. It could mean resolve, delete, or cancel a reminder.
- Do not infer deletion from words such as `old`, `finished`, or `no longer useful` without an explicit removal request.
- Do not infer resolution from a general statement that something is no longer needed.
- Topic words such as `dentist`, `soccer`, and `appointment` do not determine intent.
- A message fragment such as `The dentist` or `Jacob and soccer` is `needs_clarification` when it plausibly points to a supported capability.
- An unrelated request such as `Tell me a joke` is `unknown`.

## Execution boundary

Classifier labels are advisory. Structured request construction, identity resolution, validation, permission checks, and destructive-action confirmation remain deterministic and are not delegated to the model.
