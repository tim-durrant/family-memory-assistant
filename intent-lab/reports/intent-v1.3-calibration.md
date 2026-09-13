# Intent v1.3 Confidence Calibration

Generated: `2026-09-13T05:30:56.697220+00:00`

Calibration uses sigmoid cross-validation fitted on the training split only. Threshold selection uses the development split; the test split remains untouched until final evaluation.

| Model | Calibration | Dev accuracy | Test accuracy | Test ECE | Selected threshold | Test coverage at selected threshold | Test accuracy when selected |
|---|---|---:|---:|---:|---:|---:|---:|
| `logistic_regression` | `raw` | 0.855 | 0.884 | 0.443 | 0.50 | 0.478 | 1.0 |
| `logistic_regression` | `sigmoid_calibrated` | 0.870 | 0.884 | 0.219 | 0.50 | 0.739 | 1.0 |
| `multinomial_naive_bayes` | `raw` | 0.812 | 0.855 | 0.092 | 0.90 | 0.681 | 0.9787234042553191 |
| `multinomial_naive_bayes` | `sigmoid_calibrated` | 0.797 | 0.783 | 0.185 | 0.60 | 0.536 | 0.972972972972973 |

## Threshold interpretation

A threshold controls whether the classifier is confident enough to offer a candidate for further deterministic validation. It is not permission to execute an action. Sensitive, destructive, emergency, identity, and permission operations remain on dedicated deterministic safety paths.

## Reliability interpretation

Expected calibration error compares confidence with observed correctness in confidence bins. Lower is better, but this small synthetic dataset is not sufficient for production calibration claims. Calibration must be repeated as the reviewed corpus grows.
