// Compatibility facade for the deterministic memory modules.
// New code should import interpretation, repositories, and capabilities directly.
export {
  interpretMessage,
  type MemoryIntent,
} from "./interpretation/deterministic.js";
export {
  formatFact,
  listFacts,
  matchFacts,
  matchingFacts,
  recordFact,
  resolveFact,
  type FactMatchResult,
  type FactMatchStrategy,
  type FactRow,
} from "./repositories/facts.js";
export { buildMemoryReply } from "./capabilities/memory.js";
