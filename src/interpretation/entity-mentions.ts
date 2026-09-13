export type EntityMentionCandidate = {
  displayName: string;
  sourceStart: number;
  sourceEnd: number;
};

/** Conservative, local-only mention extraction. It never decides family membership. */
export function extractEntityMentionCandidates(text: string): EntityMentionCandidate[] {
  const candidates: EntityMentionCandidate[] = [];
  const seen = new Set<string>();
  const add = (match: RegExpExecArray, value: string, offset: number) => {
    const displayName = value.trim().replace(/[.,!?]+$/, "");
    if (!displayName || /^(Today|I|My|The|A|An|It|That|This)$/i.test(displayName)) return;
    const normalized = displayName.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push({ displayName, sourceStart: offset, sourceEnd: offset + value.length });
  };

  const titled = /\b(?:Doctor|Dr\.?|Professor|Prof\.?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = titled.exec(text))) add(match, match[0], match.index);

  const contextual = /\b(?:with|from|by|about|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  while ((match = contextual.exec(text))) add(match, match[1], match.index + match[0].indexOf(match[1]));

  return candidates;
}
