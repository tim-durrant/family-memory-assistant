CREATE TABLE people (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  whatsapp_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'trusted_contact')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL,
  body TEXT,
  raw_payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE facts (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  statement TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  importance TEXT NOT NULL,
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  effective_date TEXT,
  expiry_date TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  fact_id TEXT REFERENCES facts(id),
  reminder_text TEXT NOT NULL,
  remind_at TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE trusted_contact_permissions (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  trusted_person_id TEXT NOT NULL REFERENCES people(id),
  category TEXT NOT NULL,
  permission TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE whatsapp_adapter_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER
);

CREATE INDEX idx_messages_person_created ON messages(person_id, created_at);
CREATE INDEX idx_facts_person_status ON facts(person_id, status);
CREATE INDEX idx_state_expires_at ON whatsapp_adapter_state(expires_at);
