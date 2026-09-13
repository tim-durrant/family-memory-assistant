"""Generate error analysis for the human-approved v1.6 realistic corpus."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from train_baselines import LABELS, features

ROOT = Path(__file__).resolve().parents[1]
TRAIN = ROOT / "data" / "synthetic" / "splits-v1.4" / "train.jsonl"
EVALUATION = ROOT / "data" / "synthetic-realistic" / "intent-v1.6.jsonl"
REPORTS = ROOT / "reports"


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def evaluate(name: str, model, train: list[dict], test: list[dict]) -> tuple[list[dict], dict[str, int]]:
    x_train, x_test = features([row["text"] for row in train], [row["text"] for row in test])
    model.fit(x_train, [row["intent"] for row in train])
    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)
    classes = list(model.classes_)
    errors = []
    confusion: Counter[tuple[str, str]] = Counter()
    for row, prediction, scores in zip(test, predictions, probabilities):
        if prediction == row["intent"]:
            continue
        confusion[(row["intent"], prediction)] += 1
        ranked = sorted(zip(classes, scores), key=lambda item: item[1], reverse=True)[:3]
        errors.append({
            "id": row["id"],
            "text": row["text"],
            "actual": row["intent"],
            "predicted": prediction,
            "confidence": float(max(scores)),
            "alternatives": [(label, float(score)) for label, score in ranked],
            "family_id": row.get("family_id", "none"),
            "boundary": row.get("boundary", "none"),
        })
    return errors, {f"{actual} → {predicted}": count for (actual, predicted), count in confusion.most_common()}


def main() -> None:
    train = load(TRAIN)
    test = load(EVALUATION)
    models = {
        "logistic_regression": LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42),
        "multinomial_naive_bayes": MultinomialNB(alpha=0.1),
    }
    results = {}
    for name, model in models.items():
        errors, confusion = evaluate(name, model, train, test)
        results[name] = {"errors": errors, "confusion": confusion}

    generated = datetime.now(timezone.utc).isoformat()
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "intent-v1.6-error-analysis.json").write_text(json.dumps({
        "dataset_version": "intent-v1.6",
                "training_dataset": "intent-v1.4",
                "evaluation_source": "synthetic-realistic",
        "generated_at": generated,
        "training_examples": len(train),
        "test_examples": len(test),
        "models": results,
    }, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Intent v1.6 Realistic Corpus Error Analysis",
        "",
        f"Generated: `{generated}`",
        "",
        f"Training examples: **{len(train)}**",
        "",
        f"Held-out test examples: **{len(test)}**",
        "",
        "This report is for reviewing model errors and label boundaries. It does not change the approved dataset or authorize production execution.",
        "",
    ]
    for name, result in results.items():
        errors = result["errors"]
        lines.extend([f"## {name}", "", f"Misclassified examples: **{len(errors)} / {len(test)}**", ""])
        lines.extend(["### Confusion counts", "", "| Actual | Predicted | Count |", "|---|---|---:|"])
        lines.extend(f"| `{pair.split(' → ')[0]}` | `{pair.split(' → ')[1]}` | {count} |" for pair, count in result["confusion"].items())
        lines.extend(["", "### Misclassified examples", "", "| ID | Actual | Predicted | Confidence | Boundary | Text |", "|---|---|---|---:|---|---|"])
        for error in errors:
            text = error["text"].replace("|", "\\|").replace("\n", " ")
            lines.append(f"| `{error['id']}` | `{error['actual']}` | `{error['predicted']}` | {error['confidence']:.3f} | `{error['boundary']}` | {text} |")
        lines.extend(["", "### Review prompts", ""])
        grouped: defaultdict[str, list[dict]] = defaultdict(list)
        for error in errors:
            grouped[error["boundary"]].append(error)
        for boundary, boundary_errors in sorted(grouped.items()):
            lines.append(f"- `{boundary}`: review {len(boundary_errors)} error(s) against the labelling policy and consider targeted examples only if the label is correct.")
        lines.append("")

    lines.extend([
        "## Review rules",
        "",
        "1. Confirm the intended label before adding an example.",
        "2. If the label policy is unclear, revise the policy before adding more data.",
        "3. Prefer contrastive examples that distinguish the confused intents.",
        "4. Keep the current v1, v1.1, v1.2, and v1.3 test sets frozen while investigating.",
        "5. Do not use classifier confidence as permission to execute a capability.",
        "",
    ])
    (REPORTS / "intent-v1.6-error-analysis.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.6-error-analysis.md'}")


if __name__ == "__main__":
    main()
