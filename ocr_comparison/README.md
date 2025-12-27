# OCR Comparison: Mistral vs GPT-5.1

Comprehensive comparison of Mistral OCR API and GPT-5.1 for grave card processing.

## Directory Structure

```
ocr_comparison/
├── scripts/          # Test and comparison scripts
└── docs/            # Results, reports, and raw data
```

## Quick Summary

**Finding:** GPT-5.1 significantly outperforms Mistral OCR for grave card extraction.

- **Mistral OCR**: Raw text extraction with typical OCR errors
- **GPT-5.1**: Intelligent extraction with error correction + structured data

## Scripts

### Test Scripts
- [`test_mistral_ocr.js`](scripts/test_mistral_ocr.js) - Basic Mistral OCR test
- [`test_mistral_ocr_structured.js`](scripts/test_mistral_ocr_structured.js) - Structured extraction attempt (document_annotation_format)
- [`test_mistral_bbox.js`](scripts/test_mistral_bbox.js) - Structured extraction attempt (bbox_annotation_format)

### Analysis Scripts
- [`compare_ocr_text.js`](scripts/compare_ocr_text.js) - Generate side-by-side OCR text comparison

**Usage:**
```bash
# Test Mistral OCR
MISTRAL_API_KEY=your_key node scripts/test_mistral_ocr.js "path/to/file.pdf"

# Generate comparison report
node scripts/compare_ocr_text.js
```

## Documentation

### Reports
- [`ocr_comparison_report.md`](docs/ocr_comparison_report.md) - Main comparison report with API test results
- [`ocr_text_comparison_all.md`](docs/ocr_text_comparison_all.md) - Raw OCR text comparison for all 5 files
- [`ocr_text_comparison.md`](docs/ocr_text_comparison.md) - Single file comparison (Section A_3)

### Raw Data
- [`gpt_results.json`](docs/gpt_results.json) - GPT-5.1 structured extraction results
- [`mistral_ocr_result.json`](docs/mistral_ocr_result.json) - Basic Mistral OCR output
- [`mistral_ocr_structured_result.json`](docs/mistral_ocr_structured_result.json) - Structured extraction attempt result
- [`mistral_bbox_result.json`](docs/mistral_bbox_result.json) - bbox_annotation_format test result

## Key Findings

### Mistral OCR Errors (Examples)
- "SESUS" → should be "JESUS"
- "SUN" → should be "SIN"
- "82 HEADSTONES" → should be "2 HEADSTONES"
- "SEANNIE" → should be "JEANNIE"
- "MADGE" → should be "WADGE"

### GPT-5.1 Advantages
1. ✅ Corrects OCR errors through contextual understanding
2. ✅ Fully structured JSON output matching schema
3. ✅ Semantic understanding (relationships, dates)
4. ✅ Data validation and normalization

## Recommendation

**For grave card processing:** Use GPT-5.1 for superior accuracy despite higher cost.

**Alternative:** Two-stage pipeline (Mistral OCR → GPT-5.1/Mistral Chat structuring) - requires benchmarking.

## Dataset

5 grave card PDFs from Section A (Douglas cemetery):
- Section A_2 (vacant)
- Section A_3 (Gray family, 4 interments)
- Section A_4 (vacant)
- Section A_5 (vacant)
- Section A_6 (Highet family, 6 interments)
