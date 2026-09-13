"""Evaluate baseline classifiers specifically on v1.1 contrastive examples."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from train_baselines import LABELS, features, report_model

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "synthetic" / "splits-v1.1"
BOUNDARIES = ROOT / "data" / "synthetic" / "boundaries-v1.1.jsonl"
REPORTS = ROOT / "reports"


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    train = load(SPLITS / "train.jsonl")
    boundary = [row for row in load(SPLITS / "test.jsonl") if row.get("boundary") and row["boundary"] != "none"]
    x_train, x_boundary = features([row["text"] for row in train], [row["text"] for row in boundary])
    y_train = [row["intent"] for row in train]
    y_boundary = [row["intent"] for row in boundary]
    models = [
        ("logistic_regression", LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42)),
        ("multinomial_naive_bayes", MultinomialNB(alpha=0.1)),
    ]
    results = []
    for name, model in models:
        result = report_model(name, model, x_train, y_train, x_boundary, y_boundary)
        predictions = model.predict(x_boundary)
        result["accuracy_by_boundary"] = {
            boundary_name: sum(prediction == actual for prediction, actual, row in zip(predictions, y_boundary, boundary) if row["boundary"] == boundary_name)
            / sum(row["boundary"] == boundary_name for row in boundary)
            for boundary_name in sorted({row["boundary"] for row in boundary})
        }
        results.append(result)
    REPORTS.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).isoformat()
    output = {
        "dataset_version": "intent-v1.1",
        "generated_at": generated,
        "training_examples": len(train),
        "boundary_examples": len(boundary),
        "boundary_groups": sorted({row["boundary"] for row in boundary}),
        "models": results,
    }
    (REPORTS / "intent-v1.1-boundary.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Intent v1.1 Boundary Evaluation",
        "",
        f"Generated: `{generated}`",
        "",
        f"Training examples: **{len(train)}**",
        "",
        f"Held-out contrastive boundary examples: **{len(boundary)}**",
        "",
        "Boundary groups: `record_fact-record_note`, `query_fact-query_note`, `forget_fact-needs_clarification`, `needs_clarification-unknown`.",
        "",
        "This diagnostic set contains only boundary examples held out in the v1.1 test split. It is separate from the frozen v1 test set and must not be used to claim production readiness.",
        "",
    ]
    for result in results:
        lines.extend([
            f"## {result['name']}",
            "",
            f"Accuracy: **{result['accuracy']:.3f}**",
            "",
            f"Average maximum probability: **{result['average_max_probability']:.3f}**",
            "",
            f"Predictions below 0.70 maximum probability: **{result['low_confidence_below_0_70']} / {len(boundary)}**",
            "",
            "| Boundary | Accuracy |",
            "|---|---:|",
            *[f"| `{boundary_name}` | {accuracy:.3f} |" for boundary_name, accuracy in result["accuracy_by_boundary"].items()],
            "",
        ])
    lines.extend([
        "## Interpretation",
        "",
        "Use this report to identify which boundaries need more examples or revised labels. The classifier remains advisory; all predictions still require deterministic request construction, identity resolution, safety validation, permission checks, and confirmation rules.",
        "",
    ])
    (REPORTS / "intent-v1.1-boundary.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.1-boundary.md'}")


if __name__ == "__main__":
    main()
