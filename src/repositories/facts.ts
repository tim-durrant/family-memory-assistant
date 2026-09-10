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
};

export async function listFacts(db: D1Database, personId: string): Promise<FactRow[]> {
  const result = await db.prepare(
    `SELECT id, statement, category, status, importance, effective_date
     FROM facts WHERE person_id = ?1 AND status NOT IN ('resolved', 'superseded')
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
      effective_date, expiry_date, resolved_at, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, ?9, ?9)`,
  ).bind(
    crypto.randomUUID(), personId, intent.statement, intent.category, intent.status,
    intent.category === "health" ? "high" : "normal", sourceMessageId, intent.effectiveDate, now,
  ).run();
}

export async function resolveFact(
  db: D1Database,
  personId: string,
  topic: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
): Promise<number> {
  const facts = await listFacts(db, personId);
  const matches = matchingFacts(facts, topic, config);
  if (matches.length !== 1) return matches.length;
  await db.prepare(
    `UPDATE facts SET status = 'resolved', resolved_at = ?1, updated_at = ?1
     WHERE id = ?2 AND person_id = ?3`,
  ).bind(new Date().toISOString(), matches[0].id, personId).run();
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
