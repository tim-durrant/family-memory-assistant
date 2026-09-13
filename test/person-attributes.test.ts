import { describe, expect, it } from "vitest";
import { buildMemoryReply } from "../src/capabilities/memory.js";

type Attribute = {
  id: string;
  person_id: string;
  attribute_key: string;
  attribute_value: string;
  normalized_value: string;
  status: string;
  source_message_id: string;
  valid_until: string | null;
};

function database(person: { id: string; display_name: string; membership_status: "pending" | "approved" | "declined" } | null = { id: "person-melody", display_name: "Melody", membership_status: "approved" }) {
  const attributes: Attribute[] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM pending_fact_actions")) return null as T;
              if (sql.includes("FROM people")) return person as T;
              return null as T;
            },
            async all<T>() {
              if (sql.includes("FROM person_attributes")) return { results: attributes as T[] };
              return { results: [] as T[] };
            },
            async run() {
              if (sql.includes("INSERT INTO person_attributes")) {
                attributes.push({
                  id: String(params[0]),
                  person_id: String(params[1]),
                  attribute_key: String(params[2]),
                  attribute_value: String(params[3]),
                  normalized_value: String(params[4]),
                  status: "active",
                  source_message_id: String(params[5]),
                  valid_until: null,
                });
              }
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, attributes };
}

describe("person attribute capability", () => {
  it("saves an explicit attribute and answers a descriptive query", async () => {
    const { db, attributes } = database();

    await expect(buildMemoryReply(db, "person-melody", "message-1", "Melody has long hair"))
      .resolves.toBe("Saved: Melody has long hair.");
    await expect(buildMemoryReply(db, "person-melody", "message-2", "What hair does Melody have?"))
      .resolves.toBe("Melody has long hair.");
    expect(attributes).toHaveLength(1);
    expect(attributes[0].source_message_id).toBe("message-1");
  });

  it("is idempotent and refuses a conflicting value", async () => {
    const { db, attributes } = database();

    await buildMemoryReply(db, "person-melody", "message-1", "Melody has long hair");
    await expect(buildMemoryReply(db, "person-melody", "message-2", "Melody has long hair"))
      .resolves.toBe("I already have that recorded: Melody has long hair.");
    await expect(buildMemoryReply(db, "person-melody", "message-3", "Melody has short hair"))
      .resolves.toBe("I have conflicting information about Melody's hair. Which value should I keep?");
    expect(attributes).toHaveLength(1);
  });

  it("understands natural eye-colour questions without treating them as facts", async () => {
    const { db, attributes } = database();
    await expect(buildMemoryReply(db, "person-owner", "message-1", "Melody has blue eyes"))
      .resolves.toBe("Saved: Melody has blue eyes.");
    await expect(buildMemoryReply(db, "person-owner", "message-2", "What colour are Melody’s eyes?"))
      .resolves.toBe("Melody has blue eyes.");
    await expect(buildMemoryReply(db, "person-owner", "message-3", "What are Melodys eyes"))
      .resolves.toBe("Melody has blue eyes.");
    expect(attributes[0].attribute_key).toBe("eye_colour");
  });

  it("answers a requested value cautiously when it differs from the record", async () => {
    const { db } = database();
    await buildMemoryReply(db, "person-melody", "message-1", "Melody has long hair");

    await expect(buildMemoryReply(db, "person-melody", "message-2", "Does Melody have short hair?"))
      .resolves.toBe("I have recorded that Melody has long hair; I do not have a confirmed record of short hair.");
  });

  it("does not guess unknown people or missing attributes", async () => {
    const unknown = database(null);
    await expect(buildMemoryReply(unknown.db, "person-owner", "message-1", "Unknown has long hair"))
      .resolves.toBe("I don’t know that person yet. To add them, say: Add Unknown as a family member.");

    const known = database();
    await expect(buildMemoryReply(known.db, "person-melody", "message-2", "What hair does Melody have?"))
      .resolves.toBe("I don’t have that attribute recorded for Melody yet.");
  });
});
