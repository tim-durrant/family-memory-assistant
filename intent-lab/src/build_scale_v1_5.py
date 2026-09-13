"""Build a style-held-out 100-examples-per-intent scale experiment."""

from __future__ import annotations

import json
from pathlib import Path

OUT = Path("data/synthetic/scale-v1.5.jsonl")
INTENTS = {
    "record_fact": [
        "Remember that {topic} is on Wednesday.", "Please save that {topic} starts at four.", "Keep in mind {topic} is next weekend.", "Put down that {topic} has been booked.", "I want you to remember {topic} is at home.", "Record this information: {topic} is due tomorrow.", "Make sure {topic} is in our family memory.", "I should remember that {topic} is confirmed.", "Save the detail that {topic} happens in June.", "Can you keep {topic} on record?",
    ],
    "query_fact": [
        "When is {topic}?", "What date is {topic}?", "Can you tell me when {topic} is?", "What time does {topic} start?", "Look up the saved fact about {topic}.", "Do you know the details for {topic}?", "Which day did we save for {topic}?", "Tell me the date connected with {topic}.", "What is the recorded time for {topic}?", "Can you find the information about {topic}?",
    ],
    "record_note": [
        "Save this note: {topic} needs checking.", "Write this down in my notes: ask about {topic}.", "Add an entry saying that {topic} was discussed.", "Keep a note for me about {topic}.", "Please store this note about {topic}: follow up later.", "Put the following in my notes: {topic} needs attention.", "Make a note of this: {topic} needs checking.", "I want to keep a written note about {topic}.", "Add this to my notes for later: {topic}.", "Record a note saying we discussed {topic}.",
    ],
    "query_note": [
        "What did I write about {topic}?", "Show me my note about {topic}.", "Find the entry mentioning {topic}.", "Can you read back what I wrote about {topic}?", "Search my notes for {topic}.", "Retrieve the note about {topic}.", "What notes do I have concerning {topic}?", "Bring up my writing about {topic}.", "Look through my saved entries for {topic}.", "Read the previous note that mentions {topic}.",
    ],
    "resolve_fact": [
        "Mark {topic} as resolved.", "Set the {topic} item to complete.", "The {topic} is finished, close it.", "Resolve the saved fact about {topic}.", "The {topic} has been dealt with now.", "Please mark {topic} complete.", "Close the {topic} matter.", "The {topic} is no longer pending.", "We have finished with {topic}; resolve it.", "Show {topic} as completed.",
    ],
    "forget_fact": [
        "Forget the saved fact about {topic}.", "Delete {topic} from memory.", "Remove the {topic} detail I saved.", "Erase the memory about {topic}.", "I want you to forget {topic}.", "Take {topic} out of my saved information.", "Please discard the fact about {topic}.", "Get rid of the stored {topic} detail.", "Stop keeping the memory about {topic}.", "Wipe the saved information on {topic}.",
    ],
    "help": [
        "How do I get started?", "Please explain the available actions.", "Can you tell me how to use family memory?", "Where can I find instructions?", "What sorts of things can I ask you to do?", "Show me the help options.", "I need guidance using this assistant.", "What can this service do?", "Explain how I should use the assistant.", "Tell me what commands are available.",
    ],
    "needs_clarification": [
        "The {topic}.", "About the {topic}.", "Can you handle the {topic}?", "Please do something with the {topic}.", "I need help with the {topic}.", "The {topic} tomorrow.", "Remember the {topic}.", "What about the {topic}?", "That {topic} thing.", "Something about the {topic}.",
    ],
    "unknown": [
        "Tell me something interesting.", "What is the tallest mountain?", "Please translate this sentence.", "Can you order a pizza for me?", "What is the weather today?", "I would like to play a game.", "Who invented the telephone?", "Explain how rainbows form.", "Can you check the news?", "Tell me a funny story.",
    ],
}
TOPICS = ["swimming lesson", "utility bill", "family photo", "library visit", "weekend market", "school form", "bus trip", "birthday cake", "cinema booking", "garden project"]
STYLES = ["direct", "polite", "conversational", "indirect", "terse", "informal", "question", "filler", "adversarial", "heldout-natural"]


def style_text(text: str, style: str, intent: str, index: int) -> str:
    if style == "polite": return f"Please, {text[0].lower()}{text[1:]}"
    if style == "conversational": return f"Just so I remember, {text[0].lower()}{text[1:]}"
    if style == "indirect": return f"Could you help me with this: {text[0].lower()}{text[1:]}"
    if style == "terse": return text.replace("Please ", "").replace("Can you ", "").replace("What is ", "When is ")
    if style == "informal": return text.replace("the ", "").replace("Please ", "Can ya ").replace("Could you ", "Can ya ")
    if style == "question": return f"Do you know this one? {text}"
    if style == "filler": return f"Um, {text[0].lower()}{text[1:]} please"
    if style == "adversarial": return f"I am not asking for anything else, but {text[0].lower()}{text[1:]}"
    if style == "heldout-natural": return f"Would you mind if you {text[0].lower()}{text[1:]}"
    return text


def main() -> None:
    rows = []
    number = 1
    for intent, templates in INTENTS.items():
        for style_index, style in enumerate(STYLES):
            for template_index, template in enumerate(templates):
                topic = TOPICS[(style_index + template_index) % len(TOPICS)]
                text = template.format(topic=topic)
                if intent in {"help", "unknown"}:
                    text = template
                text = style_text(text, style, intent, template_index)
                rows.append({
                    "id": f"intent-v1.5-{number:04d}",
                    "text": text,
                    "intent": intent,
                    "sensitivity": "ordinary",
                    "requires_clarification": intent == "needs_clarification",
                    "source": "synthetic",
                    "dataset_version": "intent-v1.5",
                    "family_id": f"scale-{intent}-{style}",
                    "style": style,
                    "boundary": "scale-adversarial" if style == "adversarial" else "none",
                    "policy_version": "intent-policy-v1.2",
                })
                number += 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples")


if __name__ == "__main__":
    main()
