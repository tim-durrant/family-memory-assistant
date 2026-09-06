import { describe, expect, it, vi } from "vitest";
import { saveInboundMessage } from "../src/index.js";
import type { MessageEvent } from "@dojocoding/whatsapp-sdk";

const event = {
  id: "wamid.valid",
  from: "15550000002",
  timestamp: 1735689600000,
  type: "text",
  body: { text: { body: "MRI results are still pending" } },
} as unknown as MessageEvent;

function database(person: { id: string } | null) {
  const first = vi.fn(async () => person);
  const run = vi.fn(async () => ({ success: true, meta: { changes: 1 } }));
  const statement = { bind: vi.fn(() => ({ first, run })) };
  return { db: { prepare: vi.fn(() => statement) } as never, first, run };
}

describe("inbound persistence", () => {
  it("rejects unknown senders without inserting a message", async () => {
    const { db, run } = database(null);
    await expect(saveInboundMessage(db, event)).resolves.toBe(false);
    expect(run).not.toHaveBeenCalled();
  });

  it("persists a permitted original message", async () => {
    const { db, run } = database({ id: "person-1" });
    await expect(saveInboundMessage(db, event)).resolves.toBe(true);
    expect(run).toHaveBeenCalledOnce();
  });
});
