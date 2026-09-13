"""Expand v1.2 to at least 50 examples per ordinary intent."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

SOURCE = Path("data/synthetic/intents-v1.2.jsonl")
OUTPUT = Path("data/synthetic/intents-v1.3.jsonl")

VARIANTS = ["please", "for me", "thanks", "right now", "if you can"]

TOPICS = [
    "the swimming lesson", "the utility bill", "the family photo", "the library visit",
    "the weekend market", "the school form", "the bus trip", "the birthday cake",
    "the cinema booking", "the garden project", "the football practice", "the grocery order",
]

TEMPLATES = {
    "record_fact": [
        "Remember that {topic} is on Wednesday.",
        "Please save the fact that {topic} starts at four.",
        "Keep in mind that {topic} is next weekend.",
        "Put down that {topic} has been booked.",
        "I want you to remember {topic} is at home.",
        "Record this information: {topic} is due tomorrow.",
    ],
    "query_fact": [
        "When is {topic}?",
        "What date is {topic}?",
        "Can you tell me when {topic} is?",
        "What time does {topic} start?",
        "Look up the saved fact about {topic}.",
        "Do you know the details for {topic}?",
    ],
    "record_note": [
        "Save this note: {topic} needs checking.",
        "Write this down in my notes: ask about {topic}.",
        "Add an entry saying that {topic} was discussed.",
        "Keep a note for me about {topic}.",
        "Please store this note about {topic}: follow up later.",
        "Put the following in my notes: {topic} needs attention.",
    ],
    "query_note": [
        "What did I write about {topic}?",
        "Show me my note about {topic}.",
        "Find the entry mentioning {topic}.",
        "Can you read back what I wrote about {topic}?",
        "Search my notes for {topic}.",
        "Retrieve the note about {topic}.",
    ],
    "resolve_fact": [
        "Mark {topic} as resolved.",
        "Set the {topic} item to complete.",
        "The {topic} is finished, close it.",
        "Resolve the saved fact about {topic}.",
        "The {topic} has been dealt with now.",
        "Please mark {topic} complete.",
    ],
    "forget_fact": [
        "Forget the saved fact about {topic}.",
        "Delete {topic} from memory.",
        "Remove the {topic} detail I saved.",
        "Erase the memory about {topic}.",
        "I want you to forget {topic}.",
        "Take {topic} out of my saved information.",
    ],
    "help": [
        "How do I get started?",
        "Please explain the available actions.",
        "Can you tell me how to use family memory?",
        "Where can I find instructions?",
        "What sorts of things can I ask you to do?",
        "Show me the help options.",
    ],
    "unknown": [
        "Can you order a pizza for me?",
        "What is the tallest mountain?",
        "Please translate this sentence.",
        "Tell me something interesting.",
        "Can you check the news?",
        "I would like to play a game.",
    ],
}


def main() -> None:
    rows = [json.loads(line) for line in SOURCE.read_text(encoding="utf-8").splitlines() if line.strip()]
    counts = Counter(row["intent"] for row in rows)
    next_id = len(rows) + 1
    for intent, templates in TEMPLATES.items():
        needed = max(0, 50 - counts[intent])
        added = 0
        index = 0
        while added < needed:
            if index > needed * 100:
                raise ValueError(f"could not generate {needed} unique examples for {intent}; generated {added}")
            template = templates[index % len(templates)]
            topic = TOPICS[(index // len(templates)) % len(TOPICS)]
            text = template.format(topic=topic)
            if intent in {"help", "unknown"}:
                variant = VARIANTS[index // len(templates)] if index // len(templates) < len(VARIANTS) else f"option {index}"
                text = f"{template} {variant}"
            family = f"v1.3-{intent}-{index % min(6, len(templates)):02d}"
            if not any(row["text"] == text for row in rows):
                rows.append({
                    "id": f"intent-v1.3-{next_id:04d}",
                    "text": text,
                    "intent": intent,
                    "sensitivity": "ordinary",
                    "requires_clarification": False,
                    "source": "synthetic",
                    "dataset_version": "intent-v1.3",
                    "family_id": family,
                    "boundary": "none",
                    "policy_version": "intent-policy-v1.2",
                })
                next_id += 1
                added += 1
            index += 1
    OUTPUT.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples")
    print(dict(Counter(row["intent"] for row in rows)))


if __name__ == "__main__":
    main()
