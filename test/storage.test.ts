import { describe, expect, it, vi } from "vitest";
import { D1Adapter } from "../src/storage.js";

function mockDatabase(changes = 1) {
  const run = vi.fn(async () => ({ success: true, meta: { changes } }));
  const prepare = vi.fn(() => ({ bind: vi.fn(() => ({ run, first: vi.fn() })) }));
  const rawDb = { prepare, batch: vi.fn(async () => [{ meta: { changes: 1 } }, { meta: { changes } }]) };
  return { db: rawDb as unknown as D1Database, prepare, run };
}

describe("D1Adapter", () => {
  it("uses atomic INSERT ... ON CONFLICT DO NOTHING for setIfAbsent", async () => {
    const { db, prepare } = mockDatabase(1);
    const storage = new D1Adapter(db);

    await expect(storage.setIfAbsent("msg:wamid", true, 60_000)).resolves.toBe(true);
    expect(db.batch).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining("ON CONFLICT(key) DO NOTHING"));
  });

  it("reports false when another writer already inserted the key", async () => {
    const { db } = mockDatabase(0);
    await expect(new D1Adapter(db).setIfAbsent("duplicate", true, 60_000)).resolves.toBe(false);
  });
});
