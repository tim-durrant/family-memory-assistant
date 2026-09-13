CREATE TABLE IF NOT EXISTS permission_change_audit (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  actor_person_id TEXT NOT NULL REFERENCES people(id),
  trusted_person_id TEXT NOT NULL REFERENCES people(id),
  category TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'read_write')),
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permission_change_audit_owner
  ON permission_change_audit(owner_person_id, created_at);
