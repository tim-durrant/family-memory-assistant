"""Convert HWU64's paired seq.in/label files without changing original labels."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "benchmarks" / "hwu64" / "raw" / "HWU64"
OUTPUT = ROOT / "benchmarks" / "hwu64" / "converted"


def convert_split(name: str) -> int:
    texts = (SOURCE / name / "seq.in").read_text(encoding="utf-8").splitlines()
    labels = (SOURCE / name / "label").read_text(encoding="utf-8").splitlines()
    if len(texts) != len(labels):
        raise ValueError(f"{name}: {len(texts)} utterances but {len(labels)} labels")
    rows = []
    for index, (text, label) in enumerate(zip(texts, labels), 1):
        rows.append({
            "id": f"hwu64-{name}-{index:06d}",
            "text": text,
            "benchmark": "hwu64",
            "benchmark_intent": label,
            "split": name,
            "source": "hwu64",
        })
    (OUTPUT / f"{name}.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows),
        encoding="utf-8",
    )
    return len(rows)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    counts = {name: convert_split(name) for name in ("train", "valid", "test")}
    print(counts)


if __name__ == "__main__":
    main()
