# Intent v1.4 Confidence Calibration

Generated: `2026-09-13T05:38:03.520662+00:00`

Calibration uses sigmoid cross-validation fitted on the training split only. Threshold selection uses the development split; the test split remains untouched until final evaluation.

| Model | Calibration | Dev accuracy | Test accuracy | Test ECE | Selected threshold | Test coverage at selected threshold | Test accuracy when selected |
|---|---|---:|---:|---:|---:|---:|---:|
| `logistic_regression` | `raw` | 0.947 | 0.946 | 0.480 | 0.50 | 0.568 | 1.0 |
| `logistic_regression` | `sigmoid_calibrated` | 0.933 | 0.919 | 0.217 | 0.50 | 0.838 | 1.0 |
| `multinomial_naive_bayes` | `raw` | 0.840 | 0.851 | 0.042 | 0.90 | 0.716 | 0.9811320754716981 |
| `multinomial_naive_bayes` | `sigmoid_calibrated` | 0.853 | 0.865 | 0.248 | 0.50 | 0.770 | 0.9649122807017544 |

## Threshold interpretation

A threshold controls whether the classifier is confident enough to offer a candidate for further deterministic validation. It is not permission to execute an action. Sensitive, destructive, emergency, identity, and permission operations remain on dedicated deterministic safety paths.

## Reliability interpretation

Expected calibration error compares confidence with observed correctness in confidence bins. Lower is better, but this small synthetic dataset is not sufficient for production calibration claims. Calibration must be repeated as the reviewed corpus grows.
