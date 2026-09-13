CREATE TABLE IF NOT EXISTS pending_whatsapp_links (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  code TEXT NOT NULL UNIQUE,
  proposed_whatsapp_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'proposed', 'confirmed', 'expired', 'cancelled')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  confirmed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_whatsapp_links_owner
  ON pending_whatsapp_links(owner_person_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_whatsapp_links_code
  ON pending_whatsapp_links(code, status, expires_at);
