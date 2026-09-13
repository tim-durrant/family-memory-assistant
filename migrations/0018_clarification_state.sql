CREATE TABLE clarification_state (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  conversation_id TEXT NOT NULL,
  pending_intent TEXT NOT NULL,
  missing_field TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'expired')),
  turn_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX idx_clarification_state_scope
  ON clarification_state(person_id, conversation_id, status, expires_at);
