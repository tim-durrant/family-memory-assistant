# Intent v1.4 Error Analysis

Generated: `2026-09-13T05:38:02.297099+00:00`

Training examples: **347**

Held-out test examples: **74**

This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.

## logistic_regression

Misclassified examples: **4 / 74**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `needs_clarification` | `record_fact` | 3 |
| `needs_clarification` | `forget_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0141` | `needs_clarification` | `forget_fact` | 0.162 | `resolve_fact-needs_clarification` | I no longer need the reminder about the lunch. |
| `intent-v1.1-0038` | `needs_clarification` | `record_fact` | 0.176 | `forget_fact-needs_clarification` | The family lunch. |
| `intent-v1.1-0062` | `needs_clarification` | `record_fact` | 0.146 | `forget_fact-needs_clarification` | The concert. |
| `intent-v1.1-0134` | `needs_clarification` | `record_fact` | 0.195 | `forget_fact-needs_clarification` | The birthday. |

### Review prompts

- `forget_fact-needs_clarification`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## multinomial_naive_bayes

Misclassified examples: **11 / 74**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `needs_clarification` | `record_fact` | 3 |
| `needs_clarification` | `record_note` | 2 |
| `record_fact` | `record_note` | 2 |
| `needs_clarification` | `forget_fact` | 1 |
| `forget_fact` | `needs_clarification` | 1 |
| `needs_clarification` | `resolve_fact` | 1 |
| `query_fact` | `resolve_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0141` | `needs_clarification` | `forget_fact` | 0.668 | `resolve_fact-needs_clarification` | I no longer need the reminder about the lunch. |
| `intent-v1.1-0013` | `forget_fact` | `needs_clarification` | 0.480 | `forget_fact-needs_clarification` | Forget the soccer game. |
| `intent-v1.1-0038` | `needs_clarification` | `record_fact` | 0.473 | `forget_fact-needs_clarification` | The family lunch. |
| `intent-v1.1-0062` | `needs_clarification` | `record_fact` | 0.568 | `forget_fact-needs_clarification` | The concert. |
| `intent-v1.1-0086` | `needs_clarification` | `record_note` | 0.235 | `forget_fact-needs_clarification` | The barbecue. |
| `intent-v1.1-0097` | `record_fact` | `record_note` | 0.905 | `record_fact-record_note` | Remember that the garden needs watering. |
| `intent-v1.1-0110` | `needs_clarification` | `record_note` | 0.343 | `forget_fact-needs_clarification` | The parcel. |
| `intent-v1.1-0134` | `needs_clarification` | `record_fact` | 0.744 | `forget_fact-needs_clarification` | The birthday. |
| `intent-v1.1-0145` | `record_fact` | `record_note` | 0.493 | `record_fact-record_note` | Remember that the electrician will call after lunch. |
| `intent-v1.1-0158` | `needs_clarification` | `resolve_fact` | 0.581 | `forget_fact-needs_clarification` | The family visit. |
| `intent-v1.3-0373` | `query_fact` | `resolve_fact` | 0.642 | `none` | Look up the saved fact about the swimming lesson. |

### Review prompts

- `forget_fact-needs_clarification`: review 7 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 2 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## Review rules

1. Confirm the intended label before adding an example.
2. If the label policy is unclear, revise the policy before adding more data.
3. Prefer contrastive examples that distinguish the confused intents.
4. Keep the current v1, v1.1, and v1.2 test sets frozen while investigating.
5. Do not use classifier confidence as permission to execute a capability.
