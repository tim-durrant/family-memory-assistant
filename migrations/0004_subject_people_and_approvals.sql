ALTER TABLE people ADD COLUMN membership_status TEXT NOT NULL DEFAULT 'approved' CHECK (membership_status IN ('pending', 'approved', 'declined'));
ALTER TABLE people ADD COLUMN is_sender INTEGER NOT NULL DEFAULT 1 CHECK (is_sender IN (0, 1));
ALTER TABLE people ADD COLUMN created_by_person_id TEXT REFERENCES people(id);

CREATE INDEX idx_people_display_name ON people(active, display_name);

CREATE TABLE person_membership_approvals (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  voter_person_id TEXT NOT NULL REFERENCES people(id),
  decision TEXT NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending', 'approved', 'declined')),
  source_message_id TEXT REFERENCES messages(id),
  decided_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(person_id, voter_person_id)
);

CREATE INDEX idx_person_membership_approvals_voter
  ON person_membership_approvals(voter_person_id, decision);
