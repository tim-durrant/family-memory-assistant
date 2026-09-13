"""Split scale-v1.5 by wording style to measure generalisation."""

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("data/synthetic/scale-v1.5.jsonl")
OUTPUT = Path("data/synthetic/splits-scale-v1.5")
TRAIN_STYLES = {"direct", "polite", "conversational", "indirect", "terse", "informal", "question"}
DEV_STYLES = {"filler"}
TEST_STYLES = {"adversarial", "heldout-natural"}


def main() -> None:
    rows = [json.loads(line) for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()]
    splits = {"train": [], "dev": [], "test": []}
    for row in rows:
        target = "train" if row["style"] in TRAIN_STYLES else "dev" if row["style"] in DEV_STYLES else "test"
        splits[target].append(row)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, values in splits.items():
        (OUTPUT / f"{name}.jsonl").write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in values), encoding="utf-8")
        print(f"{name}: {len(values)}")


if __name__ == "__main__":
    main()
