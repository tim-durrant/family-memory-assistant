CREATE TABLE redaction_mappings (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  original_value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  redaction_token TEXT NOT NULL UNIQUE,
  redaction_kind TEXT NOT NULL CHECK (redaction_kind IN ('email', 'phone', 'medical_identifier', 'address', 'location')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_person_id, normalized_value, redaction_kind)
);

CREATE INDEX idx_redaction_mappings_owner ON redaction_mappings(owner_person_id, redaction_kind);
