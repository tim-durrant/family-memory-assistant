export type FamilySetting = {
  setting_key: string;
  setting_value: string;
  value_type: "boolean" | "positive_integer" | "policy" | "text";
};

export async function listFamilySettings(db: D1Database, ownerPersonId: string): Promise<FamilySetting[]> {
  const result = await db.prepare(
    `SELECT setting_key, setting_value, value_type
     FROM family_settings WHERE owner_person_id = ?1 ORDER BY setting_key`,
  ).bind(ownerPersonId).all<FamilySetting>();
  return result.results;
}

export async function setFamilySetting(
  db: D1Database,
  ownerPersonId: string,
  updatedByPersonId: string,
  settingKey: string,
  settingValue: string,
  valueType: FamilySetting["value_type"],
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO family_settings
     (owner_person_id, setting_key, setting_value, value_type, updated_by_person_id, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
     ON CONFLICT(owner_person_id, setting_key) DO UPDATE SET
       setting_value = excluded.setting_value,
       value_type = excluded.value_type,
       updated_by_person_id = excluded.updated_by_person_id,
       updated_at = excluded.updated_at`,
  ).bind(ownerPersonId, settingKey, settingValue, valueType, updatedByPersonId, now).run();
}
