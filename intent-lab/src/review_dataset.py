"""Export and apply a human-friendly JSON review copy of a JSONL dataset."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "data" / "synthetic-realistic" / "intent-v1.6.jsonl"
REVIEW_COPY = ROOT / "data" / "synthetic-realistic" / "intent-v1.6-review.json"
REQUIRED_REVIEW_STATUSES = {"not-reviewed", "human-approved", "human-corrected", "rejected"}


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def validate(rows: list[dict]) -> None:
    ids = [row.get("id") for row in rows]
    if len(ids) != len(set(ids)):
        raise ValueError("review copy contains duplicate IDs")
    for row in rows:
        if row.get("source") != "synthetic-realistic":
            raise ValueError(f"{row.get('id')}: source must remain synthetic-realistic")
        if row.get("review_status") not in REQUIRED_REVIEW_STATUSES:
            raise ValueError(f"{row.get('id')}: invalid or missing review_status")


def export() -> None:
    rows = load_jsonl(CANONICAL)
    REVIEW_COPY.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(rows)} examples to {REVIEW_COPY}")


def apply() -> None:
    rows = json.loads(REVIEW_COPY.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not all(isinstance(row, dict) for row in rows):
        raise ValueError("review copy must contain a JSON array of objects")
    validate(rows)
    CANONICAL.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Applied {len(rows)} reviewed examples to {CANONICAL}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("export", "apply"))
    args = parser.parse_args()
    export() if args.command == "export" else apply()


if __name__ == "__main__":
    main()
