CREATE UNIQUE INDEX IF NOT EXISTS uq_trusted_contact_permissions_scope
  ON trusted_contact_permissions(owner_person_id, trusted_person_id, category);
