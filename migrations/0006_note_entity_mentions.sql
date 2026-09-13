CREATE TABLE named_entities (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  entity_kind TEXT NOT NULL DEFAULT 'mention_only' CHECK (entity_kind IN ('mention_only', 'external_contact')),
  created_by_person_id TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE entity_mentions (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES named_entities(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  surface_text TEXT NOT NULL,
  source_start INTEGER NOT NULL,
  source_end INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE pending_entity_clarifications (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES named_entities(id),
  requester_person_id TEXT NOT NULL REFERENCES people(id),
  note_id TEXT NOT NULL REFERENCES notes(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE entity_relationships (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES named_entities(id),
  person_id TEXT NOT NULL REFERENCES people(id),
  relationship_label TEXT NOT NULL,
  source_message_id TEXT NOT NULL REFERENCES messages(id),
  created_at TEXT NOT NULL,
  UNIQUE(entity_id, person_id)
);

CREATE INDEX idx_entity_mentions_note ON entity_mentions(note_id);
CREATE INDEX idx_pending_entity_clarifications_requester ON pending_entity_clarifications(requester_person_id, status, expires_at);
CREATE INDEX idx_entity_relationships_person ON entity_relationships(person_id, relationship_label);
