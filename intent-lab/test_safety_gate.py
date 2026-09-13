from __future__ import annotations

import unittest

from src.safety_gate import apply_safety_gate


class SafetyGateTests(unittest.TestCase):
    def test_ambiguous_no_longer_need_overrides_every_prediction(self) -> None:
        decision = apply_safety_gate("I don't need that appointment thing anymore", "record_fact")
        self.assertEqual(decision.intent, "needs_clarification")
        self.assertTrue(decision.overridden)

    def test_ambiguous_wording_remains_clarification(self) -> None:
        decision = apply_safety_gate("No need for the school reminder now", "needs_clarification")
        self.assertEqual(decision.intent, "needs_clarification")
        self.assertFalse(decision.overridden)

    def test_forget_requires_explicit_removal(self) -> None:
        decision = apply_safety_gate("The dentist appointment is old", "forget_fact")
        self.assertEqual(decision.intent, "needs_clarification")
        self.assertTrue(decision.overridden)

    def test_explicit_forget_is_preserved(self) -> None:
        decision = apply_safety_gate("Please remove the dentist appointment", "forget_fact")
        self.assertEqual(decision.intent, "forget_fact")
        self.assertFalse(decision.overridden)

    def test_resolve_requires_explicit_completion(self) -> None:
        decision = apply_safety_gate("The plumber thing", "resolve_fact")
        self.assertEqual(decision.intent, "needs_clarification")
        self.assertTrue(decision.overridden)

    def test_explicit_resolve_is_preserved(self) -> None:
        decision = apply_safety_gate("The plumber job is done, close it", "resolve_fact")
        self.assertEqual(decision.intent, "resolve_fact")
        self.assertFalse(decision.overridden)

    def test_safe_prediction_is_unchanged(self) -> None:
        decision = apply_safety_gate("What did I write about the holiday", "query_note")
        self.assertEqual(decision.intent, "query_note")
        self.assertFalse(decision.overridden)


if __name__ == "__main__":
    unittest.main()
