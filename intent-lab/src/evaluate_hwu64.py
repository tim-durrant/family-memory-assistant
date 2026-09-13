"""Evaluate the baseline feature pipeline on HWU64's native labels only."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.naive_bayes import MultinomialNB
from scipy.sparse import hstack

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "benchmarks" / "hwu64" / "converted"
REPORTS = ROOT / "reports"
SEED = 42
MODELS = ("logistic_regression", "multinomial_naive_bayes")


def load(name: str) -> list[dict]:
    return [json.loads(line) for line in (DATA / f"{name}.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]


def vectorize(train_texts: list[str], other_texts: list[str]):
    word = TfidfVectorizer(ngram_range=(1, 2), lowercase=True, strip_accents="unicode", sublinear_tf=True, min_df=1)
    character = TfidfVectorizer(analyzer="char", ngram_range=(3, 5), lowercase=True, sublinear_tf=True, min_df=1)
    train_features = hstack([word.fit_transform(train_texts), character.fit_transform(train_texts)]).tocsr()
    other_features = hstack([word.transform(other_texts), character.transform(other_texts)]).tocsr()
    return train_features, other_features


def make_model(name: str):
    if name == "logistic_regression":
        return LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=SEED)
    return MultinomialNB(alpha=0.1)


def evaluate(name: str, train: list[dict], evaluation: list[dict], labels: list[str]) -> dict:
    x_train, x_evaluation = vectorize([row["text"] for row in train], [row["text"] for row in evaluation])
    y_train = [row["benchmark_intent"] for row in train]
    y_evaluation = [row["benchmark_intent"] for row in evaluation]
    model = make_model(name)
    model.fit(x_train, y_train)
    predictions = model.predict(x_evaluation)
    probabilities = model.predict_proba(x_evaluation)
    confidence = probabilities.max(axis=1)
    return {
        "model": name,
        "accuracy": accuracy_score(y_evaluation, predictions),
        "average_max_probability": float(confidence.mean()),
        "low_confidence_below_0_70": int((confidence < 0.70).sum()),
        "classification_report": classification_report(y_evaluation, predictions, labels=labels, output_dict=True, zero_division=0),
        "confusion_matrix": confusion_matrix(y_evaluation, predictions, labels=labels).tolist(),
        "predictions": predictions.tolist(),
        "actual": y_evaluation,
    }


def few_shot_sample(train: list[dict], shots: int) -> list[dict]:
    by_label: dict[str, list[dict]] = defaultdict(list)
    for row in train:
        by_label[row["benchmark_intent"]].append(row)
    # Source ordering is deterministic; use the first k examples per label so
    # the benchmark can be reproduced without serialising a random sample.
    return [row for label in sorted(by_label) for row in by_label[label][:shots]]


def top_confusions(result: dict, labels: list[str], limit: int = 15) -> list[tuple[str, str, int]]:
    pairs: Counter[tuple[str, str]] = Counter()
    for actual, predicted in zip(result["actual"], result["predictions"]):
        if actual != predicted:
            pairs[(actual, predicted)] += 1
    return [(actual, predicted, count) for (actual, predicted), count in pairs.most_common(limit)]


def metric_table(result: dict, labels: list[str]) -> str:
    rows = ["| Intent | Precision | Recall | F1 | Support |", "|---|---:|---:|---:|---:|"]
    metrics = result["classification_report"]
    for label in labels:
        item = metrics[label]
        rows.append(f"| `{label}` | {item['precision']:.2f} | {item['recall']:.2f} | {item['f1-score']:.2f} | {int(item['support'])} |")
    return "\n".join(rows)


def main() -> None:
    train = load("train")
    valid = load("valid")
    test = load("test")
    labels = sorted({row["benchmark_intent"] for row in train})
    results: list[dict] = []
    for model_name in MODELS:
        valid_result = evaluate(model_name, train, valid, labels)
        test_result = evaluate(model_name, train, test, labels)
        results.append({"model": model_name, "valid": valid_result, "test": test_result})

    few_shot: dict[str, dict[str, float]] = {}
    for shots in (1, 5, 10, 25):
        sample = few_shot_sample(train, shots)
        few_shot[str(shots)] = {}
        for model_name in MODELS:
            result = evaluate(model_name, sample, test, labels)
            few_shot[str(shots)][model_name] = result["accuracy"]

    generated = datetime.now(timezone.utc).isoformat()
    output = {
        "benchmark": "hwu64",
        "generated_at": generated,
        "labels": labels,
        "split_sizes": {"train": len(train), "valid": len(valid), "test": len(test)},
        "feature_policy": {"word_ngrams": [1, 2], "character_ngrams": [3, 5], "fit_on": "each_training_subset_only"},
        "results": [{"model": item["model"], "valid": {key: value for key, value in item["valid"].items() if key not in {"predictions", "actual"}}, "test": {key: value for key, value in item["test"].items() if key not in {"predictions", "actual"}}} for item in results],
        "few_shot_test_accuracy": few_shot,
    }
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / "hwu64-baseline.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# HWU64 Baseline Methodology Benchmark",
        "",
        f"Generated: `{generated}`",
        "",
        "This report evaluates the classifier methodology against HWU64's native labels. HWU64 labels are not mapped to Family Memory labels and are not production training data.",
        "",
        "## Dataset",
        "",
        "| Split | Examples | Native labels |",
        "|---|---:|---:|",
        f"| train | {len(train)} | {len(set(row['benchmark_intent'] for row in train))} |",
        f"| valid | {len(valid)} | {len(set(row['benchmark_intent'] for row in valid))} |",
        f"| test | {len(test)} | {len(set(row['benchmark_intent'] for row in test))} |",
        "",
        "## Features",
        "",
        "- word TF-IDF n-grams: 1–2;",
        "- character TF-IDF n-grams: 3–5;",
        "- vocabulary and IDF fitted on each training subset only;",
        "- no Family Memory examples or production messages used.",
        "",
    ]
    for item in results:
        lines.extend([
            f"## {item['model']}",
            "",
            f"Validation accuracy: **{item['valid']['accuracy']:.3f}**",
            f"\nTest accuracy: **{item['test']['accuracy']:.3f}**",
            f"\nTest macro F1: **{item['test']['classification_report']['macro avg']['f1-score']:.3f}**",
            f"\nTest weighted F1: **{item['test']['classification_report']['weighted avg']['f1-score']:.3f}**",
            f"\nAverage test maximum probability: **{item['test']['average_max_probability']:.3f}**",
            f"\nTest predictions below 0.70 maximum probability: **{item['test']['low_confidence_below_0_70']} / {len(test)}**",
            "",
            metric_table(item["test"], labels),
            "",
            "### Most common test confusions",
            "",
            "| Actual | Predicted | Count |",
            "|---|---|---:|",
            *[f"| `{actual}` | `{predicted}` | {count} |" for actual, predicted, count in top_confusions(item["test"], labels)],
            "",
        ])
    lines.extend([
        "## Few-shot test accuracy",
        "",
        "Each k-shot model uses the first k examples per native HWU64 label from the training split. This is a deterministic methodology comparison, not a production model selection exercise.",
        "",
        "| Shots per label | Logistic regression | Naive Bayes |",
        "|---:|---:|---:|",
        *[f"| {shots} | {few_shot[str(shots)]['logistic_regression']:.3f} | {few_shot[str(shots)]['multinomial_naive_bayes']:.3f} |" for shots in (1, 5, 10, 25)],
        "",
        "## Interpretation",
        "",
        "These results measure general intent-classification methodology on a public personal-assistant benchmark. They do not establish that the model understands Family Memory capabilities, sensitive health language, patient/delegate relationships, or permission rules. Any future production classifier remains advisory and must pass deterministic request construction, identity resolution, validation, and authorization.",
        "",
    ])
    (REPORTS / "hwu64-baseline.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'hwu64-baseline.md'}")


if __name__ == "__main__":
    main()
