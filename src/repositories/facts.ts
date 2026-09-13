import { DEFAULT_DETERMINISTIC_CONFIG, type DeterministicConfig } from "../config.js";
import type { MemoryIntent } from "../interpretation/deterministic.js";
import { normalizeTopic, topicTerms } from "../interpretation/topic.js";

export type FactRow = {
  id: string;
  statement: string;
  category: string;
  status: string;
  importance: string;
  effective_date: string | null;
  last_change_message_id?: string | null;
};

export type PendingFactAction = {
  id: string;
  person_id: string;
  action: "replace" | "forget";
  source_message_id: string;
  existing_fact_id: string | null;
  statement: string | null;
  category: string | null;
  status: string | null;
  importance: string | null;
  effective_date: string | null;
  created_at: string;
  expires_at: string;
};

export async function listFacts(db: D1Database, personId: string): Promise<FactRow[]> {
  const result = await db.prepare(
    `SELECT id, statement, category, status, importance, effective_date
     FROM facts WHERE person_id = ?1 AND status NOT IN ('resolved', 'superseded', 'deleted')
     ORDER BY effective_date IS NULL, effective_date, created_at`,
  ).bind(personId).all<FactRow>();
  return result.results;
}

export async function recordFact(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  intent: Extract<MemoryIntent, { kind: "record_fact" }>,
): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(
    `INSERT INTO facts
     (id, person_id, statement, category, status, importance, source_message_id,
      effective_date, expiry_date, resolved_at, created_at, updated_at, last_change_message_id)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?9, NULL)`,
  ).bind(
    crypto.randomUUID(), personId, intent.statement, intent.category, intent.status,
    intent.category === "health" ? "high" : "normal", sourceMessageId, intent.effectiveDate, now,
  ).run();
}

export async function createPendingFactAction(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  action: "replace" | "forget",
  existingFact: FactRow,
  candidate: Extract<MemoryIntent, { kind: "record_fact" }> | null,
  ttlMinutes: number,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60_000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM pending_fact_actions WHERE person_id = ?1").bind(personId),
    db.prepare(
      `INSERT INTO pending_fact_actions
       (id, person_id, action, source_message_id, existing_fact_id, statement, category,
        status, importance, effective_date, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`,
    ).bind(
      crypto.randomUUID(), personId, action, sourceMessageId, existingFact.id,
      candidate?.statement ?? null, candidate?.category ?? null, candidate?.status ?? null,
      candidate ? (candidate.category === "health" ? "high" : "normal") : null,
      candidate?.effectiveDate ?? null, now.toISOString(), expiresAt,
    ),
  ]);
}

export async function getPendingFactAction(db: D1Database, personId: string): Promise<PendingFactAction | null> {
  return db.prepare(
    `SELECT id, person_id, action, source_message_id, existing_fact_id, statement, category,
            status, importance, effective_date, created_at, expires_at
     FROM pending_fact_actions
     WHERE person_id = ?1 AND expires_at > ?2
     ORDER BY created_at DESC LIMIT 1`,
  ).bind(personId, new Date().toISOString()).first<PendingFactAction>();
}

export async function clearPendingFactAction(db: D1Database, personId: string): Promise<void> {
  await db.prepare("DELETE FROM pending_fact_actions WHERE person_id = ?1").bind(personId).run();
}

export async function applyPendingFactAction(
  db: D1Database,
  personId: string,
  confirmationMessageId: string,
  pending: PendingFactAction,
): Promise<void> {
  const now = new Date().toISOString();
  if (pending.action === "forget") {
    await db.prepare(
      `UPDATE facts SET status = 'deleted', updated_at = ?1, last_change_message_id = ?2
       WHERE id = ?3 AND person_id = ?4 AND status NOT IN ('resolved', 'superseded', 'deleted')`,
    ).bind(now, confirmationMessageId, pending.existing_fact_id, personId).run();
    await clearPendingFactAction(db, personId);
    return;
  }

  if (!pending.existing_fact_id || !pending.statement || !pending.category || !pending.status || !pending.importance) {
    throw new Error("Pending replacement is incomplete");
  }
  const newFactId = crypto.randomUUID();
  await db.batch([
    db.prepare(
      `UPDATE facts SET status = 'superseded', updated_at = ?1, last_change_message_id = ?2
       WHERE id = ?3 AND person_id = ?4 AND status NOT IN ('resolved', 'superseded', 'deleted')`,
    ).bind(now, confirmationMessageId, pending.existing_fact_id, personId),
    db.prepare(
      `INSERT INTO facts
       (id, person_id, statement, category, status, importance, source_message_id,
        effective_date, expiry_date, resolved_at, created_at, updated_at, last_change_message_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?9, ?10)`,
    ).bind(
      newFactId, personId, pending.statement, pending.category, pending.status, pending.importance,
      pending.source_message_id, pending.effective_date, now, confirmationMessageId,
    ),
    db.prepare("DELETE FROM pending_fact_actions WHERE person_id = ?1").bind(personId),
  ]);
}

export async function resolveFact(
  db: D1Database,
  personId: string,
  topic: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
  changeMessageId?: string,
): Promise<number> {
  const facts = await listFacts(db, personId);
  const matches = matchingFacts(facts, topic, config);
  if (matches.length !== 1) return matches.length;
  await db.prepare(
    `UPDATE facts SET status = 'resolved', resolved_at = ?1, updated_at = ?1, last_change_message_id = ?4
       WHERE id = ?2 AND person_id = ?3`,
  ).bind(new Date().toISOString(), matches[0].id, personId, changeMessageId ?? null).run();
  return 1;
}

export type FactMatchStrategy = "exact" | "all-terms" | "none";

export type FactMatchResult = {
  matches: FactRow[];
  strategy: FactMatchStrategy;
  queryTerms: string[];
};

export function matchFacts(
  facts: FactRow[],
  topic: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
): FactMatchResult {
  const normalizedTopic = normalizeTopic(topic, config);
  const queryTerms = topicTerms(topic, config);
  if (queryTerms.length === 0) {
    return { matches: [], strategy: "none", queryTerms };
  }

  const matches = facts.filter((fact) => {
    const normalizedStatement = normalizeTopic(fact.statement, config);
    const statementTerms = new Set(topicTerms(fact.statement, config));
    return normalizedStatement === normalizedTopic || queryTerms.every((term) => statementTerms.has(term));
  });

  const exactMatches = matches.filter((fact) => normalizeTopic(fact.statement, config) === normalizedTopic);
  return {
    matches,
    strategy: matches.length === 0 ? "none" : exactMatches.length > 0 ? "exact" : "all-terms",
    queryTerms,
  };
}

export function matchingFacts(
  facts: FactRow[],
  topic: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
): FactRow[] {
  return matchFacts(facts, topic, config).matches;
}

export function formatFact(fact: FactRow): string {
  const date = fact.effective_date ? ` (${fact.effective_date})` : "";
  return `${fact.statement}${date}`;
}
