# Intent v1.5 Synthetic Scale Experiment

Generated: `2026-09-13T05:44:35.849853+00:00`

This experiment measures generalisation to held-out wording styles. It is synthetic evidence only and is not a production-readiness result.

## Splits

Train: **630** examples; dev: **90**; test: **180**.

Train styles: `conversational, direct, indirect, informal, polite, question, terse`

Dev styles: `filler`

Test styles: `adversarial, heldout-natural`

## Full training split

| Model | Dev accuracy | Test accuracy | Test macro F1 |
|---|---:|---:|---:|
| `logistic_regression` | 1.000 | 1.000 | 1.000 |
| `multinomial_naive_bayes` | 1.000 | 0.994 | 0.994 |

## Learning curve

Each point uses the first k training examples per intent; the test styles remain held out.

| Examples per intent | Logistic regression | Naive Bayes |
|---:|---:|---:|
| 10 | 0.994 | 0.989 |
| 25 | 0.994 | 0.989 |
| 50 | 0.994 | 0.994 |
| 70 | 1.000 | 0.994 |

## Interpretation

This experiment is useful for comparing data scale and style generalisation, but synthetic wording can still share generator assumptions. The result must be followed by reviewed de-identified ordinary messages before any production classifier integration. ML predictions remain advisory and must pass deterministic request construction, validation, identity resolution, permissions, and confirmation.
