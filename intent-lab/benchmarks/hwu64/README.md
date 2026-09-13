# HWU64 methodology benchmark

This directory contains HWU64 for offline methodology experiments only. It is not part of the Family Memory production training corpus and its original labels must not be silently mapped to Family Memory labels.

## Provenance

- Hugging Face mirror: https://huggingface.co/datasets/DeepPavlov/hwu64
- Original source repository: https://github.com/jianguoz/Few-Shot-Intent-Detection
- Original source path: `Datasets/HWU64`
- Downloaded: 2026-09-13
- Source format: one utterance per line in `seq.in`, matching one original intent label per line in `label`

The Hugging Face mirror identifies the dataset as English text classification with 64 intents and approximately 10,158 rows: 8,954 train and 1,076 each for validation and test. The downloaded raw files are preserved under `raw/HWU64/`.

## Intended use

Use this benchmark to evaluate tokenisation, feature extraction, classifier behavior, confidence thresholds, few-shot methodology, error analysis, and out-of-scope handling. Keep `benchmark_intent` separate from any locally defined Family Memory label.

Review the original dataset licence and attribution requirements before redistributing the downloaded files or derived artifacts. Public availability does not remove those obligations.

## Layout

```text
hwu64/
├── README.md
├── raw/HWU64/
│   ├── train/{seq.in,label}
│   ├── valid/{seq.in,label}
│   └── test/{seq.in,label}
└── converted/
    ├── train.jsonl
    ├── valid.jsonl
    └── test.jsonl
```
