export type SupportedIntentKind =
  | "record_fact"
  | "when_question"
  | "waiting_question"
  | "resolve_fact"
  | "unknown";

export type IntentDefinition = {
  description: string;
  examples: readonly string[];
  counterexamples: readonly string[];
};

/** The deliberately small V1 vocabulary understood by the deterministic interpreter. */
export const INTENT_CATALOG: Readonly<Record<SupportedIntentKind, IntentDefinition>> = {
  record_fact: {
    description: "Store a factual statement or a waiting/pending statement.",
    examples: [
      "My driving test is 12 October 2026",
      "I’m still waiting for my MRI results",
      "Remember that the dentist is booked for Friday",
    ],
    counterexamples: [
      "Tell me a joke",
      "What is the weather?",
    ],
  },
  when_question: {
    description: "Retrieve one or more stored facts by topic.",
    examples: [
      "When is my driving test?",
      "When is my driving test please?",
      "Please, when is my driving test?",
      "Could you tell me when my driving test is?",
    ],
    counterexamples: [
      "My driving test is 12 October 2026",
      "Tell me about my driving test",
    ],
  },
  waiting_question: {
    description: "List facts currently marked as waiting.",
    examples: [
      "What am I waiting for?",
      "What's pending?",
    ],
    counterexamples: [
      "I’m still waiting for my MRI results",
      "When is my MRI?",
    ],
  },
  resolve_fact: {
    description: "Mark exactly one matching fact as resolved.",
    examples: [
      "Mark the MRI results as resolved",
      "Set the appointment resolved",
    ],
    counterexamples: [
      "When are the MRI results?",
      "The MRI results are resolved",
    ],
  },
  unknown: {
    description: "A greeting, unsupported request, malformed request, or ambiguous request.",
    examples: [
      "Hello assistant",
      "Tell me a joke",
      "What is the weather?",
    ],
    counterexamples: [
      "My driving test is 12 October 2026",
      "When is my driving test?",
    ],
  },
};
