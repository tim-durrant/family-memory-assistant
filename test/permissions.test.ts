import { describe, expect, it } from "vitest";
import { checkCapability } from "../src/permissions.js";
import { checkCapabilityWithDatabase, recordPermissionAudit } from "../src/repositories/permissions.js";
import { interpretMessage } from "../src/interpretation/deterministic.js";

function database(options: { permission?: string; auditFails?: boolean } = {}) {
  const audits: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          return {
            async first<T>() {
              if (sql.includes("FROM people")) return { role: "member", active: 1, is_sender: 1 } as T;
              if (sql.includes("FROM trusted_contact_permissions")) {
                return options.permission ? { permission: options.permission } as T : null;
              }
              return null as T;
            },
            async run() {
              if (options.auditFails) throw new Error("audit unavailable");
              if (sql.includes("INSERT INTO permission_audit")) audits.push(params);
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, audits };
}

describe("central capability permissions", () => {
  it("recognises owner permission management commands without exposing database syntax", () => {
    expect(interpretMessage("Grant Sven read access to my health information")).toEqual({
      kind: "grant_permission", personName: "Sven", permission: "read", category: "health",
    });
    expect(interpretMessage("Revoke Sven's access to my health information")).toEqual({
      kind: "revoke_permission", personName: "Sven", permission: "read_write", category: "health",
    });
    expect(interpretMessage("Grant Sven read access to health information")).toMatchObject({ kind: "unknown" });
  });
  it("allows an authenticated sender to access their own data", () => {
    expect(checkCapability({ requesterPersonId: "person-1", capability: "memory.note.read", targetPersonId: "person-1" }))
      .toMatchObject({ allowed: true, policySource: "own-data" });
  });

  it("allows registered senders to use ordinary family attributes", () => {
    expect(checkCapability({ requesterPersonId: "person-1", capability: "person.attribute.read", targetPersonId: "person-2", category: "hair_length" }))
      .toMatchObject({ allowed: true, policySource: "registered-sender" });
  });

  it("denies sensitive cross-person attributes and unlisted cross-person access", () => {
    expect(checkCapability({ requesterPersonId: "person-1", capability: "person.attribute.read", targetPersonId: "person-2", category: "health" })).toMatchObject({ allowed: false });
    expect(checkCapability({ requesterPersonId: "person-1", capability: "memory.note.read", targetPersonId: "person-2" })).toMatchObject({ allowed: false });
  });

  it("denies a request without an authenticated sender", () => {
    expect(checkCapability({ requesterPersonId: "", capability: "emergency.trigger" })).toMatchObject({ allowed: false });
  });

  it("allows explicitly granted sensitive cross-person access", async () => {
    const { db } = database({ permission: "read" });
    await expect(checkCapabilityWithDatabase(db, {
      requesterPersonId: "person-2",
      capability: "person.attribute.read",
      targetPersonId: "person-1",
      category: "health",
    })).resolves.toMatchObject({ allowed: true, policySource: "family-policy" });
  });

  it("denies revoked or missing cross-person permissions", async () => {
    const { db } = database();
    await expect(checkCapabilityWithDatabase(db, {
      requesterPersonId: "person-2",
      capability: "person.attribute.read",
      targetPersonId: "person-1",
      category: "health",
    })).resolves.toMatchObject({ allowed: false });
  });

  it("records an authorization decision in the audit table", async () => {
    const { db, audits } = database();
    const request = { requesterPersonId: "person-2", capability: "memory.note.read" as const, targetPersonId: "person-1" };
    const decision = await checkCapabilityWithDatabase(db, request);
    await recordPermissionAudit(db, request, decision);
    expect(audits).toHaveLength(1);
    expect(audits[0]).toContain(0);
    expect(audits[0]).toContain("memory.note.read");
  });

  it("does not turn an audit outage into an authorization grant", async () => {
    const { db } = database({ auditFails: true, permission: "read" });
    const request = {
      requesterPersonId: "person-2",
      capability: "person.attribute.read" as const,
      targetPersonId: "person-1",
      category: "health",
    };
    const decision = await checkCapabilityWithDatabase(db, request);
    await expect(recordPermissionAudit(db, request, decision)).rejects.toThrow("audit unavailable");
    expect(decision.allowed).toBe(true);
  });
});
