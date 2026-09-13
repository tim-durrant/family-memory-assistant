"""Create deterministic train/dev/test JSONL splits without splitting paraphrase families."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

SPLITS = ("train", "dev", "test")
TARGETS = {"train": 0.70, "dev": 0.15, "test": 0.15}


def split(rows: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row.get("family_id", row["id"])].append(row)

    result = {name: [] for name in SPLITS}
    assigned = {name: 0 for name in SPLITS}
    total = len(rows)
    unassigned = set(grouped)
    labels = sorted({row["intent"] for row in rows})
    label_set = set(labels)

    # Reserve one complete family containing each label for dev and test before
    # balancing. This prevents a common label from consuming all evaluation
    # space while preserving every cross-label contrastive family.
    for split_name in ("test", "dev"):
        for label in labels:
            candidates = [family_id for family_id in unassigned if any(row["intent"] == label for row in grouped[family_id])]
            if not candidates:
                raise ValueError(f"{split_name} is missing intent {label}")
            family_id = min(candidates, key=lambda candidate: (len(grouped[candidate]), candidate))
            result[split_name].extend(grouped[family_id])
            assigned[split_name] += len(grouped[family_id])
            unassigned.remove(family_id)

    # Place remaining complete families in the split furthest below its target.
    for family_id in sorted(unassigned, key=lambda item: (-len(grouped[item]), item)):
        split_name = min(SPLITS, key=lambda name: (assigned[name] / total - TARGETS[name], name))
        result[split_name].extend(grouped[family_id])
        assigned[split_name] += len(grouped[family_id])
    for split_name, values in result.items():
        missing = label_set - {row["intent"] for row in values}
        if missing:
            raise ValueError(f"{split_name} is missing intents: {', '.join(sorted(missing))}")
    for values in result.values():
        values.sort(key=lambda row: row["id"])
    return result


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/synthetic/intents-v1.jsonl")
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("data/synthetic/splits")
    rows = [json.loads(line) for line in source.read_text(encoding="utf-8").splitlines() if line.strip()]
    output.mkdir(parents=True, exist_ok=True)
    result = split(rows)
    for name, values in result.items():
        (output / f"{name}.jsonl").write_text(
            "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in values),
            encoding="utf-8",
        )
        print(f"{name}: {len(values)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
