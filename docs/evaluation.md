# Extraction Accuracy Evaluation

_Issue #121 — Added 2026-03-02_

## Overview

The evaluation harness measures how accurately the AI extraction pipeline transcribes
field values from gravestone memorials and burial register pages. It compares
AI-extracted records against a hand-labelled **gold standard** dataset using:

- **Field-level accuracy** — Fraction of records where the extracted value exactly matches the ground truth.
- **Average Character Error Rate (CER)** — Mean edit distance (character-level) between extracted and ground-truth text, normalised by ground-truth length. Useful for long string fields such as `inscription`.
- **needs_review precision/recall** — How reliably the system flags uncertain records for human review.

---

## Gold Standard Dataset

Location: `eval/gold-standard/`

| File | Records | Source type | Status |
|------|---------|-------------|--------|
| `memorials.json` | 0 | `memorial_ocr` | Pending — awaiting dataset from local community group |
| `burial-register.json` | 0 | `burial_register` | Pending |

The schema and evaluation infrastructure are in place. Once hand-labelled records are
received from the community group, add them to the relevant file following the schema
in `eval/README.md`. All data-dependent tests and the CI accuracy gate activate
automatically once `records` is non-empty.

---

## Running the Evaluation

### Against the CI baseline fixture (no API calls required)

```bash
npm run eval
```

This compares the committed `ci-baseline.json` fixture against the gold standard
and prints a field-level accuracy report.

### Against live database records

```bash
node scripts/eval.js \
  --gold  eval/gold-standard/memorials.json \
  --input <path-to-extracted-results.json> \
  --floor 0.85
```

The extracted results JSON must be an object with an `extracted_records` array,
each element having the shape:

```json
{
  "id": "<gold-standard-record-id>",
  "source_type": "memorial_ocr",
  "extracted": {
    "first_name": "JOHN",
    "last_name": "MURPHY",
    "year_of_death": 1923,
    "inscription": "In loving memory of John Murphy..."
  },
  "needs_review": 0
}
```

### Saving a JSON report

```bash
node scripts/eval.js --output reports/eval-$(date +%Y%m%d).json
```

---

## CI Integration

The `eval` tests in `__tests__/scripts/eval.test.js` run as part of `npm test`.
Tests that require populated gold-standard data are gated on `records.length > 0`
and skip gracefully until real data is committed.

Once the gold standard is populated, re-enable the accuracy gate in CI by adding
this step back to `.github/workflows/ci.yml` (after `Run tests`):

```yaml
- name: Eval accuracy gate
  run: npm run eval:check
```

`eval:check` exits with code 1 if overall accuracy drops below **0.85**, blocking
the PR. Also populate `eval/fixtures/ci-baseline.json` with pre-computed model
outputs so the gate has a baseline to compare against.

---

## Metrics Explained

### Character Error Rate (CER)

```
CER = levenshteinDistance(extracted, groundTruth) / len(groundTruth)
```

- `0.0` — Exact match.
- `0.25` — One character substitution in a 4-character string.
- `1.0` — Extracted value completely absent (`null` or empty string).
- `> 1.0` — Possible for heavily hallucinated text (insertions exceed GT length).

### Field-level accuracy

Exact match rate: `exactMatches / total` where "exact" means CER = 0 for strings,
and strict equality (`===`) for numeric fields.

### needs_review precision / recall

- **Precision** — Of all records flagged `needs_review = 1`, what fraction should
  actually be reviewed?
- **Recall** — Of all records that should be reviewed, what fraction were caught?
- **F1** — Harmonic mean of precision and recall.

---

## reviewThreshold Rationale

`config.json` sets `confidence.reviewThreshold = 0.70`.

The threshold is grounded in the confidence scale embedded in all prompt templates
(MemorialOCRPrompt, BurialRegisterPrompt, etc.):

| Confidence range | Prompt interpretation |
|---|---|
| 0.90 – 1.00 | Clearly legible; high confidence |
| 0.70 – 0.89 | Readable but may contain minor transcription errors |
| 0.50 – 0.69 | Uncertain; significant transcription doubt |
| < 0.50 | Unreadable or heavily damaged |

Records below 0.70 sit in the "uncertain" band and warrant human review. Records
between 0.70 and 0.89 are flagged only if at least one field is below the threshold.

**Empirical calibration (Phase 2):** Once the gold standard dataset is extended to
50+ records and real model outputs are available, compute precision/recall at
candidate thresholds (0.60, 0.65, 0.70, 0.75, 0.80) and select the value that
maximises F1 on the `needs_review` task. Update this document and `config.json` with
the result.

---

## Extending the Gold Standard

1. Process an image through the system (or export from the DB).
2. Manually verify each extracted field against the original image.
3. Add a record to `data/eval/gold-standard/memorials.json` (or `burial-register.json`)
   following the existing schema (id, source_type, image_ref, description,
   expected_needs_review, expected fields).
4. Update `data/eval/fixtures/ci-baseline.json` to include a corresponding
   extracted record that represents realistic model output.
5. Re-run `npm test` and `npm run eval:check` to confirm the floor is still met.

See `eval/README.md` for schema reference and provenance guidelines.
