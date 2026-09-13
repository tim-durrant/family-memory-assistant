"""Run full and learning-curve baselines on the style-held-out scale set."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.naive_bayes import MultinomialNB

from train_baselines import features

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "synthetic" / "splits-scale-v1.5"
REPORTS = ROOT / "reports"
MODELS = ("logistic_regression", "multinomial_naive_bayes")
SHOTS = (10, 25, 50, 70)


def load(name: str) -> list[dict]:
    return [json.loads(line) for line in (SPLITS / f"{name}.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def model(name: str):
    return LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42) if name == "logistic_regression" else MultinomialNB(alpha=0.1)


def sample(rows: list[dict], shots: int) -> list[dict]:
    by_intent: dict[str, list[dict]] = {}
    for row in rows:
        by_intent.setdefault(row["intent"], []).append(row)
    return [row for intent in sorted(by_intent) for row in by_intent[intent][:shots]]


def evaluate(model_name: str, train: list[dict], test: list[dict], labels: list[str]) -> dict:
    x_train, x_test = features([row["text"] for row in train], [row["text"] for row in test])
    y_train, y_test = [row["intent"] for row in train], [row["intent"] for row in test]
    fitted = model(model_name)
    fitted.fit(x_train, y_train)
    predictions = fitted.predict(x_test)
    return {"accuracy": accuracy_score(y_test, predictions), "macro_f1": f1_score(y_test, predictions, labels=labels, average="macro", zero_division=0)}


def main() -> None:
    train, dev, test = load("train"), load("dev"), load("test")
    labels = sorted({row["intent"] for row in train})
    full = {name: {"dev": evaluate(name, train, dev, labels), "test": evaluate(name, train, test, labels)} for name in MODELS}
    learning = {str(shots): {name: evaluate(name, sample(train, shots), test, labels) for name in MODELS} for shots in SHOTS}
    generated = datetime.now(timezone.utc).isoformat()
    output = {"dataset_version": "intent-v1.5", "generated_at": generated, "split_sizes": {"train": len(train), "dev": len(dev), "test": len(test)}, "styles": {"train": sorted({row["style"] for row in train}), "dev": sorted({row["style"] for row in dev}), "test": sorted({row["style"] for row in test})}, "full": full, "learning_curve": learning}
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "intent-v1.5-scale.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    lines = ["# Intent v1.5 Synthetic Scale Experiment", "", f"Generated: `{generated}`", "", "This experiment measures generalisation to held-out wording styles. It is synthetic evidence only and is not a production-readiness result.", "", "## Splits", "", f"Train: **{len(train)}** examples; dev: **{len(dev)}**; test: **{len(test)}**.", "", f"Train styles: `{', '.join(sorted({row['style'] for row in train}))}`", "", f"Dev styles: `{', '.join(sorted({row['style'] for row in dev}))}`", "", f"Test styles: `{', '.join(sorted({row['style'] for row in test}))}`", "", "## Full training split", "", "| Model | Dev accuracy | Test accuracy | Test macro F1 |", "|---|---:|---:|---:|"]
    for name in MODELS:
        lines.append(f"| `{name}` | {full[name]['dev']['accuracy']:.3f} | {full[name]['test']['accuracy']:.3f} | {full[name]['test']['macro_f1']:.3f} |")
    lines.extend(["", "## Learning curve", "", "Each point uses the first k training examples per intent; the test styles remain held out.", "", "| Examples per intent | Logistic regression | Naive Bayes |", "|---:|---:|---:|"])
    for shots in SHOTS:
        lines.append(f"| {shots} | {learning[str(shots)]['logistic_regression']['accuracy']:.3f} | {learning[str(shots)]['multinomial_naive_bayes']['accuracy']:.3f} |")
    lines.extend(["", "## Interpretation", "", "This experiment is useful for comparing data scale and style generalisation, but synthetic wording can still share generator assumptions. The result must be followed by reviewed de-identified ordinary messages before any production classifier integration. ML predictions remain advisory and must pass deterministic request construction, validation, identity resolution, permissions, and confirmation.", ""])
    (REPORTS / "intent-v1.5-scale.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.5-scale.md'}")


if __name__ == "__main__":
    main()
