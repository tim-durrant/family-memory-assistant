# Intent v1.1 Error Analysis

Generated: `2026-09-13T05:10:39.076577+00:00`

Training examples: **253**

Held-out test examples: **55**

This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.

## logistic_regression

Misclassified examples: **6 / 55**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `needs_clarification` | `resolve_fact` | 2 |
| `query_fact` | `record_fact` | 1 |
| `needs_clarification` | `query_fact` | 1 |
| `needs_clarification` | `query_note` | 1 |
| `needs_clarification` | `record_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0097` | `query_fact` | `record_fact` | 0.228 | `none` | Do you remember when Mum is visiting? |
| `intent-v1.1-0046` | `needs_clarification` | `resolve_fact` | 0.169 | `forget_fact-needs_clarification` | The car registration. |
| `intent-v1.1-0062` | `needs_clarification` | `query_fact` | 0.162 | `forget_fact-needs_clarification` | The concert. |
| `intent-v1.1-0086` | `needs_clarification` | `resolve_fact` | 0.206 | `forget_fact-needs_clarification` | The barbecue. |
| `intent-v1.1-0110` | `needs_clarification` | `query_note` | 0.151 | `forget_fact-needs_clarification` | The parcel. |
| `intent-v1.1-0134` | `needs_clarification` | `record_fact` | 0.158 | `forget_fact-needs_clarification` | The birthday. |

### Review prompts

- `forget_fact-needs_clarification`: review 5 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## multinomial_naive_bayes

Misclassified examples: **10 / 55**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `record_note` | `record_fact` | 3 |
| `resolve_fact` | `forget_fact` | 2 |
| `query_fact` | `record_fact` | 1 |
| `needs_clarification` | `record_fact` | 1 |
| `needs_clarification` | `resolve_fact` | 1 |
| `needs_clarification` | `query_note` | 1 |
| `query_fact` | `needs_clarification` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1-0097` | `query_fact` | `record_fact` | 0.681 | `none` | Do you remember when Mum is visiting? |
| `intent-v1-0141` | `resolve_fact` | `forget_fact` | 0.832 | `none` | I no longer need the reminder about the lunch. |
| `intent-v1-0144` | `resolve_fact` | `forget_fact` | 0.455 | `none` | The library book was returned, so resolve that. |
| `intent-v1.1-0046` | `needs_clarification` | `record_fact` | 0.443 | `forget_fact-needs_clarification` | The car registration. |
| `intent-v1.1-0058` | `record_note` | `record_fact` | 0.828 | `record_fact-record_note` | Save this note: The concert starts at seven. |
| `intent-v1.1-0086` | `needs_clarification` | `resolve_fact` | 0.336 | `forget_fact-needs_clarification` | The barbecue. |
| `intent-v1.1-0110` | `needs_clarification` | `query_note` | 0.398 | `forget_fact-needs_clarification` | The parcel. |
| `intent-v1.1-0115` | `query_fact` | `needs_clarification` | 0.429 | `query_fact-query_note` | When is the house inspection? |
| `intent-v1.1-0130` | `record_note` | `record_fact` | 0.638 | `record_fact-record_note` | Save this note: Mum's birthday is in march. |
| `intent-v1.1-0154` | `record_note` | `record_fact` | 0.550 | `record_fact-record_note` | Save this note: Mum is visiting in december. |

### Review prompts

- `forget_fact-needs_clarification`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-query_note`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## Review rules

1. Confirm the intended label before adding an example.
2. If the label policy is unclear, revise the policy before adding more data.
3. Prefer contrastive examples that distinguish the confused intents.
4. Keep the current v1 and v1.1 test sets frozen while investigating.
5. Do not use classifier confidence as permission to execute a capability.
