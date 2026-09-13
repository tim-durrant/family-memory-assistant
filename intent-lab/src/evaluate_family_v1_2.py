"""Evaluate Family Memory intent-v1.2 after policy relabelling."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB

from train_baselines import LABELS, features, report_model

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "synthetic" / "splits-v1.2"
REPORTS = ROOT / "reports"


def load(name: str) -> list[dict]:
    return [json.loads(line) for line in (SPLITS / f"{name}.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    train, dev, test = load("train"), load("dev"), load("test")
    results = []
    for name, model in (
        ("logistic_regression", LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42)),
        ("multinomial_naive_bayes", MultinomialNB(alpha=0.1)),
    ):
        x_train, x_test = features([row["text"] for row in train], [row["text"] for row in test])
        result = report_model(name, model, x_train, [row["intent"] for row in train], x_test, [row["intent"] for row in test])
        results.append({key: value for key, value in result.items() if key not in {"predictions", "actual"}})
    generated = datetime.now(timezone.utc).isoformat()
    output = {"dataset_version": "intent-v1.2", "generated_at": generated, "split_sizes": {"train": len(train), "dev": len(dev), "test": len(test)}, "models": results}
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "intent-v1.2-baseline.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Intent v1.2 Baseline After Policy Revision", "", f"Generated: `{generated}`", "",
        "The v1.2 policy changes the explicitly reviewed reminder example from `resolve_fact` to `needs_clarification`. v1.1 remains preserved.", "",
        f"Split sizes: train **{len(train)}**, dev **{len(dev)}**, test **{len(test)}**.", "",
        "| Model | Test accuracy | Macro F1 | Low confidence (<0.70) |", "|---|---:|---:|---:|",
    ]
    for result in results:
        lines.append(f"| `{result['name']}` | {result['accuracy']:.3f} | {result['classification_report']['macro avg']['f1-score']:.3f} | {result['low_confidence_below_0_70']} / {len(test)} |")
    lines.extend(["", "## Interpretation", "", "This report measures the revised policy dataset only. It is not a production-readiness result; classifier outputs remain advisory and require deterministic request construction, validation, permissions, and confirmation.", ""])
    (REPORTS / "intent-v1.2-baseline.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1.2-baseline.md'}")


if __name__ == "__main__":
    main()
