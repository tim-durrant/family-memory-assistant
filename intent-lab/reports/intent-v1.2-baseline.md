# Intent v1.2 Baseline After Policy Revision

Generated: `2026-09-13T05:16:35.498277+00:00`

The v1.2 policy changes the explicitly reviewed reminder example from `resolve_fact` to `needs_clarification`. v1.1 remains preserved.

Split sizes: train **253**, dev **54**, test **55**.

| Model | Test accuracy | Macro F1 | Low confidence (<0.70) |
|---|---:|---:|---:|
| `logistic_regression` | 0.873 | 0.879 | 55 / 55 |
| `multinomial_naive_bayes` | 0.818 | 0.837 | 13 / 55 |

## Interpretation

This report measures the revised policy dataset only. It is not a production-readiness result; classifier outputs remain advisory and require deterministic request construction, validation, permissions, and confirmation.
