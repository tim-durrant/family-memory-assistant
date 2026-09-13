"""Create intent-v1.2 from v1.1 with policy-approved relabelling."""

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("data/synthetic/intents-v1.1.jsonl")
OUTPUT = Path("data/synthetic/intents-v1.2.jsonl")

# This is deliberately explicit and reviewable. Do not silently infer labels
# from model predictions when revising a policy version.
RELABELS = {
    "intent-v1-0141": "needs_clarification",
}


def main() -> None:
    rows = []
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        row["dataset_version"] = "intent-v1.2"
        row["policy_version"] = "intent-policy-v1.2"
        if row["id"] in RELABELS:
            row["intent"] = RELABELS[row["id"]]
            row["requires_clarification"] = True
            row["boundary"] = "resolve_fact-needs_clarification"
        rows.append(row)
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples; relabelled {len(RELABELS)}")


if __name__ == "__main__":
    main()
