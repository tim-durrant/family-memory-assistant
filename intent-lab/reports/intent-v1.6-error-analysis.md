# Intent v1.6 Realistic Corpus Error Analysis

Generated: `2026-09-13T10:20:51.974196+00:00`

Training examples: **347**

Held-out test examples: **45**

This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.

## logistic_regression

Misclassified examples: **7 / 45**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `record_fact` | `needs_clarification` | 2 |
| `query_note` | `needs_clarification` | 1 |
| `resolve_fact` | `needs_clarification` | 1 |
| `needs_clarification` | `record_fact` | 1 |
| `needs_clarification` | `unknown` | 1 |
| `unknown` | `query_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1.6-0001` | `record_fact` | `needs_clarification` | 0.358 | `record_fact-record_note` | Can you keep Jacob's game somewhere |
| `intent-v1.6-0004` | `record_fact` | `needs_clarification` | 0.200 | `record_fact-record_note` | The school thing has moved to next Friday can you save it |
| `intent-v1.6-0018` | `query_note` | `needs_clarification` | 0.189 | `query_fact-query_note` | Have I got anything written down about the holiday |
| `intent-v1.6-0024` | `resolve_fact` | `needs_clarification` | 0.188 | `none` | Can we call the plumber thing finished now |
| `intent-v1.6-0025` | `needs_clarification` | `record_fact` | 0.206 | `resolve_fact-forget_fact-needs_clarification` | I don't need that appointment thing anymore |
| `intent-v1.6-0040` | `needs_clarification` | `unknown` | 0.215 | `needs_clarification-unknown` | Can you sort that out for me |
| `intent-v1.6-0041` | `unknown` | `query_fact` | 0.370 | `none` | What colour is the moon actually |

### Review prompts

- `needs_clarification-unknown`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 2 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-query_note`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 2 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-forget_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## multinomial_naive_bayes

Misclassified examples: **8 / 45**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `record_fact` | `needs_clarification` | 2 |
| `query_fact` | `needs_clarification` | 1 |
| `resolve_fact` | `needs_clarification` | 1 |
| `needs_clarification` | `forget_fact` | 1 |
| `forget_fact` | `query_fact` | 1 |
| `needs_clarification` | `help` | 1 |
| `unknown` | `query_fact` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1.6-0001` | `record_fact` | `needs_clarification` | 0.998 | `record_fact-record_note` | Can you keep Jacob's game somewhere |
| `intent-v1.6-0004` | `record_fact` | `needs_clarification` | 0.514 | `record_fact-record_note` | The school thing has moved to next Friday can you save it |
| `intent-v1.6-0010` | `query_fact` | `needs_clarification` | 0.683 | `query_fact-needs_clarification` | When's that appointment thing again |
| `intent-v1.6-0024` | `resolve_fact` | `needs_clarification` | 0.691 | `none` | Can we call the plumber thing finished now |
| `intent-v1.6-0025` | `needs_clarification` | `forget_fact` | 0.587 | `resolve_fact-forget_fact-needs_clarification` | I don't need that appointment thing anymore |
| `intent-v1.6-0029` | `forget_fact` | `query_fact` | 0.547 | `none` | Could you remove the family lunch detail |
| `intent-v1.6-0040` | `needs_clarification` | `help` | 0.416 | `needs_clarification-unknown` | Can you sort that out for me |
| `intent-v1.6-0041` | `unknown` | `query_fact` | 0.954 | `none` | What colour is the moon actually |

### Review prompts

- `needs_clarification-unknown`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `none`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 2 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `resolve_fact-forget_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## Review rules

1. Confirm the intended label before adding an example.
2. If the label policy is unclear, revise the policy before adding more data.
3. Prefer contrastive examples that distinguish the confused intents.
4. Keep the current v1, v1.1, v1.2, and v1.3 test sets frozen while investigating.
5. Do not use classifier confidence as permission to execute a capability.
