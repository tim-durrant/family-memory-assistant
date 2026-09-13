# Intent v1.3 Human Review

## Scope

This review covers all 18 held-out v1.3 test errors reported for logistic regression and multinomial Naive Bayes. The review applies `data/intent-policy-v1.2.md` and does not alter any frozen test set.

## Decisions

| Pattern | Decision | Reason |
|---|---|---|
| `Do you remember when Mum is visiting?` | Keep `query_fact` | The word `when` requests structured date/time information, even though `remember` also appears. |
| `I no longer need the reminder about the lunch.` | Keep `needs_clarification` | It could mean resolve, delete, or cancel a future reminder; it must not imply a destructive action. |
| `The library book.` / `The garden work.` / `The electrician.` and similar fragments | Keep `needs_clarification` | A supported topic is plausible, but no safe action is specified. |
| `Add an entry saying that the swimming lesson was discussed.` | Keep `record_note` | `add an entry` explicitly requests free-form note storage, even though the content is factual. |
| `What is the tallest mountain? please` and similar variants | Keep `unknown` | Politeness does not convert an unrelated general-knowledge request into a supported memory capability. |
| `Save this note: ...` predicted as `record_fact` | Keep `record_note` | The explicit note delimiter is authoritative for the label; this is a classifier error. |
| `Put down that ... has been booked.` predicted as `resolve_fact` | Keep `record_fact` | `has been booked` records a fact; it does not ask to mark an existing fact complete. |
| `Forget the saved fact about ...` predicted as `resolve_fact` | Keep `forget_fact` | Explicit `forget`/`delete` language indicates removal and remains subject to confirmation. |

## Outcome

No test examples were relabelled. The current policy is sufficiently precise for these cases.

The following targeted examples should be added to a future training revision, not to the frozen test set:

- retrieval questions containing both `remember` and `when`;
- note requests using `add an entry` without the literal word `note`;
- explicit `forget` examples containing words such as `booked` or `complete` nearby;
- factual statements containing `booked` that are not resolution requests;
- unrelated questions with polite fillers;
- topic fragments that should clarify rather than become `unknown`.

## Safety conclusion

The review supports retaining the current conservative policy. In particular, the classifier must not be allowed to turn low-confidence or ambiguous predictions into deletion, resolution, or any other capability without deterministic validation and confirmation.
