# Intent v1.7 Targeted Training Error Analysis

Generated: `2026-09-13T10:23:56.211906+00:00`

Training examples: **372**

Held-out test examples: **45**

This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.

## logistic_regression

Misclassified examples: **6 / 45**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `query_fact` | `needs_clarification` | 2 |
| `record_fact` | `needs_clarification` | 1 |
| `resolve_fact` | `needs_clarification` | 1 |
| `forget_fact` | `needs_clarification` | 1 |
| `needs_clarification` | `query_note` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1.6-0001` | `record_fact` | `needs_clarification` | 0.301 | `record_fact-record_note` | Can you keep Jacob's game somewhere |
| `intent-v1.6-0008` | `query_fact` | `needs_clarification` | 0.235 | `none` | Do you know what time the plumber's coming |
| `intent-v1.6-0010` | `query_fact` | `needs_clarification` | 0.281 | `query_fact-needs_clarification` | When's that appointment thing again |
| `intent-v1.6-0024` | `resolve_fact` | `needs_clarification` | 0.294 | `none` | Can we call the plumber thing finished now |
| `intent-v1.6-0027` | `forget_fact` | `needs_clarification` | 0.268 | `none` | Can you take the soccer game out of memory |
| `intent-v1.6-0039` | `needs_clarification` | `query_note` | 0.210 | `query_fact-query_note-needs_clarification` | What was I meant to ask about the school thing |

### Review prompts

- `none`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-query_note-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## multinomial_naive_bayes

Misclassified examples: **6 / 45**

### Confusion counts

| Actual | Predicted | Count |
|---|---|---:|
| `record_fact` | `needs_clarification` | 1 |
| `query_fact` | `needs_clarification` | 1 |
| `resolve_fact` | `needs_clarification` | 1 |
| `forget_fact` | `needs_clarification` | 1 |
| `forget_fact` | `query_fact` | 1 |
| `needs_clarification` | `record_note` | 1 |

### Misclassified examples

| ID | Actual | Predicted | Confidence | Boundary | Text |
|---|---|---|---:|---|---|
| `intent-v1.6-0001` | `record_fact` | `needs_clarification` | 0.986 | `record_fact-record_note` | Can you keep Jacob's game somewhere |
| `intent-v1.6-0010` | `query_fact` | `needs_clarification` | 0.983 | `query_fact-needs_clarification` | When's that appointment thing again |
| `intent-v1.6-0024` | `resolve_fact` | `needs_clarification` | 0.684 | `none` | Can we call the plumber thing finished now |
| `intent-v1.6-0027` | `forget_fact` | `needs_clarification` | 0.656 | `none` | Can you take the soccer game out of memory |
| `intent-v1.6-0029` | `forget_fact` | `query_fact` | 0.882 | `none` | Could you remove the family lunch detail |
| `intent-v1.6-0039` | `needs_clarification` | `record_note` | 0.338 | `query_fact-query_note-needs_clarification` | What was I meant to ask about the school thing |

### Review prompts

- `none`: review 3 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `query_fact-query_note-needs_clarification`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.
- `record_fact-record_note`: review 1 error(s) against the labelling policy and consider targeted examples only if the label is correct.

## Review rules

1. Confirm the intended label before adding an example.
2. If the label policy is unclear, revise the policy before adding more data.
3. Prefer contrastive examples that distinguish the confused intents.
4. Keep the current v1, v1.1, v1.2, and v1.3 test sets frozen while investigating.
5. Do not use classifier confidence as permission to execute a capability.
