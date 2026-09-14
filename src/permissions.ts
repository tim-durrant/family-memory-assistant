export type CapabilityName =
  | "memory.fact.read"
  | "memory.fact.write"
  | "memory.note.read"
  | "memory.note.write"
  | "memory.note.delete"
  | "person.attribute.read"
  | "person.attribute.write"
  | "person.register"
  | "person.approval"
  | "person.contact.link"
  | "emergency.contact.configure"
  | "emergency.trigger"
  | "document.generate"
  | "ai.request"
  | "family.permission.manage"
  | "reminder.create"
  | "reminder.read"
  | "reminder.cancel";

export type PermissionDecision = {
  allowed: boolean;
  reason: string;
  policySource: "own-data" | "registered-sender" | "family-policy" | "denied";
};

export type PermissionRequest = {
  requesterPersonId: string;
  capability: CapabilityName;
  targetPersonId?: string;
  category?: string;
};

/**
 * Central policy boundary. Authentication is established by the Worker before
 * this function is called; this function decides whether the capability may run.
 */
export function checkCapability(request: PermissionRequest): PermissionDecision {
  if (!request.requesterPersonId.trim()) {
    return { allowed: false, reason: "missing authenticated requester", policySource: "denied" };
  }

  const ownData = !request.targetPersonId || request.targetPersonId === request.requesterPersonId;
  if (ownData) {
    return { allowed: true, reason: "request concerns the authenticated sender", policySource: "own-data" };
  }

  if (request.capability === "person.attribute.read" || request.capability === "person.attribute.write") {
    if (request.category === "health" || request.category === "capacity") {
      return { allowed: false, reason: "sensitive person data requires an explicit family permission", policySource: "denied" };
    }
    return { allowed: true, reason: "registered sender may use non-sensitive family attributes", policySource: "registered-sender" };
  }

  return { allowed: false, reason: "cross-person access requires an explicit family permission", policySource: "denied" };
}
