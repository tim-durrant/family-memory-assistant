# Intent v1.2 Confidence Calibration

Generated: `2026-09-13T05:20:21.945232+00:00`

Calibration uses sigmoid cross-validation fitted on the training split only. Threshold selection uses the development split; the test split remains untouched until final evaluation.

| Model | Calibration | Dev accuracy | Test accuracy | Test ECE | Selected threshold | Test coverage at selected threshold | Test accuracy when selected |
|---|---|---:|---:|---:|---:|---:|---:|
| `logistic_regression` | `raw` | 0.889 | 0.873 | 0.450 | 0.50 | 0.382 | 1.0 |
| `logistic_regression` | `sigmoid_calibrated` | 0.889 | 0.873 | 0.221 | 0.50 | 0.782 | 1.0 |
| `multinomial_naive_bayes` | `raw` | 0.796 | 0.818 | 0.046 | 0.90 | 0.636 | 1.0 |
| `multinomial_naive_bayes` | `sigmoid_calibrated` | 0.815 | 0.818 | 0.278 | 0.50 | 0.655 | 1.0 |

## Threshold interpretation

A threshold controls whether the classifier is confident enough to offer a candidate for further deterministic validation. It is not permission to execute an action. Sensitive, destructive, emergency, identity, and permission operations remain on dedicated deterministic safety paths.

## Reliability interpretation

Expected calibration error compares confidence with observed correctness in confidence bins. Lower is better, but this small synthetic dataset is not sufficient for production calibration claims. Calibration must be repeated as the reviewed corpus grows.
