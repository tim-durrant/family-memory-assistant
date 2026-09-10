export type NormalizedText = {
  original: string;
  text: string;
  lower: string;
  isQuestion: boolean;
};

/**
 * Normalize only for interpretation. The original message is returned intact
 * so persistence and user-facing confirmations can preserve what was sent.
 */
export function normalizeText(input: string, politeFillers: readonly string[] = []): NormalizedText {
  const original = input;
  let text = input.normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const isQuestion = /\?\s*$/.test(text);

  text = stripTrailingPunctuation(text);
  text = removeBoundaryFillers(text, politeFillers);
  text = stripBoundaryPunctuation(text);

  return {
    original,
    text,
    lower: text.toLowerCase(),
    isQuestion,
  };
}

function removeBoundaryFillers(text: string, fillers: readonly string[]): string {
  let result = text;
  const patterns = fillers
    .filter((filler) => filler.trim())
    .map((filler) => escapeRegExp(filler.trim()).replace(/\s+/g, "\\s+"));
  if (patterns.length === 0) return result;

  const boundary = new RegExp(`^(?:${patterns.join("|")})(?:[,;:\\s]+|$)`, "i");
  const trailing = new RegExp(`(?:[,;:\\s]+)(?:${patterns.join("|")})$`, "i");
  let changed = true;
  while (changed && result) {
    changed = false;
    const withoutLeading = result.replace(boundary, "").trim();
    if (withoutLeading !== result) {
      result = withoutLeading;
      changed = true;
    }
    const withoutTrailing = result.replace(trailing, "").trim();
    if (withoutTrailing !== result) {
      result = withoutTrailing;
      changed = true;
    }
  }
  return result;
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[.!?]+\s*$/, "").trim();
}

function stripBoundaryPunctuation(value: string): string {
  return value.replace(/^[,;:\s]+|[,;:\s]+$/g, "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
