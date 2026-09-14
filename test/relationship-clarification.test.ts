import { describe, expect, it } from "vitest";
import { buildMemoryReply } from "../src/capabilities/memory.js";

type State = {
  id: string;
  person_id: string;
  conversation_id: string;
  pending_intent: string;
  missing_field: string;
  payload_json: string;
  source_message_id: string;
  status: "pending" | "completed" | "cancelled";
  turn_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

function database(options: { relationship: string; expired?: boolean; turnCount?: number; conversationId?: string }) {
  let state: State | null = {
    id: "clarification-1",
    person_id: "person-1",
    conversation_id: options.conversationId ?? "conversation-1",
    pending_intent: "relationship",
    missing_field: "relationship",
    payload_json: JSON.stringify({ entityId: "entity-1", noteId: "note-1", displayName: "Lorna" }),
    source_message_id: "message-1",
    status: "pending",
    turn_count: options.turnCount ?? 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1_800_000).toISOString(),
  };
  const pendingEntity = { id: "clarification-entity-1", entity_id: "entity-1", display_name: "Lorna", requester_person_id: "person-1", note_id: "note-1" };
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM pending_fact_actions") || sql.includes("FROM pending_note_choices") || sql.includes("FROM pending_note_shares") || sql.includes("FROM person_membership_approvals")) return null as T;
              if (sql.includes("FROM clarification_state")) {
                if (!state || state.status !== "pending" || options.expired || state.person_id !== String(params[0]) || state.conversation_id !== String(params[1])) return null as T;
                return state as T;
              }
              if (sql.includes("FROM pending_entity_clarifications")) return pendingEntity as T;
              return null as T;
            },
            async all<T>() { return { results: [] as T[] }; },
            async run() {
              const now = new Date().toISOString();
              if (sql.includes("SET status = 'completed'")) state = state ? { ...state, status: "completed", updated_at: now } : null;
              if (sql.includes("SET status = 'cancelled'")) state = state ? { ...state, status: "cancelled", updated_at: now } : null;
              if (sql.includes("turn_count = turn_count + 1")) state = state ? { ...state, turn_count: state.turn_count + 1, updated_at: now } : null;
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
  return { db, getState: () => state };
}

describe("relationship clarification", () => {
  it("stores a doctor relationship and completes the clarification", async () => {
    const { db, getState } = database({ relationship: "doctor" });
    await expect(buildMemoryReply(db, "person-1", "message-2", "doctor", undefined, undefined, undefined, "conversation-1"))
      .resolves.toContain("I’ll remember Lorna as doctor locally");
    expect(getState()?.status).toBe("completed");
  });

  it("stores a short custom relationship", async () => {
    const { db, getState } = database({ relationship: "neighbour" });
    await expect(buildMemoryReply(db, "person-1", "message-2", "neighbour", undefined, undefined, undefined, "conversation-1"))
      .resolves.toContain("I’ll remember Lorna as neighbour locally");
    expect(getState()?.status).toBe("completed");
  });

  it("retries invalid answers and cancels after the configured turn limit", async () => {
    const { db, getState } = database({ relationship: "invalid", turnCount: 1 });
    await expect(buildMemoryReply(db, "person-1", "message-2", "This is not a relationship answer", undefined, undefined, undefined, "conversation-1"))
      .resolves.toContain("couldn’t classify Lorna");
    expect(getState()?.status).toBe("cancelled");
  });

  it("keeps relationship clarification pending during help", async () => {
    const { db, getState } = database({ relationship: "help" });
    await expect(buildMemoryReply(db, "person-1", "message-2", "Help please", undefined, undefined, undefined, "conversation-1"))
      .resolves.toMatch(/I can currently:.*still waiting for the relationship/s);
    expect(getState()?.status).toBe("pending");
    expect(getState()?.turn_count).toBe(0);
  });

  it("supports explicit cancellation and protects scope and expiry", async () => {
    const cancelled = database({ relationship: "cancel" });
    await expect(buildMemoryReply(cancelled.db, "person-1", "message-2", "cancel", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("Okay, I cancelled that clarification.");
    expect(cancelled.getState()?.status).toBe("cancelled");

    const wrongConversation = database({ relationship: "scope" });
    await expect(buildMemoryReply(wrongConversation.db, "person-1", "message-2", "doctor", undefined, undefined, undefined, "conversation-2"))
      .resolves.toBeUndefined();
    expect(wrongConversation.getState()?.status).toBe("pending");

    const expired = database({ relationship: "expiry", expired: true });
    await expect(buildMemoryReply(expired.db, "person-1", "message-2", "doctor", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBeUndefined();
    expect(expired.getState()?.status).toBe("pending");
  });
});
