import { DEFAULT_DETERMINISTIC_CONFIG, type DeterministicConfig } from "../config.js";
import { interpretMessage } from "../interpretation/deterministic.js";
import {
  formatFact,
  listFacts,
  matchFacts,
  recordFact,
  resolveFact,
} from "../repositories/facts.js";

/**
 * Memory capability orchestration. It coordinates interpretation, validation,
 * repository operations, and user-facing results without knowing the transport.
 */
export async function buildMemoryReply(
  db: D1Database,
  personId: string,
  sourceMessageId: string,
  text: string,
  config: DeterministicConfig = DEFAULT_DETERMINISTIC_CONFIG,
): Promise<string | undefined> {
  const intent = interpretMessage(text, config);
  if (intent.kind === "unknown") return optionalReply(config.unknownIntentReply);

  if (intent.kind === "record_fact") {
    if (intent.dateIssue === "ambiguous") return config.ambiguousDateReply;
    if (intent.dateIssue === "invalid") return config.invalidDateReply;
    await recordFact(db, personId, sourceMessageId, intent);
    return intent.needsYear
      ? renderReply(config.missingYearReply, { statement: intent.statement })
      : `Saved: ${intent.statement}.`;
  }

  const facts = await listFacts(db, personId);
  if (intent.kind === "waiting_question") {
    if (!config.enableWaitingFacts) return optionalReply(config.unknownIntentReply);
    const waiting = facts.filter((fact) => fact.status === "waiting");
    if (waiting.length === 0) return config.noWaitingFactsReply;
    return `You’re waiting for: ${waiting.map(formatFact).join("; ")}`;
  }

  if (intent.kind === "when_question") {
    const matchResult = matchFacts(facts, intent.topic, config);
    const matches = matchResult.matches;
    if (matches.length === 0) return config.noMatchingFactReply;
    if (matches.length > 1) {
      return renderReply(config.ambiguousFactReply, { matches: matches.map(formatFact).join("; ") });
    }
    return formatFact(matches[0]);
  }

  if (!config.enableFactResolution) return optionalReply(config.unknownIntentReply);
  const matchCount = await resolveFact(db, personId, intent.topic, config);
  if (matchCount === 0) return config.resolutionNotFoundReply;
  if (matchCount > 1) return config.resolutionAmbiguousReply;
  return config.resolutionSuccessReply;
}

function renderReply(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

function optionalReply(reply: string): string | undefined {
  return reply || undefined;
}
