CREATE TABLE message_delivery_status (
  provider_message_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'undelivered', 'failed')),
  error_code TEXT,
  error_message TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (provider_message_id) REFERENCES messages(whatsapp_message_id)
);

CREATE INDEX idx_message_delivery_status_status ON message_delivery_status(status, occurred_at);
