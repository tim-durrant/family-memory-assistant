export type SensitiveCandidate = {
  value: string;
  kind: "email" | "phone" | "medical_identifier" | "address" | "location";
  start: number;
  end: number;
};

/** Conservative local-only detection. Uncertain free text is deliberately left alone. */
export function extractSensitiveCandidates(text: string): SensitiveCandidate[] {
  const candidates: SensitiveCandidate[] = [];
  const add = (value: string, kind: SensitiveCandidate["kind"], start: number) => {
    const normalized = value.trim();
    if (!normalized || candidates.some((candidate) => candidate.start === start && candidate.end === start + value.length)) return;
    candidates.push({ value: normalized, kind, start, end: start + value.length });
  };

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    add(match[0], "email", match.index ?? 0);
  }

  for (const match of text.matchAll(/(?<!\d)(?:\+?\d[\d\s().-]{7,}\d)(?!\d)/g)) {
    const digits = match[0].replace(/\D/g, "");
    if (digits.length >= 8 && !/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(match[0].trim())) {
      add(match[0], "phone", match.index ?? 0);
    }
  }

  for (const match of text.matchAll(/\b(?:MRN|medical\s+record(?:\s+number|\s+no\.?)?|record\s+number)\s*[:#-]?\s*([A-Z0-9-]{4,})\b/gi)) {
    const value = match[1];
    const start = (match.index ?? 0) + match[0].lastIndexOf(value);
    add(value, "medical_identifier", start);
  }

  for (const match of text.matchAll(/\b(?:address|home address|located at)\s*[:#-]?\s*([^.!?\n]{8,})/gi)) {
    const value = match[1].trim();
    const start = (match.index ?? 0) + match[0].lastIndexOf(match[1]) + (match[1].length - match[1].trimStart().length);
    add(value, "address", start);
  }

  return candidates.sort((left, right) => left.start - right.start);
}
