-- The initial schema had an unused reminders table with a smaller shape.
-- Preserve it as a compatibility archive while moving to the deterministic model.
ALTER TABLE reminders RENAME TO reminders_legacy;

CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  source_message_id TEXT REFERENCES messages(id),
  reminder_text TEXT NOT NULL,
  due_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'sent', 'failed', 'cancelled')),
  claim_token TEXT,
  claimed_at TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO reminders
  (id, person_id, source_message_id, reminder_text, due_at, timezone, status, created_at, updated_at)
SELECT id, person_id, NULL, reminder_text, remind_at, 'UTC',
       CASE WHEN lower(status) IN ('completed', 'sent') THEN 'sent' ELSE 'pending' END,
       created_at, COALESCE(completed_at, created_at)
FROM reminders_legacy;

CREATE INDEX idx_reminders_due ON reminders(status, due_at);
CREATE INDEX idx_reminders_person ON reminders(person_id, status, due_at);
