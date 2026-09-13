"""Validate a checked-in intent dataset without external dependencies."""

from __future__ import annotations

import json
import sys
from pathlib import Path

INTENTS = {
    "record_fact",
    "query_fact",
    "record_note",
    "query_note",
    "resolve_fact",
    "forget_fact",
    "help",
    "needs_clarification",
    "unknown",
}
REQUIRED = {
    "id",
    "text",
    "intent",
    "sensitivity",
    "requires_clarification",
    "source",
    "dataset_version",
}


def validate(path: Path) -> int:
    errors: list[str] = []
    seen: set[str] = set()
    counts = {intent: 0 for intent in sorted(INTENTS)}

    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        try:
            row = json.loads(line)
        except json.JSONDecodeError as error:
            errors.append(f"line {line_number}: invalid JSON ({error.msg})")
            continue
        missing = REQUIRED - row.keys()
        if missing:
            errors.append(f"line {line_number}: missing {', '.join(sorted(missing))}")
        if row.get("id") in seen:
            errors.append(f"line {line_number}: duplicate id {row.get('id')}")
        seen.add(row.get("id"))
        if not isinstance(row.get("text"), str) or not row.get("text", "").strip():
            errors.append(f"line {line_number}: text must be non-empty")
        if row.get("intent") not in INTENTS:
            errors.append(f"line {line_number}: unsupported intent {row.get('intent')!r}")
        else:
            counts[row["intent"]] += 1
        if row.get("sensitivity") not in {"ordinary", "sensitive", "restricted"}:
            errors.append(f"line {line_number}: invalid sensitivity")
        if not isinstance(row.get("requires_clarification"), bool):
            errors.append(f"line {line_number}: requires_clarification must be boolean")
        if row.get("source") not in {"synthetic", "synthetic-realistic", "reviewed-deidentified"}:
            errors.append(f"line {line_number}: invalid source")
        review_status = row.get("review_status")
        if review_status is not None and review_status not in {"not-reviewed", "human-approved", "human-corrected", "rejected"}:
            errors.append(f"line {line_number}: invalid review_status")
        if row.get("source") == "synthetic-realistic" and review_status is None:
            errors.append(f"line {line_number}: synthetic-realistic examples require review_status")
        if "review_notes" in row and not isinstance(row["review_notes"], str):
            errors.append(f"line {line_number}: review_notes must be a string")
        if not isinstance(row.get("dataset_version"), str) or not row["dataset_version"].startswith("intent-v1"):
            errors.append(f"line {line_number}: expected an intent-v1 dataset version")
        if "policy_version" in row and not isinstance(row["policy_version"], str):
            errors.append(f"line {line_number}: policy_version must be a string")

    for intent, count in counts.items():
        if count == 0:
            errors.append(f"no examples for {intent}")

    if errors:
        print("Dataset validation failed:")
        print("\n".join(f"- {error}" for error in errors))
        return 1
    print(f"Valid: {sum(counts.values())} examples")
    for intent, count in counts.items():
        print(f"  {intent}: {count}")
    return 0


if __name__ == "__main__":
    dataset = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/synthetic/intents-v1.jsonl")
    raise SystemExit(validate(dataset))
