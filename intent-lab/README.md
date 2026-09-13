# Offline Intent Lab

This directory contains offline-only data and tooling for developing and evaluating intent classifiers for the family-memory assistant.

## Boundary

The intent lab must not be imported by the Cloudflare Worker. It may produce reviewed datasets, evaluation reports, and an explicitly approved model artifact for a later integration.

Do not place raw WhatsApp messages, names, phone numbers, health information, documents, access credentials, or secrets here. Initial datasets must be synthetic or deliberately de-identified and reviewed.

## Initial scope

The first classifier experiment covers ordinary, low-risk intents only:

- `record_fact`
- `query_fact`
- `record_note`
- `query_note`
- `resolve_fact`
- `forget_fact`
- `help`
- `needs_clarification`
- `unknown`

Health, permissions, emergency actions, documents, identity linking, and other sensitive capabilities are intentionally excluded until they have dedicated safety policies.

## Dataset format

Training examples are JSON Lines. Each line must conform to `data/example.schema.json`:

```json
{
  "id": "intent-v1-0001",
  "text": "Please remember that the appointment is next Tuesday.",
  "intent": "record_fact",
  "sensitivity": "ordinary",
  "requires_clarification": false,
  "source": "synthetic",
  "dataset_version": "intent-v1"
}
```

## Evaluation rules

The eventual training workflow must keep training, development, and frozen test examples separate. Near-duplicate paraphrases must remain in the same split. Accuracy alone is insufficient; reports should include per-intent precision, recall, F1, a confusion matrix, confidence behavior, and unknown/clarification performance.

The current seed corpus is a starting point for schema and tooling work, not evidence of production readiness.

## Synthetic-realistic review corpus

The v1.6 corpus at `data/synthetic-realistic/intent-v1.6.jsonl` contains deliberately authored WhatsApp-style examples. It is kept separate from the synthetic training and frozen test data. Each example uses `source: "synthetic-realistic"` and has a required `review_status`:

- `not-reviewed` — generated or authored but not yet assessed by a human;
- `human-approved` — wording and label accepted by a human reviewer;
- `human-corrected` — human review changed the wording, label, or rationale;
- `rejected` — unsuitable for use as evaluation or training evidence.

Human review does not change the source provenance: these remain synthetic-realistic examples, not real user messages. Run the separate evaluation with:

```text
python src/validate_dataset.py data/synthetic-realistic/intent-v1.6.jsonl
python src/evaluate_realistic_v1_6.py
```

The v1.6 evaluation is intentionally separate from training. Review examples before considering a later training comparison.

For convenient manual editing, use the pretty-printed review copy rather than the JSONL file:

```text
python3 src/review_dataset.py export
```

Then edit `data/synthetic-realistic/intent-v1.6-review.json` in Zed. Each example is a multi-line JSON object. After reviewing, apply the copy back to the canonical JSONL file:

```text
python3 src/review_dataset.py apply
python3 src/validate_dataset.py data/synthetic-realistic/intent-v1.6.jsonl
```

The apply command refuses to proceed if IDs are duplicated, the source provenance was changed, or a review status is missing or invalid.

## Deterministic safety gate

`src/safety_gate.py` provides a post-classification safety gate for future classifier integration. It does not execute actions or grant permissions. It can only preserve the predicted intent or conservatively override it to `needs_clarification` when:

- wording says an item is no longer needed, which could mean resolve, delete, or cancel;
- `forget_fact` is predicted without an explicit removal request;
- `resolve_fact` is predicted without an explicit close, resolve, complete, or finished request.

Use it after classification and before structured request construction. The gate is covered by `test_safety_gate.py`.
