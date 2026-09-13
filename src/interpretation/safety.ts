import type { SupportedIntentKind } from "./intents.js";

export type ClassifierIntentKind = SupportedIntentKind | "needs_clarification";

export type SafetyDecision = {
  intent: ClassifierIntentKind;
  overridden: boolean;
  reason: string;
};

const ambiguousNoLongerNeeded = /\b(?:no longer need|don't need|do not need|not needed|no need for|stop keeping|can go now)\b/i;
const explicitForget = /\b(?:forget|delete|erase|remove|discard|clear|wipe|get rid of|take .* out of (?:memory|my saved|saved information))\b/i;
const explicitResolve = /\b(?:resolve|close|complete|completed|finished|done|dealt with|sorted|mark .* (?:done|complete|completed|resolved))\b/i;

/**
 * Apply deterministic safety overrides to advisory classifier output.
 *
 * This function never authorises or executes an action. It only preserves a
 * prediction or changes it to needs_clarification before request construction.
 */
export function applyIntentSafetyGate(text: string, predictedIntent: ClassifierIntentKind): SafetyDecision {
  if (ambiguousNoLongerNeeded.test(text)) {
    return {
      intent: "needs_clarification",
      overridden: predictedIntent !== "needs_clarification",
      reason: "wording may mean resolve, delete, or cancel; ask the user to specify the action",
    };
  }

  if (predictedIntent === "forget_fact" && !explicitForget.test(text)) {
    return {
      intent: "needs_clarification",
      overridden: true,
      reason: "forget_fact requires an explicit forget, delete, erase, remove, or discard request",
    };
  }

  if (predictedIntent === "resolve_fact" && !explicitResolve.test(text)) {
    return {
      intent: "needs_clarification",
      overridden: true,
      reason: "resolve_fact requires an explicit close, resolve, complete, or finished request",
    };
  }

  return { intent: predictedIntent, overridden: false, reason: "no deterministic safety override required" };
}
