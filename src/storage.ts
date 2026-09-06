export interface D1Storage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  setIfAbsent<T>(key: string, value: T, ttlMs: number): Promise<boolean>;
  delete(key: string): Promise<void>;
  cleanupExpired(): Promise<void>;
}

/** D1 implementation used by Dojo's webhook deduper and window tracker. */
export class D1Adapter implements D1Storage {
  constructor(private readonly db: D1Database) {}

  async get<T>(key: string): Promise<T | undefined> {
    const row = await this.db
      .prepare("SELECT value, expires_at FROM whatsapp_adapter_state WHERE key = ?1")
      .bind(key)
      .first<{ value: string; expires_at: number | null }>();

    if (!row) return undefined;
    if (row.expires_at !== null && row.expires_at <= Date.now()) {
      await this.delete(key);
      return undefined;
    }
    return JSON.parse(row.value) as T;
  }

  async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    await this.db
      .prepare(
        `INSERT INTO whatsapp_adapter_state (key, value, expires_at)
         VALUES (?1, ?2, ?3)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
      )
      .bind(key, JSON.stringify(value), expiresAt)
      .run();
  }

  async setIfAbsent<T>(key: string, value: T, ttlMs: number): Promise<boolean> {
    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    // The delete and INSERT ... DO NOTHING run as one D1 write batch. This
    // makes expired keys reusable while preserving atomic first-writer wins.
    const results = await this.db.batch([
      this.db
        .prepare(
          "DELETE FROM whatsapp_adapter_state WHERE key = ?1 AND expires_at IS NOT NULL AND expires_at <= ?2",
        )
        .bind(key, Date.now()),
      this.db
        .prepare(
          `INSERT INTO whatsapp_adapter_state (key, value, expires_at)
           VALUES (?1, ?2, ?3)
           ON CONFLICT(key) DO NOTHING`,
        )
        .bind(key, JSON.stringify(value), expiresAt),
    ]);
    return (results[1]?.meta.changes ?? 0) === 1;
  }

  async delete(key: string): Promise<void> {
    await this.db.prepare("DELETE FROM whatsapp_adapter_state WHERE key = ?1").bind(key).run();
  }

  async cleanupExpired(): Promise<void> {
    await this.db
      .prepare("DELETE FROM whatsapp_adapter_state WHERE expires_at IS NOT NULL AND expires_at <= ?1")
      .bind(Date.now())
      .run();
  }
}
