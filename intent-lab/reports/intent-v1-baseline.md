# Intent v1 Baseline Evaluation

Generated: `2026-09-13T04:17:09.027843+00:00`

## Dataset

| Split | Examples |
|---|---:|
| train | 108 |
| dev | 55 |
| test | 39 |

The split preserves paraphrase families. The test set was not used for feature fitting or model selection.

## Feature extraction

- word TF-IDF n-grams: 1–2;
- character TF-IDF n-grams: 3–5;
- lowercase and Unicode accent normalization;
- vocabulary and IDF fitted on training examples only;
- no sensitive or production messages used.

## logistic_regression

Accuracy: **0.436**

Average maximum class probability: **0.195**

Predictions below 0.70 maximum probability: **39 / 39**

| Intent | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| `record_fact` | 0.25 | 0.50 | 0.33 | 4 |
| `query_fact` | 0.20 | 1.00 | 0.33 | 1 |
| `record_note` | 0.50 | 0.75 | 0.60 | 4 |
| `query_note` | 0.67 | 0.29 | 0.40 | 7 |
| `resolve_fact` | 0.57 | 1.00 | 0.73 | 4 |
| `forget_fact` | 0.00 | 0.00 | 0.00 | 6 |
| `help` | 0.57 | 1.00 | 0.73 | 4 |
| `needs_clarification` | 0.00 | 0.00 | 0.00 | 5 |
| `unknown` | 1.00 | 0.25 | 0.40 | 4 |

### Confusion matrix

| actual \ predicted | `record_fact` | `query_fact` | `record_note` | `query_note` | `resolve_fact` | `forget_fact` | `help` | `needs_clarification` | `unknown` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `record_fact` | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| `query_fact` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `record_note` | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 |
| `query_note` | 0 | 1 | 3 | 2 | 0 | 0 | 1 | 0 | 0 |
| `resolve_fact` | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| `forget_fact` | 2 | 1 | 0 | 0 | 2 | 0 | 0 | 1 | 0 |
| `help` | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 |
| `needs_clarification` | 2 | 1 | 0 | 0 | 1 | 0 | 1 | 0 | 0 |
| `unknown` | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |


## multinomial_naive_bayes

Accuracy: **0.487**

Average maximum class probability: **0.759**

Predictions below 0.70 maximum probability: **14 / 39**

| Intent | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| `record_fact` | 0.40 | 0.50 | 0.44 | 4 |
| `query_fact` | 0.20 | 1.00 | 0.33 | 1 |
| `record_note` | 0.38 | 0.75 | 0.50 | 4 |
| `query_note` | 0.75 | 0.43 | 0.55 | 7 |
| `resolve_fact` | 0.67 | 1.00 | 0.80 | 4 |
| `forget_fact` | 0.50 | 0.17 | 0.25 | 6 |
| `help` | 0.57 | 1.00 | 0.73 | 4 |
| `needs_clarification` | 0.50 | 0.20 | 0.29 | 5 |
| `unknown` | 0.00 | 0.00 | 0.00 | 4 |

### Confusion matrix

| actual \ predicted | `record_fact` | `query_fact` | `record_note` | `query_note` | `resolve_fact` | `forget_fact` | `help` | `needs_clarification` | `unknown` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `record_fact` | 2 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| `query_fact` | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| `record_note` | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 |
| `query_note` | 0 | 0 | 3 | 3 | 0 | 0 | 1 | 0 | 0 |
| `resolve_fact` | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 | 0 |
| `forget_fact` | 1 | 1 | 0 | 0 | 2 | 1 | 0 | 1 | 0 |
| `help` | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 |
| `needs_clarification` | 1 | 2 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| `unknown` | 1 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 0 |


## Interpretation

This is a development baseline, not a production-readiness result. The test set is small and synthetic, and confidence values are not calibrated probabilities. No model should execute capabilities directly; predictions must pass the structured-request builder, identity resolver, validation gate, and permission checks.
