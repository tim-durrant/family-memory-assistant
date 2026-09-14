export type SupportedIntentKind =
  | "record_fact"
  | "when_question"
  | "waiting_question"
  | "resolve_fact"
  | "forget_fact"
  | "record_person_attribute"
  | "query_person_attribute"
  | "add_person"
  | "link_person_whatsapp"
  | "confirm_person_whatsapp_link"
  | "record_note"
  | "query_note"
  | "help"
  | "add_emergency_contact"
  | "confirm_emergency_contact"
  | "set_emergency_safe_word"
  | "confirm_emergency_safe_word"
  | "grant_permission"
  | "revoke_permission"
  | "create_reminder"
  | "list_reminders"
  | "cancel_reminder"
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
      "Kindly advise me when my driving test is please?",
      "What date is my driving test please?",
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
  record_person_attribute: {
    description: "Store an explicit attribute about a known person.",
    examples: [
      "Melody has long hair",
    ],
    counterexamples: [
      "What hair does Melody have?",
      "Does Melody have short hair?",
    ],
  },
  add_emergency_contact: {
    description: "Begin explicit setup of a trusted emergency phone number.",
    examples: ["Add trusted emergency contact +61400123456"],
    counterexamples: ["Send an emergency alert to +61400123456"],
  },
  confirm_emergency_contact: {
    description: "Activate a previously proposed trusted emergency contact.",
    examples: ["Confirm trusted emergency contact +61400123456"],
    counterexamples: ["Add trusted emergency contact +61400123456"],
  },
  confirm_emergency_safe_word: {
    description: "Activate a previously proposed emergency safe word.",
    examples: ["Confirm my emergency safe word lighthouse"],
    counterexamples: ["lighthouse"],
  },
  grant_permission: {
    description: "Grant a family member read, write, or read/write access to a supported category.",
    examples: ["Grant Sven read access to my health information"],
    counterexamples: ["Sven can read my health information"],
  },
  create_reminder: {
    description: "Create a reminder at an explicit local date and time.",
    examples: ["Remind me on 15 November 2026 at 9:00 to call Mum"],
    counterexamples: ["Remind me sometime to call Mum"],
  },
  list_reminders: {
    description: "List pending reminders for the authenticated sender.",
    examples: ["List my reminders"],
    counterexamples: ["What am I waiting for?"],
  },
  cancel_reminder: {
    description: "Cancel one reminder by its displayed identifier.",
    examples: ["Cancel reminder rem-123"],
    counterexamples: ["Cancel my clarification"],
  },
  revoke_permission: {
    description: "Revoke a family member's access to a supported category.",
    examples: ["Revoke Sven's access to my health information"],
    counterexamples: ["Sven no longer needs health information"],
  },
  set_emergency_safe_word: {
    description: "Begin explicit setup of an exact emergency safe word.",
    examples: ["Set my emergency safe word to lighthouse"],
    counterexamples: ["lighthouse"],
  },
  help: {
    description: "Explain available deterministic actions and their terms.",
    examples: [
      "Help please",
      "How do I use this?",
      "How do I save a note?",
    ],
    counterexamples: [
      "Save this note: My symptoms were headaches.",
    ],
  },
  record_note: {
    description: "Store an explicitly delimited long-form note without rewriting it.",
    examples: [
      "Save this note: My symptoms today included headaches and numbness.",
    ],
    counterexamples: [
      "My symptoms today included headaches",
    ],
  },
  query_note: {
    description: "Retrieve the latest or today's exact note for the authenticated sender.",
    examples: [
      "What did I write today?",
      "Show me my latest note",
    ],
    counterexamples: [
      "What did Melody write today?",
    ],
  },
  add_person: {
    description: "Explicitly propose a subject-only family member for approval.",
    examples: [
      "Add Melody as a family member",
    ],
    counterexamples: [
      "Melody has long hair",
      "Add Melody as a friend",
    ],
  },
  link_person_whatsapp: {
    description: "Begin a verified WhatsApp-number link for an approved family member.",
    examples: [
      "Link Sven's WhatsApp",
    ],
    counterexamples: [
      "Set Sven's number immediately",
    ],
  },
  confirm_person_whatsapp_link: {
    description: "Confirm a proposed WhatsApp-number link after the person presents a one-time code.",
    examples: [
      "Confirm the WhatsApp link for Sven",
    ],
    counterexamples: [
      "Link Sven's WhatsApp",
    ],
  },
  query_person_attribute: {
    description: "Answer a question about an explicit attribute of a known person.",
    examples: [
      "What hair does Melody have?",
      "Does Melody have short hair?",
    ],
    counterexamples: [
      "Melody has long hair",
    ],
  },
  forget_fact: {
    description: "Request that exactly one matching fact be forgotten after confirmation.",
    examples: [
      "Forget the old appointment",
      "Delete my MRI result",
    ],
    counterexamples: [
      "When is my appointment?",
      "Mark the appointment as resolved",
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
