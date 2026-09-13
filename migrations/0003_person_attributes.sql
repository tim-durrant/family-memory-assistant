CREATE TABLE person_attributes (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  valid_from TEXT,
  valid_until TEXT,
  last_change_message_id TEXT REFERENCES messages(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_person_attributes_lookup
  ON person_attributes(person_id, attribute_key, status);
