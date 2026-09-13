ALTER TABLE notes ADD COLUMN pseudonymized_text TEXT;

CREATE TABLE pseudonym_mappings (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  original_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  pseudonym TEXT NOT NULL UNIQUE,
  entity_kind TEXT NOT NULL CHECK (entity_kind IN ('family_subject', 'external_contact', 'person_mention')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_person_id, normalized_name)
);

CREATE INDEX idx_pseudonym_mappings_owner ON pseudonym_mappings(owner_person_id, normalized_name);
