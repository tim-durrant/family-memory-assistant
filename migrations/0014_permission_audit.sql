CREATE TABLE IF NOT EXISTS trusted_contact_permissions (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  trusted_person_id TEXT NOT NULL REFERENCES people(id),
  category TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'read_write')),
  created_at TEXT NOT NULL,
  UNIQUE(owner_person_id, trusted_person_id, category)
);

CREATE INDEX IF NOT EXISTS idx_trusted_contact_permissions_lookup
  ON trusted_contact_permissions(owner_person_id, trusted_person_id, category);

CREATE TABLE IF NOT EXISTS permission_audit (
  id TEXT PRIMARY KEY,
  requester_person_id TEXT NOT NULL REFERENCES people(id),
  capability TEXT NOT NULL,
  target_person_id TEXT,
  category TEXT,
  allowed INTEGER NOT NULL CHECK (allowed IN (0, 1)),
  reason TEXT NOT NULL,
  policy_source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_requester ON permission_audit(requester_person_id, created_at);
