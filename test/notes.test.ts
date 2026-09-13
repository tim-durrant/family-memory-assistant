import { describe, expect, it } from "vitest";
import { buildMemoryReply } from "../src/capabilities/memory.js";

type Note = {
  id: string;
  person_id: string;
  note_type: string;
  original_text: string;
  pseudonymized_text: string | null;
  source_message_id: string;
  event_date: string | null;
  created_at: string;
  updated_at: string;
};

function database() {
  const notes: Note[] = [];
  let pendingChoice: { id: string; person_id: string; note_ids: string; created_at: string; expires_at: string } | null = null;
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM pending_fact_actions") || sql.includes("FROM person_membership_approvals")) return null as T;
              if (sql.includes("FROM pending_note_choices")) return pendingChoice as T;
              return null as T;
            },
            async all<T>() {
              if (sql.includes("FROM notes")) return { results: notes as T[] };
              return { results: [] as T[] };
            },
            async run() {
              if (sql.includes("INSERT INTO pending_note_choices")) {
                pendingChoice = { id: String(params[0]), person_id: String(params[1]), note_ids: String(params[2]), created_at: String(params[3]), expires_at: String(params[4]) };
              }
              if (sql.includes("DELETE FROM pending_note_choices")) pendingChoice = null;
              if (sql.includes("INSERT INTO notes")) {
                const now = new Date().toISOString();
                notes.unshift({
                  id: String(params[0]),
                  person_id: String(params[1]),
                  note_type: String(params[2]),
                  original_text: String(params[3]),
                  pseudonymized_text: String(params[4]),
                  source_message_id: String(params[5]),
                  event_date: null,
                  created_at: now,
                  updated_at: now,
                });
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
    async batch(statements: Array<{ run: () => Promise<unknown> }>) {
      for (const statement of statements) await statement.run();
      return [];
    },
  } as unknown as D1Database;
  return { db, notes };
}

describe("long-form notes", () => {
  it("stores and retrieves the exact note text for the authenticated sender", async () => {
    const { db, notes } = database();
    const text = "Save this note: My symptoms included headaches,\nsevere cramps and numbness in my legs.";

    await expect(buildMemoryReply(db, "person-1", "message-1", text))
      .resolves.toBe("I have saved the note for you. Save for anyone else?");
    await buildMemoryReply(db, "person-1", "message-1b", "no");
    await expect(buildMemoryReply(db, "person-1", "message-2", "What did I write today?"))
      .resolves.toBe("My symptoms included headaches,\nsevere cramps and numbness in my legs.");
    expect(notes[0].original_text).toBe("My symptoms included headaches,\nsevere cramps and numbness in my legs.");
    expect(notes[0].source_message_id).toBe("message-1");
  });

  it("retrieves the latest note without exposing another sender's notes", async () => {
    const { db } = database();
    await buildMemoryReply(db, "person-1", "message-1", "Save this note: First note");
    await buildMemoryReply(db, "person-1", "message-1b", "no");
    await expect(buildMemoryReply(db, "person-1", "message-2", "Show me my latest note"))
      .resolves.toBe("First note");
  });

  it("lists same-day notes and retrieves the selected exact note", async () => {
    const { db } = database();
    await buildMemoryReply(db, "person-1", "message-1", "Save this note: First note");
    await buildMemoryReply(db, "person-1", "message-1b", "no");
    await buildMemoryReply(db, "person-1", "message-2", "Save this note: Second note");
    await buildMemoryReply(db, "person-1", "message-2b", "no");

    await expect(buildMemoryReply(db, "person-1", "message-3", "What did I write today?"))
      .resolves.toMatch(/1\..*\n2\./s);
    await expect(buildMemoryReply(db, "person-1", "message-4", "1"))
      .resolves.toBe("Second note");
  });
});
