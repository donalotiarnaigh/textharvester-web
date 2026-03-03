# Evaluation Gold Standard Dataset

_Issue #121 — Added 2026-03-02_

## Purpose

This directory contains the hand-labelled ground-truth records used to measure
the extraction accuracy of the TextHarvester OCR pipeline.

## Directory Layout

```
eval/
├── gold-standard/
│   ├── memorials.json        — 20 memorial OCR ground-truth records
│   └── burial-register.json  — 5 burial register ground-truth entries
├── fixtures/
│   └── ci-baseline.json      — Pre-computed extraction fixture for CI regression testing
└── README.md                 — This file
```

## Gold Standard Schema

Each file is a JSON object with the following top-level keys:

| Key | Type | Description |
|-----|------|-------------|
| `version` | string | Schema version (semver) |
| `description` | string | Human-readable description |
| `source` | string | Provenance of the hand-labelled data |
| `created` | string | ISO date of creation |
| `fields_evaluated` | string[] | Field names compared during evaluation |
| `notes` | string | Additional notes |
| `records` | Record[] | Array of ground-truth records |

Each `Record` has:

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `id` | string | ✓ | Unique identifier (e.g. `gs-m-001`) |
| `source_type` | string | ✓ | `memorial_ocr` or `burial_register` |
| `image_ref` | string | | Relative path to the source image (for reproducibility) |
| `description` | string | | Human description of the stone/page condition |
| `expected_needs_review` | boolean | | Whether a human reviewer would flag this record |
| `expected` | object | ✓ | Map of field name → expected value |

## CI Fixture Schema

`fixtures/ci-baseline.json` simulates model output against the memorial gold standard.
It is used by `__tests__/scripts/eval.test.js` to verify the evaluation harness
produces the expected accuracy metrics (≥ 0.85 overall accuracy gate).

Top-level keys: `version`, `description`, `created`, `notes`, `extracted_records`.

Each `extracted_records` element:

| Key | Type | Description |
|-----|------|-------------|
| `id` | string | Must match a `gold-standard/memorials.json` record id |
| `source_type` | string | Source type |
| `extracted` | object | Map of field name → extracted value |
| `needs_review` | 0\|1 | Whether the system flagged this record |

## Adding New Records

See `docs/evaluation.md` → "Extending the Gold Standard" for the step-by-step process.

Key constraints:
- `id` must be unique across the file.
- `expected` values must be verified manually against the original image.
- After adding to the gold standard, update `fixtures/ci-baseline.json` accordingly.
- Run `npm test` and `npm run eval:check` to confirm the CI floor is still met.
