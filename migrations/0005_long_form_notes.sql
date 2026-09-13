CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  note_type TEXT NOT NULL DEFAULT 'general',
  original_text TEXT NOT NULL,
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  event_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_notes_person_created ON notes(person_id, created_at);
CREATE INDEX idx_notes_person_event_date ON notes(person_id, event_date);
