# Intent v1.3 Error Analysis

Generated: `2026-09-13T05:31:47.450236+00:00`

Training examples: **322**

Held-out test examples: **69**

This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.

## logistic_regression

Misclassified examples: **8 / 69**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `needs_clarification` | `unknown` | 2 |
| `unknown` | `query_fact` | 2 |
| `query_fact` | `record_fact` | 1 |
| `needs_clarification` | `forget_fact` | 1 |
| `needs_clarification` | `resolve_fact` | 1 |
| `record_note` | `record_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0097` | `query_fact` | `record_fact` | 0.253 | `none` | Do you remember when Mum is visiting? |
| `intent-v1-0141` | `needs_clarification` | `forget_fact` | 0.170 | `resolve_fact-needs_clarification` | I no longer need the reminder about the lunch. |
| `intent-v1.1-0030` | `needs_clarification` | `resolve_fact` | 0.174 | `forget_fact-needs_clarification` | The library book. |
| `intent-v1.1-0102` | `needs_clarification` | `unknown` | 0.140 | `forget_fact-needs_clarification` | The garden work. |
| `intent-v1.1-0150` | `needs_clarification` | `unknown` | 0.201 | `forget_fact-needs_clarification` | The electrician. |
| `intent-v1.3-0377` | `record_note` | `record_fact` | 0.209 | `none` | Add an entry saying that the swimming lesson was discussed. |
| `intent-v1.3-0453` | `unknown` | `query_fact` | 0.265 | `none` | What is the tallest mountain? please |
| `intent-v1.3-0459` | `unknown` | `query_fact` | 0.275 | `none` | What is the tallest mountain? for me |

### Review prompts

- `forget_fact-needs_clarification`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 4 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## multinomial_naive_bayes

Misclassified examples: **10 / 69**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `forget_fact` | `resolve_fact` | 2 |
| `query_fact` | `record_fact` | 1 |
| `needs_clarification` | `forget_fact` | 1 |
| `needs_clarification` | `resolve_fact` | 1 |
| `record_note` | `record_fact` | 1 |
| `needs_clarification` | `unknown` | 1 |
| `record_fact` | `resolve_fact` | 1 |
| `unknown` | `help` | 1 |
| `unknown` | `query_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0097` | `query_fact` | `record_fact` | 0.782 | `none` | Do you remember when Mum is visiting? |
| `intent-v1-0141` | `needs_clarification` | `forget_fact` | 0.799 | `resolve_fact-needs_clarification` | I no longer need the reminder about the lunch. |
| `intent-v1.1-0030` | `needs_clarification` | `resolve_fact` | 0.457 | `forget_fact-needs_clarification` | The library book. |
| `intent-v1.1-0042` | `record_note` | `record_fact` | 0.636 | `record_fact-record_note` | Save this note: The car registration is due in june. |
| `intent-v1.1-0150` | `needs_clarification` | `unknown` | 0.880 | `forget_fact-needs_clarification` | The electrician. |
| `intent-v1.3-0366` | `record_fact` | `resolve_fact` | 0.894 | `none` | Put down that the swimming lesson has been booked. |
| `intent-v1.3-0416` | `forget_fact` | `resolve_fact` | 0.897 | `none` | Forget the saved fact about the swimming lesson. |
| `intent-v1.3-0422` | `forget_fact` | `resolve_fact` | 0.914 | `none` | Forget the saved fact about the utility bill. |
| `intent-v1.3-0455` | `unknown` | `help` | 0.768 | `none` | Tell me something interesting. please |
| `intent-v1.3-0459` | `unknown` | `query_fact` | 0.672 | `none` | What is the tallest mountain? for me |

### Review prompts

- `forget_fact-needs_clarification`: review 2 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 6 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## Review rules

1. Confirm the intended label before adding an example.
2. If the label policy is unclear, revise the policy before adding more data.
3. Prefer contrastive examples that distinguish the confused intents.
4. Keep the current v1, v1.1, and v1.2 test sets frozen while investigating.
5. Do not use classifier confidence as permission to execute a capability.
