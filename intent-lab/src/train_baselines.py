"""Train and evaluate the first offline intent-classification baselines."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.naive_bayes import MultinomialNB
from scipy.sparse import hstack

ROOT = Path(__file__).resolve().parents[1]
SPLITS = ROOT / "data" / "synthetic" / "splits"
REPORTS = ROOT / "reports"
MODELS = ROOT / "models"
LABELS = [
    "record_fact",
    "query_fact",
    "record_note",
    "query_note",
    "resolve_fact",
    "forget_fact",
    "help",
    "needs_clarification",
    "unknown",
]


def load_split(name: str) -> list[dict]:
    path = SPLITS / f"{name}.jsonl"
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def features(train_texts: list[str], other_texts: list[str]):
    word = TfidfVectorizer(ngram_range=(1, 2), lowercase=True, strip_accents="unicode", sublinear_tf=True)
    character = TfidfVectorizer(analyzer="char", ngram_range=(3, 5), lowercase=True, sublinear_tf=True, min_df=1)
    train_features = hstack([word.fit_transform(train_texts), character.fit_transform(train_texts)]).tocsr()
    other_features = hstack([word.transform(other_texts), character.transform(other_texts)]).tocsr()
    return train_features, other_features


def report_model(name: str, model, x_train, y_train, x_test, y_test) -> dict:
    model.fit(x_train, y_train)
    predictions = model.predict(x_test)
    probabilities = model.predict_proba(x_test)
    confidence = probabilities.max(axis=1)
    matrix = confusion_matrix(y_test, predictions, labels=LABELS)
    return {
        "name": name,
        "accuracy": accuracy_score(y_test, predictions),
        "average_max_probability": float(confidence.mean()),
        "low_confidence_below_0_70": int((confidence < 0.70).sum()),
        "classification_report": classification_report(y_test, predictions, labels=LABELS, output_dict=True, zero_division=0),
        "confusion_matrix": matrix.tolist(),
    }


def markdown_table(report: dict) -> str:
    rows = ["| Intent | Precision | Recall | F1 | Support |", "|---|---:|---:|---:|---:|"]
    for label in LABELS:
        metrics = report["classification_report"][label]
        rows.append(f"| `{label}` | {metrics['precision']:.2f} | {metrics['recall']:.2f} | {metrics['f1-score']:.2f} | {int(metrics['support'])} |")
    return "\n".join(rows)


def confusion_table(report: dict) -> str:
    matrix = report["confusion_matrix"]
    header = "| actual \\ predicted | " + " | ".join(f"`{label}`" for label in LABELS) + " |\n"
    separator = "|---|" + "---:|" * len(LABELS) + "\n"
    rows = [header, separator]
    for label, values in zip(LABELS, matrix):
        rows.append("| `" + label + "` | " + " | ".join(str(value) for value in values) + " |\n")
    return "".join(rows)


def main() -> None:
    train = load_split("train")
    dev = load_split("dev")
    test = load_split("test")
    train_texts = [row["text"] for row in train]
    y_train = [row["intent"] for row in train]
    dev_texts = [row["text"] for row in dev]
    y_dev = [row["intent"] for row in dev]
    test_texts = [row["text"] for row in test]
    y_test = [row["intent"] for row in test]

    x_train, x_dev = features(train_texts, dev_texts)
    vectorizer_train, x_test = features(train_texts, test_texts)
    # The second feature extraction is deliberate: test evaluation must only
    # use vocabulary fitted on training data. Keep dev evaluation separate.
    del x_dev, vectorizer_train

    results = [
        report_model("logistic_regression", LogisticRegression(max_iter=2000, class_weight="balanced", solver="liblinear", random_state=42), x_train, y_train, x_test, y_test),
        report_model("multinomial_naive_bayes", MultinomialNB(alpha=0.1), x_train, y_train, x_test, y_test),
    ]
    REPORTS.mkdir(parents=True, exist_ok=True)
    MODELS.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).isoformat()
    output = {
        "dataset_version": "intent-v1",
        "generated_at": generated,
        "split_sizes": {"train": len(train), "dev": len(dev), "test": len(test)},
        "labels": LABELS,
        "feature_policy": {"word_ngrams": [1, 2], "character_ngrams": [3, 5], "fit_on": "train_only"},
        "models": results,
    }
    (REPORTS / "intent-v1-baseline.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Intent v1 Baseline Evaluation",
        "",
        f"Generated: `{generated}`",
        "",
        "## Dataset",
        "",
        "| Split | Examples |",
        "|---|---:|",
        *[f"| {name} | {len(rows)} |" for name, rows in (("train", train), ("dev", dev), ("test", test))],
        "",
        "The split preserves paraphrase families. The test set was not used for feature fitting or model selection.",
        "",
        "## Feature extraction",
        "",
        "- word TF-IDF n-grams: 1–2;",
        "- character TF-IDF n-grams: 3–5;",
        "- lowercase and Unicode accent normalization;",
        "- vocabulary and IDF fitted on training examples only;",
        "- no sensitive or production messages used.",
        "",
    ]
    for result in results:
        lines.extend([
            f"## {result['name']}",
            "",
            f"Accuracy: **{result['accuracy']:.3f}**",
            "",
            f"Average maximum class probability: **{result['average_max_probability']:.3f}**",
            "",
            f"Predictions below 0.70 maximum probability: **{result['low_confidence_below_0_70']} / {len(test)}**",
            "",
            markdown_table(result),
            "",
            "### Confusion matrix",
            "",
            confusion_table(result),
            "",
        ])
    lines.extend([
        "## Interpretation",
        "",
        "This is a development baseline, not a production-readiness result. The test set is small and synthetic, and confidence values are not calibrated probabilities. No model should execute capabilities directly; predictions must pass the structured-request builder, identity resolver, validation gate, and permission checks.",
        "",
    ])
    (REPORTS / "intent-v1-baseline.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {REPORTS / 'intent-v1-baseline.md'}")


if __name__ == "__main__":
    main()
