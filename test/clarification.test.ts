import { describe, expect, it } from "vitest";
import { buildMemoryReply } from "../src/capabilities/memory.js";

type Fact = {
  id: string;
  statement: string;
  category: string;
  status: string;
  importance: string;
  effective_date: string | null;
};

type Clarification = {
  id: string;
  person_id: string;
  conversation_id: string;
  pending_intent: string;
  missing_field: string;
  payload_json: string;
  source_message_id: string;
  status: "pending" | "completed" | "cancelled" | "expired";
  turn_count: number;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

function database(options: { expired?: boolean; emergency?: boolean } = {}) {
  const facts: Fact[] = [];
  let clarification: Clarification | null = null;
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM pending_fact_actions") || sql.includes("FROM pending_note_choices") || sql.includes("FROM pending_note_shares") || sql.includes("FROM pending_entity_clarifications") || sql.includes("FROM person_membership_approvals")) return null as T;
              if (sql.includes("FROM clarification_state")) {
                if (!clarification || clarification.person_id !== String(params[0]) || clarification.conversation_id !== String(params[1]) || clarification.status !== "pending" || options.expired || clarification.expires_at <= new Date().toISOString()) return null as T;
                return clarification as T;
              }
              if (sql.includes("FROM pending_emergency_setups")) return null as T;
              if (sql.includes("FROM emergency_settings")) {
                if (!options.emergency) return null as T;
                const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sos"));
                const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
                return { safe_word_hash: hash } as T;
              }
              return null as T;
            },
            async all<T>() {
              if (sql.includes("FROM facts")) return { results: facts as T[] };
              if (sql.includes("FROM emergency_contacts")) return { results: [{ id: "contact-1", phone_number: "+61400123456", label: "trusted" }] as T[] };
              return { results: [] as T[] };
            },
            async run() {
              const now = new Date().toISOString();
              if (sql.includes("INSERT INTO facts")) {
                facts.push({ id: String(params[0]), statement: String(params[2]), category: String(params[3]), status: String(params[4]), importance: String(params[5]), effective_date: params[7] as string | null });
              }
              if (sql.includes("INSERT INTO clarification_state")) {
                clarification = { id: String(params[0]), person_id: String(params[1]), conversation_id: String(params[2]), pending_intent: String(params[3]), missing_field: String(params[4]), payload_json: String(params[5]), source_message_id: String(params[6]), status: "pending", turn_count: 0, created_at: String(params[7]), updated_at: String(params[7]), expires_at: String(params[8]) };
              }
              if (sql.includes("SET status = 'cancelled'")) {
                if (clarification) clarification = { ...clarification, status: "cancelled", updated_at: now };
              }
              if (sql.includes("SET status = 'completed'")) {
                if (clarification) clarification = { ...clarification, status: "completed", updated_at: now };
              }
              if (sql.includes("turn_count = turn_count + 1")) {
                if (clarification) clarification = { ...clarification, turn_count: clarification.turn_count + 1, updated_at: now };
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
  return { db, facts, getClarification: () => clarification };
}

describe("persisted clarification state", () => {
  it("allows an emergency safe word to interrupt without clearing clarification", async () => {
    const { db, getClarification } = database({ emergency: true });
    await buildMemoryReply(db, "person-1", "message-0", "My appointment is on 3 March", undefined, undefined, undefined, "conversation-1");
    const trigger = async () => ({ whatsappSent: true, smsSent: true });
    await expect(buildMemoryReply(db, "person-1", "message-1", "sos", undefined, undefined, trigger, "conversation-1"))
      .resolves.toBe("Your trusted contacts have been notified by WhatsApp and SMS.");
    expect(getClarification()?.status).toBe("pending");
  });

  it("persists an incomplete fact and completes it with a valid year", async () => {
    const { db, facts, getClarification } = database();
    await expect(buildMemoryReply(db, "person-1", "message-1", "My driving test is on 12 October", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("Saved: My driving test is on 12 October. What year should I use?");
    expect(facts).toHaveLength(0);
    expect(getClarification()?.missing_field).toBe("year");

    await expect(buildMemoryReply(db, "person-1", "message-2", "2026", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("Saved: My driving test is on 12 October.");
    expect(facts).toHaveLength(1);
    expect(facts[0].effective_date).toBe("2026-10-12");
    expect(getClarification()?.status).toBe("completed");
  });

  it("keeps the state for invalid input and cancels explicitly", async () => {
    const { db, facts, getClarification } = database();
    await buildMemoryReply(db, "person-1", "message-1", "My appointment is on 3 March", undefined, undefined, undefined, "conversation-1");
    await expect(buildMemoryReply(db, "person-1", "message-2", "next week", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("Please reply with the four-digit year, or say cancel.");
    expect(facts).toHaveLength(0);
    expect(getClarification()?.turn_count).toBe(1);
    await expect(buildMemoryReply(db, "person-1", "message-3", "cancel", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("Okay, I cancelled that clarification.");
    expect(getClarification()?.status).toBe("cancelled");
  });

  it("does not consume missing-year clarification for help or another supported request", async () => {
    const { db, facts, getClarification } = database();
    await buildMemoryReply(db, "person-1", "message-1", "My appointment is on 3 March", undefined, undefined, undefined, "conversation-1");

    await expect(buildMemoryReply(db, "person-1", "message-2", "How do I save a note?", undefined, undefined, undefined, "conversation-1"))
      .resolves.toMatch(/I can currently:.*four-digit year/s);
    expect(getClarification()?.turn_count).toBe(0);
    expect(facts).toHaveLength(0);

    await expect(buildMemoryReply(db, "person-1", "message-3", "When is my appointment?", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("I’m still waiting for the four-digit year. Reply with the year, or say cancel.");
    expect(getClarification()?.turn_count).toBe(0);
    expect(facts).toHaveLength(0);
  });

  it("does not consume an ambiguous fact choice for another supported request", async () => {
    const { db, facts, getClarification } = database();
    facts.push(
      { id: "fact-1", statement: "Dentist appointment on 12 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: "2026-10-12" },
      { id: "fact-2", statement: "Hospital appointment on 18 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: "2026-10-18" },
    );
    await buildMemoryReply(db, "person-1", "message-1", "When is my appointment?", undefined, undefined, undefined, "conversation-1");
    await expect(buildMemoryReply(db, "person-1", "message-2", "My new appointment is on 20 November 2026", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBe("I’m still waiting for the number of the fact you mean. Reply with a number, or say cancel.");
    expect(getClarification()?.turn_count).toBe(0);
    expect(facts).toHaveLength(2);
  });

  it("persists numbered fact choices and returns only the selected fact", async () => {
    const { db, facts, getClarification } = database();
    facts.push(
      { id: "fact-1", statement: "Dentist appointment on 12 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: "2026-10-12" },
      { id: "fact-2", statement: "Hospital appointment on 18 October", category: "appointment", status: "confirmed", importance: "normal", effective_date: "2026-10-18" },
    );
    await expect(buildMemoryReply(db, "person-1", "message-1", "When is my appointment?", undefined, undefined, undefined, "conversation-1"))
      .resolves.toMatch(/1\..*Dentist.*2\..*Hospital/s);
    expect(getClarification()?.missing_field).toBe("fact_choice");
    await expect(buildMemoryReply(db, "person-1", "message-2", "2", undefined, undefined, undefined, "conversation-1"))
      .resolves.toContain("Hospital appointment");
    expect(getClarification()?.status).toBe("completed");
  });

  it("does not expose clarification state across conversations or expired state", async () => {
    const first = database();
    await buildMemoryReply(first.db, "person-1", "message-1", "My appointment is on 3 March", undefined, undefined, undefined, "conversation-1");
    await expect(buildMemoryReply(first.db, "person-1", "message-2", "2026", undefined, undefined, undefined, "conversation-2"))
      .resolves.toBeUndefined();
    expect(first.facts).toHaveLength(0);

    const expired = database({ expired: true });
    await buildMemoryReply(expired.db, "person-1", "message-1", "My appointment is on 3 March", undefined, undefined, undefined, "conversation-1");
    await expect(buildMemoryReply(expired.db, "person-1", "message-2", "2026", undefined, undefined, undefined, "conversation-1"))
      .resolves.toBeUndefined();
    expect(expired.facts).toHaveLength(0);
  });
});
