ALTER TABLE facts ADD COLUMN last_change_message_id TEXT REFERENCES messages(id);

CREATE TABLE pending_fact_actions (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  action TEXT NOT NULL CHECK (action IN ('replace', 'forget')),
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  existing_fact_id TEXT REFERENCES facts(id),
  statement TEXT,
  category TEXT,
  status TEXT,
  importance TEXT,
  effective_date TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_pending_fact_actions_person_expiry
  ON pending_fact_actions(person_id, expires_at);
