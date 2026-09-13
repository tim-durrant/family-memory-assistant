# Intent v1.4 Baseline After Targeted Data Expansion

Generated: `2026-09-13T05:38:01.827172+00:00`

The v1.2 policy changes the explicitly reviewed reminder example from `resolve_fact` to `needs_clarification`. v1.1 and v1.2 remain preserved.

Split sizes: train **347**, dev **75**, test **74**.

| Model | Test accuracy | Macro F1 | Low confidence (<0.70) |
|---|---:|---:|---:|
| `logistic_regression` | 0.946 | 0.960 | 74 / 74 |
| `multinomial_naive_bayes` | 0.851 | 0.863 | 12 / 74 |

## Interpretation

This report measures the revised policy dataset only. It is not a production-readiness result; classifier outputs remain advisory and require deterministic request construction, validation, permissions, and confirmation.
