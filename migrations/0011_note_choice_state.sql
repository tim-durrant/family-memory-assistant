CREATE TABLE pending_note_choices (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  note_ids TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_pending_note_choices_person ON pending_note_choices(person_id, expires_at);
