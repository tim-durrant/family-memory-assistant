import type { CapabilityName, PermissionDecision, PermissionRequest } from "../permissions.js";
import { checkCapability } from "../permissions.js";

export async function checkCapabilityWithDatabase(
  db: D1Database,
  request: PermissionRequest,
): Promise<PermissionDecision> {
  const baseline = checkCapability(request);
  if (!request.targetPersonId || request.targetPersonId === request.requesterPersonId) return baseline;

  try {
    const requester = await db.prepare(
      "SELECT role, active, is_sender FROM people WHERE id = ?1 LIMIT 1",
    ).bind(request.requesterPersonId).first<{ role: string; active: number; is_sender: number }>();
    if (!requester) return { allowed: false, reason: "requester is not an active registered sender", policySource: "denied" };
    if (typeof requester.active !== "number" || typeof requester.is_sender !== "number") return baseline;
    if (requester.active !== 1 || requester.is_sender !== 1) {
      return { allowed: false, reason: "requester is not an active registered sender", policySource: "denied" };
    }

    if ((request.capability === "person.attribute.read" || request.capability === "person.attribute.write")
      && request.category !== "health" && request.category !== "capacity" && requester.role === "owner") {
      return { allowed: true, reason: "family administrator may access ordinary family attributes", policySource: "family-policy" };
    }

    const friendlyCategory = request.category ?? friendlyCategoryForCapability(request.capability);
    const permission = await db.prepare(
      `SELECT permission FROM trusted_contact_permissions
       WHERE owner_person_id = ?1 AND trusted_person_id = ?2
         AND category IN (?3, 'all', ?4, ?5) AND permission IN (?6, 'read_write') LIMIT 1`,
    ).bind(
      request.targetPersonId, request.requesterPersonId, request.category ?? request.capability,
      request.capability, friendlyCategory, requiredPermission(request.capability),
    ).first<{ permission: string }>();
    if (permission) return { allowed: true, reason: "explicit D1 family permission", policySource: "family-policy" };
    return { allowed: false, reason: "no explicit D1 permission for this cross-person capability", policySource: "denied" };
  } catch {
    return baseline;
  }
}

function requiredPermission(capability: CapabilityName): "read" | "write" {
  return capability.endsWith(".read") ? "read" : "write";
}

function friendlyCategoryForCapability(capability: CapabilityName): string {
  if (capability.startsWith("memory.note.")) return "notes";
  if (capability.startsWith("memory.fact.")) return "facts";
  if (capability.startsWith("person.attribute.")) return "attributes";
  return capability;
}

export async function manageFamilyPermission(
  db: D1Database,
  actorPersonId: string,
  targetName: string,
  category: string,
  permission: "read" | "write" | "read_write",
  action: "grant" | "revoke",
): Promise<{ ok: boolean; message: string }> {
  const actor = await db.prepare(
    "SELECT role, active, is_sender FROM people WHERE id = ?1 LIMIT 1",
  ).bind(actorPersonId).first<{ role: string; active: number; is_sender: number }>();
  if (!actor || actor.role !== "owner" || actor.active !== 1 || actor.is_sender !== 1) {
    return { ok: false, message: "Only the family administrator can manage permissions." };
  }

  const target = await db.prepare(
    "SELECT id, display_name FROM people WHERE active = 1 AND lower(display_name) = lower(?1) LIMIT 1",
  ).bind(targetName.trim()).first<{ id: string; display_name: string }>();
  if (!target) return { ok: false, message: `I couldn’t find an active family member named ${targetName.trim()}.` };
  if (target.id === actorPersonId) return { ok: false, message: "The administrator’s own access cannot be changed here." };
  if (!/^(?:all|health|capacity|notes?|facts?|memory\.(?:note|fact)(?:\.(?:read|write))?|person\.attribute(?:\.(?:read|write))?)$/i.test(category)) {
    return { ok: false, message: "That permission category is not supported yet. Try health, notes, facts, or all." };
  }

  const now = new Date().toISOString();
  if (action === "grant") {
    await db.prepare(
      `INSERT INTO trusted_contact_permissions (id, owner_person_id, trusted_person_id, category, permission, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(owner_person_id, trusted_person_id, category) DO UPDATE SET permission = excluded.permission`,
    ).bind(crypto.randomUUID(), actorPersonId, target.id, category.toLowerCase(), permission, now).run();
  } else {
    await db.prepare(
      "DELETE FROM trusted_contact_permissions WHERE owner_person_id = ?1 AND trusted_person_id = ?2 AND category = ?3",
    ).bind(actorPersonId, target.id, category.toLowerCase()).run();
  }
  await db.prepare(
    `INSERT INTO permission_change_audit
     (id, owner_person_id, actor_person_id, trusted_person_id, category, permission, action, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  ).bind(crypto.randomUUID(), actorPersonId, actorPersonId, target.id, category.toLowerCase(), permission, action, now).run();
  return { ok: true, message: action === "grant"
    ? `Granted ${permission === "read_write" ? "read and write" : permission} access to ${category} for ${target.display_name}.`
    : `Revoked access to ${category} for ${target.display_name}.` };
}

export async function recordPermissionAudit(
  db: D1Database,
  request: PermissionRequest,
  decision: PermissionDecision,
): Promise<void> {
  await db.prepare(
    `INSERT INTO permission_audit
     (id, requester_person_id, capability, target_person_id, category, allowed, reason, policy_source, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  ).bind(
    crypto.randomUUID(), request.requesterPersonId, request.capability, request.targetPersonId ?? null,
    request.category ?? null, decision.allowed ? 1 : 0, decision.reason, decision.policySource, new Date().toISOString(),
  ).run();
}
