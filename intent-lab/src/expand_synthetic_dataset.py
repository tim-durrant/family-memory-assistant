"""Append reviewed synthetic seed examples to the intent-v1 corpus once."""

from __future__ import annotations

import json
from pathlib import Path

DATASET = Path("data/synthetic/intents-v1.jsonl")

ADDITIONS: dict[str, list[tuple[str, str]]] = {
    "record_fact": [
        ("record-fact-command", "Remember my library book is due back on Monday."),
        ("record-fact-command", "Please put down that the bins go out tomorrow."),
        ("record-fact-command", "Save the Wi-Fi technician visit for 18 November 2026."),
        ("record-fact-conversation", "Just so I don't forget, Jacob's practice is at five."),
        ("record-fact-conversation", "Keep this in the family memory: the gate code changed."),
        ("record-fact-conversation", "I should remember that the concert starts at seven."),
        ("record-fact-event", "The school excursion is happening next Friday."),
        ("record-fact-event", "Mum is visiting us on 9 December 2026."),
        ("record-fact-event", "Our annual check-in is booked for 14 January 2027."),
        ("record-fact-command", "Add a reminder in memory that milk is needed tonight."),
        ("record-fact-conversation", "Can you hold onto the fact that Jacob won his game?"),
        ("record-fact-event", "The family lunch will be at noon on Sunday."),
        ("record-fact-command", "Record that the spare key is with Alex."),
        ("record-fact-conversation", "Don't let me forget that the tickets are in the drawer."),
    ],
    "query_fact": [
        ("query-fact-when", "Could you tell me the date of my library return?"),
        ("query-fact-when", "When does Jacob's practice start?"),
        ("query-fact-when", "What day is the family lunch?"),
        ("query-fact-topic", "Search memory for the Wi-Fi technician visit."),
        ("query-fact-topic", "What have I saved about the gate code?"),
        ("query-fact-topic", "Look up the detail about the spare key."),
        ("query-fact-conversation", "Do you remember when Mum is visiting?"),
        ("query-fact-when", "When are the concert tickets needed?"),
        ("query-fact-topic", "Find my saved information about the school excursion."),
        ("query-fact-when", "What time does the family lunch begin?"),
        ("query-fact-topic", "Can you retrieve the fact about Alex and the key?"),
        ("query-fact-when", "Tell me the date of the annual check-in."),
        ("query-fact-topic", "What did I save about the bins?"),
        ("query-fact-when", "Which day is Jacob's soccer practice?"),
    ],
    "record_note": [
        ("record-note-explicit", "Save this note: ask Alex about the garden tools."),
        ("record-note-explicit", "Store this note: the parcel should arrive after lunch."),
        ("record-note-explicit", "Remember this note: bring a hat to the excursion."),
        ("record-note-request", "Could you keep the following note for me: check the pantry."),
        ("record-note-request", "Please add this entry to my notes: call the electrician."),
        ("record-note-request", "I would like to save a note saying the meeting moved rooms."),
        ("record-note-content", "Note for later: Jacob needs his sports shoes tomorrow."),
        ("record-note-content", "Write this down in my notes: compare the two quotes."),
        ("record-note-content", "Keep a record of this note: the spare batteries are upstairs."),
        ("record-note-explicit", "Save the note that the dog has a grooming appointment."),
        ("record-note-request", "Put this into my notes please: ask about parking."),
        ("record-note-content", "Add to my notes: the house inspection was postponed."),
        ("record-note-explicit", "Store this note for me: buy envelopes before Friday."),
        ("record-note-request", "Can you make a note that the meeting is online?"),
    ],
    "query_note": [
        ("query-note-day", "Show me everything I wrote today."),
        ("query-note-day", "What notes did I make earlier today?"),
        ("query-note-day", "Retrieve my notes from 14 October 2026."),
        ("query-note-latest", "Read my most recent note."),
        ("query-note-latest", "What was the last entry I saved?"),
        ("query-note-latest", "Bring back my newest note."),
        ("query-note-topic", "Find my notes about the garden tools."),
        ("query-note-topic", "Show the note mentioning the electrician."),
        ("query-note-topic", "Search my notes for the house inspection."),
        ("query-note-day", "Can I see what I wrote on Monday?"),
        ("query-note-latest", "Please retrieve my latest saved entry."),
        ("query-note-topic", "Look through my notes for parking."),
        ("query-note-day", "What did I write earlier this week?"),
        ("query-note-topic", "Read back the note about the parcel."),
    ],
    "resolve_fact": [
        ("resolve-fact-command", "Mark the library return as resolved."),
        ("resolve-fact-command", "Please set the gate-code item to resolved."),
        ("resolve-fact-command", "Resolve the fact about the school excursion."),
        ("resolve-fact-status", "The bins have gone out, so close that item."),
        ("resolve-fact-status", "Jacob's practice is finished; mark it complete."),
        ("resolve-fact-status", "The technician visit is sorted now."),
        ("resolve-fact-conversation", "You can consider the concert matter resolved."),
        ("resolve-fact-conversation", "That appointment has been dealt with; close it."),
        ("resolve-fact-conversation", "I no longer need the reminder about the lunch."),
        ("resolve-fact-command", "Set the spare-key fact as resolved."),
        ("resolve-fact-status", "The school meeting is done, please close it."),
        ("resolve-fact-conversation", "The library book was returned, so resolve that."),
        ("resolve-fact-command", "Can you mark the annual check-in complete?"),
        ("resolve-fact-status", "The gate-code issue is now sorted."),
    ],
    "forget_fact": [
        ("forget-fact-command", "Forget the saved detail about the library book."),
        ("forget-fact-command", "Delete the fact about Jacob's practice."),
        ("forget-fact-command", "Remove the gate-code memory."),
        ("forget-fact-conversation", "I don't want the school excursion detail anymore."),
        ("forget-fact-conversation", "Please take the technician visit out of memory."),
        ("forget-fact-conversation", "Erase what I saved about the family lunch."),
        ("forget-fact-command", "Get rid of the old bins reminder."),
        ("forget-fact-command", "Can you delete my spare-key fact?"),
        ("forget-fact-conversation", "That concert information is no longer useful; remove it."),
        ("forget-fact-command", "Forget the annual check-in date."),
        ("forget-fact-conversation", "Please wipe the saved note about Mum's visit."),
        ("forget-fact-command", "Remove my saved information about the tickets."),
        ("forget-fact-conversation", "I want that appointment memory gone."),
        ("forget-fact-command", "Delete the old school meeting fact."),
    ],
    "help": [
        ("help-direct", "Help me."),
        ("help-direct", "I need some help using this."),
        ("help-direct", "Could you give me help?"),
        ("help-how", "How can this assistant help me?"),
        ("help-how", "How does family memory work?"),
        ("help-how", "Where do I start with this?"),
        ("help-available", "Which actions are available?"),
        ("help-available", "What features can I use?"),
        ("help-available", "Show me the things you understand."),
        ("help-how", "How do I save something for later?"),
        ("help-direct", "Can you explain how to use the assistant?"),
        ("help-available", "What can you do for the family?"),
        ("help-how", "Please show me how this works."),
        ("help-available", "Tell me the available options."),
    ],
    "needs_clarification": [
        ("clarification-fragment", "Jacob's soccer."),
        ("clarification-fragment", "The appointment."),
        ("clarification-fragment", "For later."),
        ("clarification-ambiguous", "Can you keep that?"),
        ("clarification-ambiguous", "What about the dentist?"),
        ("clarification-ambiguous", "Please deal with Jacob's game."),
        ("clarification-ambiguous", "The thing we discussed yesterday."),
        ("clarification-ambiguous", "I need something saved."),
        ("clarification-ambiguous", "Can you do something about the appointment?"),
        ("clarification-fragment", "The soccer game tomorrow."),
        ("clarification-ambiguous", "Do you know about Mum's visit?"),
        ("clarification-ambiguous", "That old memory."),
        ("clarification-fragment", "Remember the plumber."),
        ("clarification-ambiguous", "Can you find that one?"),
    ],
    "unknown": [
        ("unknown-unrelated", "Tell me a funny story."),
        ("unknown-unrelated", "What is the capital of France?"),
        ("unknown-unrelated", "Will it rain this afternoon?"),
        ("unknown-unsupported", "Please send a message to Jacob."),
        ("unknown-unsupported", "Can you book me a table?"),
        ("unknown-unsupported", "Translate this into Italian."),
        ("unknown-conversation", "I am feeling cheerful today."),
        ("unknown-conversation", "That was a lovely afternoon."),
        ("unknown-conversation", "Good night, assistant."),
        ("unknown-unsupported", "Can you make a photograph?"),
        ("unknown-unrelated", "Who won the game last night?"),
        ("unknown-unsupported", "Please call the electrician."),
        ("unknown-conversation", "I wonder what tomorrow will bring."),
        ("unknown-unrelated", "Explain how a bicycle works."),
    ],
}


def main() -> None:
    rows = [json.loads(line) for line in DATASET.read_text(encoding="utf-8").splitlines() if line.strip()]
    existing = {row["text"] for row in rows}
    next_id = len(rows) + 1
    for intent, examples in ADDITIONS.items():
        for family_id, text in examples:
            if text in existing:
                continue
            rows.append({
                "id": f"intent-v1-{next_id:04d}",
                "text": text,
                "intent": intent,
                "sensitivity": "ordinary",
                "requires_clarification": intent == "needs_clarification",
                "source": "synthetic",
                "dataset_version": "intent-v1",
                "family_id": family_id,
            })
            existing.add(text)
            next_id += 1
    DATASET.write_text("".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows), encoding="utf-8")
    print(f"Wrote {len(rows)} examples")


if __name__ == "__main__":
    main()
