"""Combine the original v1 corpus with v1.1 boundary examples."""

from __future__ import annotations

import json
from pathlib import Path

BASE = Path("data/synthetic/intents-v1.jsonl")
BOUNDARIES = Path("data/synthetic/boundaries-v1.1.jsonl")
OUT = Path("data/synthetic/intents-v1.1.jsonl")


def load(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    base = load(BASE)
    boundary = load(BOUNDARIES)
    rows = []
    for item in base:
        copy = dict(item)
        copy["dataset_version"] = "intent-v1.1"
        copy.setdefault("boundary", "none")
        rows.append(copy)
    rows.extend(boundary)
    OUT.write_text("".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples")


if __name__ == "__main__":
    main()
