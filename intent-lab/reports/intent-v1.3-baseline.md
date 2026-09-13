# Intent v1.3 Baseline After Corpus Expansion

Generated: `2026-09-13T05:30:54.929502+00:00`

The v1.2 policy changes the explicitly reviewed reminder example from `resolve_fact` to `needs_clarification`. v1.1 and v1.2 remain preserved.

Split sizes: train **322**, dev **69**, test **69**.

| Model | Test accuracy | Macro F1 | Low confidence (<0.70) |
|---|---:|---:|---:|
| `logistic_regression` | 0.884 | 0.872 | 68 / 69 |
| `multinomial_naive_bayes` | 0.855 | 0.833 | 9 / 69 |

## Interpretation

This report measures the revised policy dataset only. It is not a production-readiness result; classifier outputs remain advisory and require deterministic request construction, validation, permissions, and confirmation.
