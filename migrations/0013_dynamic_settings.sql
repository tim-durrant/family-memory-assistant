CREATE TABLE family_settings (
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'positive_integer', 'policy', 'text')),
  updated_by_person_id TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (owner_person_id, setting_key)
);

CREATE INDEX idx_family_settings_owner ON family_settings(owner_person_id, setting_key);
