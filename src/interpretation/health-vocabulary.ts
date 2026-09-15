export type HealthVocabularyEntry = {
  canonicalId: string;
  canonicalName: string;
  aliases: readonly string[];
  subtype: "symptom" | "condition_episode";
};

/** Small reviewed seed vocabulary. Expand only with versioned, licensed data. */
export const HEALTH_VOCABULARY_VERSION = "family-seed-1";

export const HEALTH_VOCABULARY: readonly HealthVocabularyEntry[] = [
  { canonicalId: "local:migraine", canonicalName: "migraine", aliases: ["migraine", "migraine headache", "migraine attack", "migraines"], subtype: "condition_episode" },
  { canonicalId: "local:headache", canonicalName: "headache", aliases: ["headache", "head pain"], subtype: "symptom" },
  { canonicalId: "local:nausea", canonicalName: "nausea", aliases: ["nausea", "feeling sick", "sick to my stomach"], subtype: "symptom" },
  { canonicalId: "local:fever", canonicalName: "fever", aliases: ["fever", "temperature"], subtype: "symptom" },
  { canonicalId: "local:cough", canonicalName: "cough", aliases: ["cough", "coughing"], subtype: "symptom" },
  { canonicalId: "local:pain", canonicalName: "pain", aliases: ["pain", "ache", "aching"], subtype: "symptom" },
  { canonicalId: "local:dizziness", canonicalName: "dizziness", aliases: ["dizziness", "dizzy", "light-headed", "lightheaded"], subtype: "symptom" },
  { canonicalId: "local:fatigue", canonicalName: "fatigue", aliases: ["fatigue", "tiredness", "very tired"], subtype: "symptom" },
];
