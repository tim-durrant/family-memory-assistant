"""Generate the reviewed synthetic v1.1 contrastive boundary corpus."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path("data/synthetic/boundaries-v1.1.jsonl")
TOPICS = [
    ("dentist appointment", "the dentist appointment is on Monday"),
    ("soccer game", "Jacob's soccer game is on Saturday"),
    ("school meeting", "the school meeting is at three"),
    ("library book", "the library book is due tomorrow"),
    ("family lunch", "the family lunch is next Sunday"),
    ("car registration", "the car registration is due in June"),
    ("plumber visit", "the plumber is coming on Friday"),
    ("concert", "the concert starts at seven"),
    ("school excursion", "the school excursion is next week"),
    ("optician appointment", "the optician appointment is in November"),
    ("barbecue", "the barbecue is at our house"),
    ("spare key", "Alex has the spare key"),
    ("garden work", "the garden needs watering"),
    ("parcel", "the parcel should arrive tomorrow"),
    ("house inspection", "the house inspection moved to Friday"),
    ("sports practice", "Jacob's practice starts at five"),
    ("birthday", "Mum's birthday is in March"),
    ("smoke alarm", "the smoke alarm needs checking"),
    ("electrician", "the electrician will call after lunch"),
    ("family visit", "Mum is visiting in December"),
]


def row(number: int, text: str, intent: str, family: str, boundary: str) -> dict:
    return {
        "id": f"intent-v1.1-{number:04d}",
        "text": text,
        "intent": intent,
        "sensitivity": "ordinary",
        "requires_clarification": intent == "needs_clarification",
        "source": "synthetic",
        "dataset_version": "intent-v1.1",
        "family_id": family,
        "boundary": boundary,
    }


def main() -> None:
    rows: list[dict] = []
    number = 1
    for index, (topic, statement) in enumerate(TOPICS):
        rows.append(row(number, f"Remember that {statement}.", "record_fact", f"bf-record-{index:02d}", "record_fact-record_note")); number += 1
        rows.append(row(number, f"Save this note: {statement.capitalize()}.", "record_note", f"bf-record-{index:02d}", "record_fact-record_note")); number += 1
        rows.append(row(number, f"When is the {topic}?", "query_fact", f"bf-query-{index:02d}", "query_fact-query_note")); number += 1
        rows.append(row(number, f"What did I write about the {topic}?", "query_note", f"bf-query-{index:02d}", "query_fact-query_note")); number += 1
        rows.append(row(number, f"Forget the {topic}.", "forget_fact", f"bf-forget-{index:02d}", "forget_fact-needs_clarification")); number += 1
        rows.append(row(number, f"The {topic}.", "needs_clarification", f"bf-forget-{index:02d}", "forget_fact-needs_clarification")); number += 1
        rows.append(row(number, f"Can you do something about the {topic}?", "needs_clarification", f"bf-clarify-{index:02d}", "needs_clarification-unknown")); number += 1
        rows.append(row(number, f"Please translate the {topic} into Italian.", "unknown", f"bf-clarify-{index:02d}", "needs_clarification-unknown")); number += 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(json.dumps(item, ensure_ascii=False, separators=(",", ":")) + "\n" for item in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} boundary examples")


if __name__ == "__main__":
    main()
