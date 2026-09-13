ALTER TABLE emergency_delivery_attempts RENAME TO emergency_delivery_attempts_legacy;

CREATE TABLE emergency_delivery_attempts (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES emergency_alerts(id),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  recipient_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'simulated')),
  provider_message_id TEXT,
  error TEXT,
  created_at TEXT NOT NULL
);

INSERT INTO emergency_delivery_attempts
  (id, alert_id, channel, recipient_phone, status, provider_message_id, error, created_at)
SELECT id, alert_id, channel, recipient_phone, status, provider_message_id, error, created_at
FROM emergency_delivery_attempts_legacy;

DROP TABLE emergency_delivery_attempts_legacy;
