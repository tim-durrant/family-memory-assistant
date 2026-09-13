"""Add targeted contrastive examples from the v1.6 realistic-corpus errors."""

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("data/synthetic/intents-v1.4.jsonl")
OUTPUT = Path("data/synthetic/intents-v1.7.jsonl")

ADDITIONS = [
    ("record_fact", "Keep that Jacob's game is on Saturday", "target-informal-record-fact"),
    ("record_fact", "Save this one - the dentist is Tuesday", "target-informal-record-fact"),
    ("record_fact", "Mum's coming round Sunday, remember that", "target-informal-record-fact"),
    ("record_fact", "Put down that the school thing moved to Friday", "target-informal-record-fact"),
    ("record_fact", "Don't let me forget the plumber's coming at three", "target-informal-record-fact"),
    ("record_fact", "Can you keep the family lunch is next weekend", "target-informal-record-fact"),
    ("query_note", "Have I written anything down about the holiday", "target-indirect-note-query"),
    ("query_note", "What was I saying about the garden job", "target-indirect-note-query"),
    ("query_note", "Did I put anything in about the school forms", "target-indirect-note-query"),
    ("query_note", "Can you find what I wrote on the car", "target-indirect-note-query"),
    ("query_note", "Was there a note somewhere about Mum's visit", "target-indirect-note-query"),
    ("query_note", "Bring up the stuff I saved about the party", "target-indirect-note-query"),
    ("needs_clarification", "I don't need the lunch reminder now", "target-no-longer-need-clarify"),
    ("needs_clarification", "That appointment isn't needed anymore", "target-no-longer-need-clarify"),
    ("needs_clarification", "You can stop keeping the dentist thing", "target-no-longer-need-clarify"),
    ("needs_clarification", "The soccer reminder can go now", "target-no-longer-need-clarify"),
    ("needs_clarification", "We don't need that saved visit anymore", "target-no-longer-need-clarify"),
    ("needs_clarification", "No need for the school reminder now", "target-no-longer-need-clarify"),
    ("unknown", "What colour is the moon, really", "target-natural-unknown-question"),
    ("unknown", "How tall is Mount Everest again", "target-natural-unknown-question"),
    ("unknown", "Why do rainbows happen", "target-natural-unknown-question"),
    ("unknown", "Could you translate this into Italian for me", "target-natural-unknown-question"),
    ("unknown", "Tell me a funny story", "target-natural-unknown-question"),
    ("unknown", "Can you book us a taxi for eight", "target-natural-unknown-question"),
    ("resolve_fact", "The plumber job's done, close it off", "target-indirect-resolve"),
    ("resolve_fact", "That school thing is sorted now, mark it complete", "target-indirect-resolve"),
    ("resolve_fact", "The book's been returned so resolve that", "target-indirect-resolve"),
    ("resolve_fact", "We're finished with the concert matter", "target-indirect-resolve"),
    ("resolve_fact", "That's dealt with now, you can close the appointment", "target-indirect-resolve"),
    ("resolve_fact", "No more action needed on the garden job - mark it done", "target-indirect-resolve"),
    ("needs_clarification", "Can you sort out the appointment", "target-action-unspecified"),
    ("needs_clarification", "What about the soccer game", "target-action-unspecified"),
    ("needs_clarification", "The school thing tomorrow", "target-action-unspecified"),
    ("needs_clarification", "About the holiday notes", "target-action-unspecified"),
    ("needs_clarification", "Can you do something with that", "target-action-unspecified"),
    ("needs_clarification", "The plumber", "target-action-unspecified"),
]


def main() -> None:
    rows = [json.loads(line) for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()]
    existing = {row["text"] for row in rows}
    next_id = len(rows) + 1
    for intent, text, family_id in ADDITIONS:
        if text in existing:
            continue
        rows.append({
            "id": f"intent-v1.7-{next_id:04d}",
            "text": text,
            "intent": intent,
            "sensitivity": "ordinary",
            "requires_clarification": intent == "needs_clarification",
            "source": "synthetic",
            "dataset_version": "intent-v1.7",
            "family_id": family_id,
            "boundary": family_id,
            "policy_version": "intent-policy-v1.2",
        })
        existing.add(text)
        next_id += 1
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples")


if __name__ == "__main__":
    main()
