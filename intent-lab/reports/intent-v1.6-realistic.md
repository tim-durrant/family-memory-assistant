# Intent v1.6 Synthetic-Realistic Evaluation

Generated: `2026-09-13T10:18:12.610210+00:00`

This evaluates baselines trained on the synthetic v1.4 training split against WhatsApp-style examples. The examples are synthetic-realistic and are not evidence of real user behaviour.

Training examples: **347**; evaluation examples: **45**.

Review status summary: human-approved=45.
The examples remain synthetic-realistic rather than real user messages; the review status records human assessment of the authored wording and label.

| Model | Accuracy | Macro F1 | Low confidence (<0.70) |
|---|---:|---:|---:|
| `logistic_regression` | 0.844 | 0.850 | 45 / 45 |
| `multinomial_naive_bayes` | 0.822 | 0.830 | 8 / 45 |

## Review workflow

A human reviewer should assess naturalness, intended label, ambiguity, and whether each example represents plausible WhatsApp usage. If wording or labelling is changed, use `human-corrected`; otherwise use `human-approved`. Preserve `source: synthetic-realistic`.

Classifier outputs remain advisory and must pass deterministic request construction, validation, permissions, and confirmation.
