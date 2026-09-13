export type ActionDefinition = {
  key: string;
  label: string;
  examples: readonly string[];
  status: "available" | "planned";
};

export const ACTIONS: readonly ActionDefinition[] = [
  { key: "fact.record", label: "save a fact", examples: ["My appointment is 15 November 2026"], status: "available" },
  { key: "fact.lookup", label: "look up a saved fact", examples: ["When is my appointment?"], status: "available" },
  { key: "note.save", label: "save a long-form note", examples: ["Save this note: ...", "Save this note for me, person2, person3: ...", "Save this note for everyone: ..."], status: "available" },
  { key: "note.lookup", label: "retrieve a note", examples: ["What did I write today?"], status: "available" },
  { key: "person.register", label: "register a family member", examples: ["Add Melody as a family member"], status: "available" },
  { key: "person.contact.link", label: "link a verified family-member WhatsApp number", examples: ["Link Sven's WhatsApp"], status: "available" },
  { key: "person.attribute", label: "save or query an explicit person attribute", examples: ["Melody has long hair"], status: "available" },
  { key: "family.permission", label: "grant or revoke family permissions (administrator only)", examples: ["Grant Sven read access to my health information", "Revoke Sven's access to my health information"], status: "available" },
  { key: "emergency.configure", label: "configure trusted emergency contacts", examples: [], status: "planned" },
  { key: "emergency.trigger", label: "send a configured safe-word alert", examples: [], status: "planned" },
  { key: "phone.lookup", label: "look up a phone number", examples: [], status: "planned" },
  { key: "document.pdf", label: "produce a PDF", examples: [], status: "planned" },
  { key: "ai.assistance", label: "ask an AI service for additional help", examples: [], status: "planned" },
];

export function helpReply(topic?: string): string {
  const normalizedTopic = topic?.trim().toLowerCase();
  const relevant = normalizedTopic
    ? ACTIONS.filter((action) => action.label.includes(normalizedTopic) || action.key.includes(normalizedTopic))
    : ACTIONS;
  const actions = relevant.length > 0 ? relevant : ACTIONS;
  const available = actions.filter((action) => action.status === "available");
  const planned = actions.filter((action) => action.status === "planned");
  const lines = [
    "I can currently:",
    ...available.map((action) => `- ${action.label}: ${action.examples.join(" | ")}`),
  ];
  if (planned.length > 0) {
    lines.push("Not available yet:", ...planned.map((action) => `- ${action.label}`));
  }
  return lines.join("\n");
}
