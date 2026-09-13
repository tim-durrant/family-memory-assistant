CREATE TABLE emergency_contacts (
  id TEXT PRIMARY KEY,
  owner_person_id TEXT NOT NULL REFERENCES people(id),
  phone_number TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(owner_person_id, phone_number)
);

CREATE TABLE emergency_settings (
  person_id TEXT PRIMARY KEY REFERENCES people(id),
  safe_word_hash TEXT,
  safe_word_status TEXT NOT NULL DEFAULT 'unset' CHECK (safe_word_status IN ('unset', 'pending', 'active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE pending_emergency_setups (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  setup_kind TEXT NOT NULL CHECK (setup_kind IN ('contact', 'safe_word')),
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE emergency_alerts (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  trigger_message_id TEXT NOT NULL REFERENCES messages(id),
  created_at TEXT NOT NULL,
  UNIQUE(person_id, trigger_message_id)
);

CREATE TABLE emergency_delivery_attempts (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES emergency_alerts(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_emergency_contacts_owner_status ON emergency_contacts(owner_person_id, status);
CREATE INDEX idx_pending_emergency_setups_person ON pending_emergency_setups(person_id, expires_at);
