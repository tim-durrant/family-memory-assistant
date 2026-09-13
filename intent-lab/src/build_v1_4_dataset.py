"""Add reviewed, targeted examples identified by v1.3 error analysis."""

from __future__ import annotations

import json
from pathlib import Path

SOURCE = Path("data/synthetic/intents-v1.3.jsonl")
OUTPUT = Path("data/synthetic/intents-v1.4.jsonl")

ADDITIONS = [
    ("query_fact", "Do you remember when the swimming lesson is?", "target-remember-when"),
    ("query_fact", "Can you remember what date the utility bill is due?", "target-remember-when"),
    ("query_fact", "I remember there was a family photo event; when is it?", "target-remember-when"),
    ("query_fact", "Please tell me when the library visit happens, if you remember.", "target-remember-when"),
    ("query_fact", "What time did we save for the weekend market?", "target-remember-when"),
    ("query_fact", "Do you recall the date of the school form deadline?", "target-remember-when"),
    ("record_note", "Add an entry to my notes saying that the bus trip was discussed.", "target-add-entry-note"),
    ("record_note", "Please add an entry about the birthday cake: buy candles.", "target-add-entry-note"),
    ("record_note", "Put an entry in my notes that the cinema booking changed.", "target-add-entry-note"),
    ("record_note", "Create a note entry saying the garden project needs attention.", "target-add-entry-note"),
    ("record_note", "Add this entry to my notes: ask about the grocery order.", "target-add-entry-note"),
    ("record_note", "Could you keep an entry about the football practice?", "target-add-entry-note"),
    ("forget_fact", "Forget the swimming lesson, please.", "target-explicit-forget"),
    ("forget_fact", "Delete the saved fact that the utility bill is due.", "target-explicit-forget"),
    ("forget_fact", "Remove the booked library visit from memory.", "target-explicit-forget"),
    ("forget_fact", "Erase the fact about the weekend market.", "target-explicit-forget"),
    ("forget_fact", "I want you to forget the school form deadline.", "target-explicit-forget"),
    ("forget_fact", "Please take the booked bus trip out of my saved information.", "target-explicit-forget"),
    ("record_fact", "Put down that the birthday cake has been booked.", "target-booked-fact"),
    ("record_fact", "Remember that the cinema booking is confirmed.", "target-booked-fact"),
    ("record_fact", "The garden project has been booked for Wednesday.", "target-booked-fact"),
    ("record_fact", "Save that football practice is booked at five.", "target-booked-fact"),
    ("record_fact", "The grocery order is booked for delivery tomorrow.", "target-booked-fact"),
    ("record_fact", "Record that the family photo session has been arranged.", "target-booked-fact"),
    ("unknown", "What is the tallest mountain, please?", "target-polite-unknown"),
    ("unknown", "Could you tell me who invented the telephone, please?", "target-polite-unknown"),
    ("unknown", "Please explain how rainbows form for me.", "target-polite-unknown"),
    ("unknown", "Can you translate this sentence, if you can?", "target-polite-unknown"),
    ("unknown", "Tell me something interesting about space, thanks.", "target-polite-unknown"),
    ("unknown", "Would you please order a pizza for me?", "target-polite-unknown"),
    ("needs_clarification", "The swimming lesson.", "target-fragment-clarify"),
    ("needs_clarification", "About the utility bill.", "target-fragment-clarify"),
    ("needs_clarification", "The family photo tomorrow.", "target-fragment-clarify"),
    ("needs_clarification", "Can you handle the library visit?", "target-fragment-clarify"),
    ("needs_clarification", "Please do something with the school form.", "target-fragment-clarify"),
    ("needs_clarification", "Jacob's football practice.", "target-fragment-clarify"),
]


def main() -> None:
    rows = [json.loads(line) for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()]
    existing = {row["text"] for row in rows}
    next_id = len(rows) + 1
    added = 0
    for intent, text, family_id in ADDITIONS:
        if text in existing:
            continue
        rows.append({
            "id": f"intent-v1.4-{next_id:04d}",
            "text": text,
            "intent": intent,
            "sensitivity": "ordinary",
            "requires_clarification": intent == "needs_clarification",
            "source": "synthetic",
            "dataset_version": "intent-v1.4",
            "family_id": family_id,
            "boundary": family_id,
            "policy_version": "intent-policy-v1.2",
        })
        existing.add(text)
        added += 1
        next_id += 1
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples; added {added} targeted examples")


if __name__ == "__main__":
    main()
