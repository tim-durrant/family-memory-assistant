import type { DeterministicConfig } from "../config.js";

export type TopicAlias = {
  alias: string;
  canonical: string;
};

export function normalizeTopic(topic: string, config: Pick<DeterministicConfig, "topicStopWords" | "topicAliases" | "minimumTopicTermLength">): string {
  let value = topic.normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'");
  for (const alias of config.topicAliases) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias.alias)}\\b`, "g");
    value = value.replace(pattern, alias.canonical);
  }
  return value
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .map((term) => normalizeTerm(term))
    .filter((term) => term.length >= config.minimumTopicTermLength && !config.topicStopWords.includes(term))
    .join(" ");
}

export function topicTerms(topic: string, config: Pick<DeterministicConfig, "topicStopWords" | "topicAliases" | "minimumTopicTermLength">): string[] {
  return normalizeTopic(topic, config).split(" ").filter(Boolean);
}

function normalizeTerm(term: string): string {
  if (term.endsWith("ies") && term.length > 4) return `${term.slice(0, -3)}y`;
  if (term.endsWith("s") && !term.endsWith("ss") && term.length > 3) return term.slice(0, -1);
  return term;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
