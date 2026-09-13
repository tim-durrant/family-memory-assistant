"""Evaluate targeted v1.7 training against the approved v1.6 realistic corpus."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.naive_bayes import MultinomialNB

from train_baselines import LABELS, features

ROOT = Path(__file__).resolve().parents[1]
TRAIN = ROOT / "data" / "synthetic" / "splits-v1.7" / "train.jsonl"
EVALUATION = ROOT / "data" / "synthetic-realistic" / "intent-v1.6.jsonl"
REPORTS = ROOT / "reports"


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def evaluate(name: str, estimator, train: list[dict], evaluation: list[dict]) -> dict:
    x_train, x_eval = features([row["text"] for row in train], [row["text"] for row in evaluation])
    y_train = [row["intent"] for row in train]
    y_eval = [row["intent"] for row in evaluation]
    estimator.fit(x_train, y_train)
    predictions = estimator.predict(x_eval)
    probabilities = estimator.predict_proba(x_eval)
    confidence = probabilities.max(axis=1)
    return {
        "name": name,
        "accuracy": accuracy_score(y_eval, predictions),
        "average_max_probability": float(confidence.mean()),
        "low_confidence_below_0_70": int((confidence < 0.70).sum()),
        "classification_report": classification_report(y_eval, predictions, labels=LABELS, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(y_eval, predictions, labels=LABELS).tolist(),
    }


def main() -> None:
    train = load(TRAIN)
    evaluation = load(EVALUATION)
    results = [
        evaluate("logistic_regression", LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42), train, evaluation),
        evaluate("multinomial_naive_bayes", MultinomialNB(alpha=0.1), train, evaluation),
    ]
    generated = datetime.now(timezone.utc).isoformat()
    status_summary = {status: sum(row.get("review_status") == status for row in evaluation) for status in ("not-reviewed", "human-approved", "human-corrected", "rejected")}
    output = {
        "dataset_version": "intent-v1.7",
        "generated_at": generated,
        "training_dataset": "intent-v1.7-targeted",
        "evaluation_source": "synthetic-realistic",
        "review_status_summary": status_summary,
        "split_sizes": {"train": len(train), "evaluation": len(evaluation)},
        "models": results,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "intent-v1.7-targeted.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Intent v1.7 Targeted Training Evaluation",
        "",
        f"Generated: `{generated}`",
        "",
        "This evaluates targeted v1.7 training against the human-approved v1.6 WhatsApp-style corpus. The evaluation examples are synthetic-realistic and are not real user messages.",
        "",
        f"Training examples: **{len(train)}**; evaluation examples: **{len(evaluation)}**.",
        "",
        f"Review status summary: {', '.join(f'{status}={count}' for status, count in status_summary.items() if count)}.",
        "The examples remain synthetic-realistic rather than real user messages; the review status records human assessment of the authored wording and label.",
        "",
        "| Model | Accuracy | Macro F1 | Low confidence (<0.70) |",
        "|---|---:|---:|---:|",
    ]
    for result in results:
        lines.append(f"| `{result['name']}` | {result['accuracy']:.3f} | {result['classification_report']['macro avg']['f1-score']:.3f} | {result['low_confidence_below_0_70']} / {len(evaluation)} |")
    lines.extend([
        "",
        "## Review workflow",
        "",
        "A human reviewer should assess naturalness, intended label, ambiguity, and whether each example represents plausible WhatsApp usage. If wording or labelling is changed, use `human-corrected`; otherwise use `human-approved`. Preserve `source: synthetic-realistic`.",
        "",
        "Classifier outputs remain advisory and must pass deterministic request construction, validation, permissions, and confirmation.",
        "",
    ])
    (REPORTS / "intent-v1.7-targeted.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.7-targeted.md'}")


if __name__ == "__main__":
    main()
