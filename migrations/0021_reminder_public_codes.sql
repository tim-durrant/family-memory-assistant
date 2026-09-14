ALTER TABLE reminders ADD COLUMN public_code TEXT;

CREATE UNIQUE INDEX idx_reminders_person_public_code
  ON reminders(person_id, public_code)
  WHERE public_code IS NOT NULL;
