"""Deterministic safety overrides for advisory intent-classifier output."""

from __future__ import annotations

import re
from dataclasses import dataclass

DESTRUCTIVE_INTENTS = {"forget_fact", "resolve_fact"}
AMBIGUOUS_NO_LONGER_NEEDED = re.compile(
    r"\b(?:no longer need|don't need|do not need|not needed|no need for|stop keeping|can go now)\b",
    re.IGNORECASE,
)
EXPLICIT_FORGET = re.compile(
    r"\b(?:forget|delete|erase|remove|discard|clear|wipe|get rid of|take .* out of (?:memory|my saved|saved information))\b",
    re.IGNORECASE,
)
EXPLICIT_RESOLVE = re.compile(
    r"\b(?:resolve|close|complete|completed|finished|done|dealt with|sorted|mark .* (?:done|complete|completed|resolved))\b",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class SafetyDecision:
    """The final advisory intent and why the safety gate selected it."""

    intent: str
    overridden: bool
    reason: str


def apply_safety_gate(text: str, predicted_intent: str) -> SafetyDecision:
    """Apply deterministic overrides after classification and before execution.

    The gate never authorises an operation. It only changes an unsafe or
    ambiguous classifier result to ``needs_clarification``.
    """
    if AMBIGUOUS_NO_LONGER_NEEDED.search(text):
        return SafetyDecision(
            "needs_clarification",
            predicted_intent != "needs_clarification",
            "wording may mean resolve, delete, or cancel; ask the user to specify the action",
        )

    if predicted_intent == "forget_fact" and not EXPLICIT_FORGET.search(text):
        return SafetyDecision(
            "needs_clarification",
            True,
            "forget_fact requires an explicit forget, delete, erase, remove, or discard request",
        )

    if predicted_intent == "resolve_fact" and not EXPLICIT_RESOLVE.search(text):
        return SafetyDecision(
            "needs_clarification",
            True,
            "resolve_fact requires an explicit close, resolve, complete, or finished request",
        )

    return SafetyDecision(predicted_intent, False, "no deterministic safety override required")
