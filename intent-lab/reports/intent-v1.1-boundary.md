# Intent v1.1 Boundary Evaluation

Generated: `2026-09-13T04:27:35.975062+00:00`

Training examples: **253**

Held-out contrastive boundary examples: **46**

Boundary groups: `record_fact-record_note`, `query_fact-query_note`, `forget_fact-needs_clarification`, `needs_clarification-unknown`.

This diagnostic set contains only boundary examples held out in the v1.1 test split. It is separate from the frozen v1 test set and must not be used to claim production readiness.

## logistic_regression

Accuracy: **0.891**

Average maximum probability: **0.456**

Predictions below 0.70 maximum probability: **46 / 46**

| Boundary | Accuracy |
|---|---:|
| `forget_fact-needs_clarification` | 0.643 |
| `needs_clarification-unknown` | 1.000 |
| `query_fact-query_note` | 1.000 |
| `record_fact-record_note` | 1.000 |

## multinomial_naive_bayes

Accuracy: **0.848**

Average maximum probability: **0.869**

Predictions below 0.70 maximum probability: **10 / 46**

| Boundary | Accuracy |
|---|---:|
| `forget_fact-needs_clarification` | 0.786 |
| `needs_clarification-unknown` | 1.000 |
| `query_fact-query_note` | 0.917 |
| `record_fact-record_note` | 0.812 |

## Interpretation

Use this report to identify which boundaries need more examples or revised labels. The classifier remains advisory; all predictions still require deterministic request construction, identity resolution, safety validation, permission checks, and confirmation rules.
