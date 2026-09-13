"""Evaluate confidence calibration and selective-routing thresholds."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from train_baselines import features

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "synthetic" / "splits-v1.3"
REPORTS = ROOT / "reports"
THRESHOLDS = (0.50, 0.60, 0.70, 0.80, 0.90)


def load(name: str) -> list[dict]:
    return [json.loads(line) for line in (SPLITS / f"{name}.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def metrics(probabilities, predictions, actual: list[str], thresholds: tuple[float, ...]) -> dict:
    confidence = probabilities.max(axis=1)
    correct = [prediction == expected for prediction, expected in zip(predictions, actual)]
    bins = []
    for lower in (0.0, 0.2, 0.4, 0.6, 0.8):
        upper = lower + 0.2
        selected = [index for index, value in enumerate(confidence) if lower <= value < upper or (upper == 1.0 and value == 1.0)]
        if selected:
            bins.append({"lower": lower, "upper": upper, "count": len(selected), "average_confidence": float(sum(confidence[index] for index in selected) / len(selected)), "accuracy": sum(correct[index] for index in selected) / len(selected)})
    threshold_metrics = {}
    for threshold in thresholds:
        selected = [index for index, value in enumerate(confidence) if value >= threshold]
        threshold_metrics[str(threshold)] = {
            "selected": len(selected),
            "coverage": len(selected) / len(actual),
            "accuracy_when_selected": sum(correct[index] for index in selected) / len(selected) if selected else None,
        }
    return {
        "accuracy": sum(correct) / len(correct),
        "average_max_probability": float(confidence.mean()),
        "expected_calibration_error": float(sum(abs(item["average_confidence"] - item["accuracy"]) * item["count"] for item in bins) / len(actual)),
        "reliability_bins": bins,
        "thresholds": threshold_metrics,
    }


def run_model(name: str, factory, train: list[dict], dev: list[dict], test: list[dict]) -> dict:
    x_train, x_dev = features([row["text"] for row in train], [row["text"] for row in dev])
    _, x_test = features([row["text"] for row in train], [row["text"] for row in test])
    y_train = [row["intent"] for row in train]
    y_dev = [row["intent"] for row in dev]
    y_test = [row["intent"] for row in test]

    raw = factory()
    raw.fit(x_train, y_train)
    calibrated = CalibratedClassifierCV(factory(), method="sigmoid", cv=3, n_jobs=-1)
    calibrated.fit(x_train, y_train)
    output = {}
    for label, model in (("raw", raw), ("sigmoid_calibrated", calibrated)):
        dev_probabilities = model.predict_proba(x_dev)
        test_probabilities = model.predict_proba(x_test)
        dev_predictions = model.predict(x_dev)
        test_predictions = model.predict(x_test)
        dev_metrics = metrics(dev_probabilities, dev_predictions, y_dev, THRESHOLDS)
        test_metrics = metrics(test_probabilities, test_predictions, y_test, THRESHOLDS)
        # Select the highest-coverage threshold meeting the 95% dev precision
        # target; if none meets it, retain the most accurate dev threshold.
        eligible = [(float(threshold), values["coverage"]) for threshold, values in dev_metrics["thresholds"].items() if values["accuracy_when_selected"] is not None and values["accuracy_when_selected"] >= 0.95]
        chosen = max(eligible, key=lambda item: item[1])[0] if eligible else max(
            ((float(threshold), values["accuracy_when_selected"] or 0.0) for threshold, values in dev_metrics["thresholds"].items()),
            key=lambda item: item[1],
        )[0]
        output[label] = {"dev": dev_metrics, "test": test_metrics, "selected_threshold_from_dev": chosen, "test_at_selected_threshold": test_metrics["thresholds"][str(chosen)]}
    return output


def main() -> None:
    train, dev, test = load("train"), load("dev"), load("test")
    results = {
        "logistic_regression": run_model("logistic_regression", lambda: LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42), train, dev, test),
        "multinomial_naive_bayes": run_model("multinomial_naive_bayes", lambda: MultinomialNB(alpha=0.1), train, dev, test),
    }
    generated = datetime.now(timezone.utc).isoformat()
    payload = {"dataset_version": "intent-v1.3", "generated_at": generated, "split_sizes": {"train": len(train), "dev": len(dev), "test": len(test)}, "thresholds": list(THRESHOLDS), "calibration_method": "sigmoid cross-validation fitted on training data only", "models": results}
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "intent-v1.3-calibration.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Intent v1.3 Confidence Calibration", "", f"Generated: `{generated}`", "",
        "Calibration uses sigmoid cross-validation fitted on the training split only. Threshold selection uses the development split; the test split remains untouched until final evaluation.", "",
        "| Model | Calibration | Dev accuracy | Test accuracy | Test ECE | Selected threshold | Test coverage at selected threshold | Test accuracy when selected |", "|---|---|---:|---:|---:|---:|---:|---:|",
    ]
    for model_name, model_results in results.items():
        for calibration_name, item in model_results.items():
            selected = item["selected_threshold_from_dev"]
            final = item["test_at_selected_threshold"]
            lines.append(f"| `{model_name}` | `{calibration_name}` | {item['dev']['accuracy']:.3f} | {item['test']['accuracy']:.3f} | {item['test']['expected_calibration_error']:.3f} | {selected:.2f} | {final['coverage']:.3f} | {final['accuracy_when_selected'] if final['accuracy_when_selected'] is not None else 'n/a'} |")
    lines.extend(["", "## Threshold interpretation", "", "A threshold controls whether the classifier is confident enough to offer a candidate for further deterministic validation. It is not permission to execute an action. Sensitive, destructive, emergency, identity, and permission operations remain on dedicated deterministic safety paths.", "", "## Reliability interpretation", "", "Expected calibration error compares confidence with observed correctness in confidence bins. Lower is better, but this small synthetic dataset is not sufficient for production calibration claims. Calibration must be repeated as the reviewed corpus grows.", ""])
    (REPORTS / "intent-v1.3-calibration.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.3-calibration.md'}")


if __name__ == "__main__":
    main()
