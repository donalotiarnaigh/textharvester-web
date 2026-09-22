# Evaluation Framework

Ground truth dataset and scoring tools for measuring TextHarvester extraction accuracy.

## Directory Layout

```
eval/
├── ground-truth/
│   ├── burial-registers/       # One .gt.json per source page image
│   ├── grave-cards/            # One .gt.json per source card image
│   └── memorials/              # One .gt.json per source memorial image
├── scripts/
│   ├── export-for-annotation.js  # Generate GT stubs from pipeline output
│   └── score.js                  # Scoring engine + CLI
├── reports/                    # Generated eval reports (gitignored)
└── README.md
```

## Quick Start

### 1. Generate a ground truth stub

Run a source image through the pipeline and produce an annotatable `.gt.json` file:

```bash
npm run eval:export -- --image path/to/image.jpg --type burial_register --provider openai
```

### 2. Annotate

Open the `.gt.json` file alongside the source image. Correct every field in the `corrected` section against what you can see in the image. Follow the [Transcription Guidelines](../docs/ground-truth-guidelines.md).

- Record changed field names in `corrections_made`
- Set `difficulty` (1–5)
- Add `annotator_notes` for anything unusual

### 3. Score

```bash
# Full report across all document types
npm run eval

# Single document type
npm run eval -- --type burial_register

# CI gate (exit 1 if overall accuracy < 0.85)
npm run eval:check
```

Reports are written to `eval/reports/`.

## Ground Truth File Format

Each `.gt.json` file represents one source image. Common envelope:

```json
{
  "schema_version": "1.0.0",
  "document_type": "burial_register",
  "image_ref": "relative/path/to/source.jpg",
  "annotator": "daniel",
  "annotation_date": "2026-04-14",
  "blind_transcribed": false,
  "difficulty": 3,
  "annotator_notes": "Faded ink in bottom third"
}
```

Document-type-specific fields contain `model_output`, `corrected`, and `corrections_made` at the entry level. See existing `.gt.json` files for examples.

## Metrics

- **Exact match**: fraction of fields where model output matches ground truth exactly
- **CER** (Character Error Rate): edit distance / reference length, for text fields
- **needs_review F1**: precision/recall of the model's review flagging vs actual corrections needed

## References

- [Transcription Guidelines](../docs/ground-truth-guidelines.md)
- [Issue #242](https://github.com/donalotiarnaigh/textharvester-web/issues/242)
