CREATE TABLE note_access_grants (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  grantee_person_id TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL,
  UNIQUE(note_id, grantee_person_id)
);

CREATE TABLE pending_note_shares (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id),
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_note_access_grants_grantee ON note_access_grants(grantee_person_id, created_at);
CREATE INDEX idx_pending_note_shares_owner ON pending_note_shares(owner_person_id, expires_at);
