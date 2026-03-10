# Manual Testing Plan: DEBS Monument Classification Pipeline

## Overview
End-to-end test of the DEBS monument classification feature using real API calls with sample monument images.

## Prerequisites

### 1. Environment Setup
```bash
# Ensure you're in the project directory
cd /Users/danieltierney/projects/textharvester-web

# Verify API keys are available
echo "OpenAI API Key: ${OPENAI_API_KEY:0:10}..."
echo "Anthropic API Key: ${ANTHROPIC_API_KEY:0:10}..."
echo "Gemini API Key: ${GEMINI_API_KEY:0:10}..."
```

### 2. Sample Data Available
Monument photo samples are in: `sample_data/source_sets/monument_photos/`
- `ducltf-0420.jpg` — Good quality monument image
- `ducltf-0434.jpg` — Multiple monuments/details
- `ducltf-0435.jpg` — Large headstone with inscription
- `ducltf-0456.jpg` — Weathered monument
- `ducltf-0468.jpg` — Monument with decorative elements

## Test Phases

---

## Phase 1: Database Cleanup & Verification

### 1.1 Check Current Database State
```bash
# Check if monument_classifications table exists and is empty
sqlite3 data/memorials.db "SELECT COUNT(*) as count FROM monument_classifications;" 2>/dev/null || echo "Table may not exist yet"

# List any existing classifications (if present)
sqlite3 data/memorials.db "SELECT id, file_name, broad_type, processed_date FROM monument_classifications ORDER BY processed_date DESC LIMIT 5;" 2>/dev/null || true
```

### 1.2 Backup Existing Data (Optional)
```bash
# Backup database before testing
cp data/memorials.db data/memorials.db.backup.$(date +%s)
echo "Database backed up"
```

### 1.3 Clear Previous Test Data (Optional)
```bash
# Start fresh for clean test results
sqlite3 data/memorials.db "DELETE FROM monument_classifications WHERE processed_date > datetime('now', '-1 hour');" 2>/dev/null || true
echo "Old test data cleared (< 1 hour old)"
```

---

## Phase 2: Single Image Classification (OpenAI)

### 2.1 Classify a Single Monument Image
```bash
# Test with single image using OpenAI provider
node src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/ducltf-0435.jpg' \
  --source-type monument_classification \
  --provider openai
```

### 2.2 Expected Output
```
✓ Processing completed successfully
✓ 1 file(s) processed
✓ Estimated cost: $0.0X USD
```

### 2.3 Verify Database Storage
```bash
# Check if record was stored
sqlite3 data/memorials.db "SELECT id, file_name, broad_type, confidence_scores, needs_review FROM monument_classifications ORDER BY id DESC LIMIT 1;"

# Expected: One row with:
# - file_name: ducltf-0435.jpg
# - broad_type: Headstone (or similar)
# - confidence_scores: JSON string with confidence_level value
# - needs_review: 0 or 1 depending on confidence

# View full classification data (pretty-print JSON)
sqlite3 data/memorials.db "SELECT json_pretty(json_extract(data_json, '$')) FROM monument_classifications ORDER BY id DESC LIMIT 1;"
```

---

## Phase 3: Batch Processing (Multiple Images)

### 3.1 Process All Monument Photos
```bash
# Batch process all monument photos
node src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/*.jpg' \
  --source-type monument_classification \
  --provider openai \
  --clear  # Optional: clear previous results first
```

### 3.2 Monitor Progress
```bash
# In another terminal, check progress endpoint (if server running)
curl http://localhost:3000/progress 2>/dev/null | jq '.progress, .state'

# Or check database in real-time
watch -n 2 "sqlite3 data/memorials.db \"SELECT COUNT(*) as processed FROM monument_classifications WHERE processed_date > datetime('now', '-5 minutes');\""
```

### 3.3 Verify Batch Results
```bash
# Count total classifications
sqlite3 data/memorials.db "SELECT COUNT(*) as total FROM monument_classifications;"

# View summary of batch
sqlite3 data/memorials.db "
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN needs_review = 1 THEN 1 ELSE 0 END) as flagged_for_review,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    ROUND(SUM(estimated_cost_usd), 6) as total_cost_usd
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour');
"

# Expected: All images processed, cost < $1 per image
```

---

## Phase 4: Query & Retrieval

### 4.1 List All Classifications
```bash
# Via CLI
node src/cli/index.js query list --source-type monument_classification --limit 10

# Expected: Table showing all recent classifications with:
# - ID, broad_type, material_primary, height_mm, confidence_level, needs_review
```

### 4.2 Query Specific Records
```bash
# Get record by ID (use ID from previous list)
node src/cli/index.js query get 1 --source-type monument_classification

# Expected: Full JSON dump of that monument's classification
```

### 4.3 Filter by Review Flag
```bash
# List only records flagged for review
node src/cli/index.js query list --source-type monument_classification --needs-review

# Expected: Only records with needs_review = 1 (Low confidence or validation warnings)
```

---

## Phase 5: Data Validation Tests

### 5.1 Verify Confidence Scoring
```bash
# Check confidence_level mapping
sqlite3 data/memorials.db "
  SELECT
    data_json ->> '$.confidence_level' as confidence_level,
    json_extract(confidence_scores, '$.confidence_level') as numeric_score,
    COUNT(*) as count
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour')
  GROUP BY data_json ->> '$.confidence_level';
"

# Expected:
# - High → 1.0
# - Medium → 0.75
# - Low → 0.3 (should have needs_review = 1)
```

### 5.2 Verify Field Extraction
```bash
# Check that 20 DEBS fields are present
sqlite3 data/memorials.db "
  SELECT
    file_name,
    data_json ->> '$.broad_type' as broad_type,
    data_json ->> '$.material_primary' as material,
    data_json ->> '$.height_mm' as height_mm,
    data_json ->> '$.letter_style' as letter_style,
    data_json ->> '$.confidence_level' as confidence
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour')
  LIMIT 3;
"

# Expected: All 20 DEBS fields populated (nulls OK for optional fields)
```

### 5.3 Verify [FV] Tag Extraction
```bash
# Check field_verify_flags extraction
sqlite3 data/memorials.db "
  SELECT
    file_name,
    json_extract(data_json, '$.field_verify_flags') as uncertain_fields
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour')
  AND json_extract(data_json, '$.field_verify_flags') IS NOT NULL;
"

# Expected: Shows which fields model flagged as uncertain with [FV] prefix
```

### 5.4 Verify Processing_ID Tracing
```bash
# Check processing_id is attached
sqlite3 data/memorials.db "
  SELECT
    file_name,
    processing_id,
    json_extract(data_json, '$.processing_id') as data_processing_id
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour')
  LIMIT 1;
"

# Expected: Both column and JSON field have matching UUID
```

---

## Phase 6: Cost Tracking Verification

### 6.1 Verify Token Counts
```bash
# Check token counts for a recent classification
sqlite3 data/memorials.db "
  SELECT
    file_name,
    input_tokens,
    output_tokens,
    estimated_cost_usd,
    ai_provider
  FROM monument_classifications
  WHERE processed_date > datetime('now', '-1 hour')
  LIMIT 5;
"

# Expected:
# - input_tokens: 2000-3000 (monument image + DEBS schema prompt)
# - output_tokens: 300-500 (20 DEBS fields)
# - estimated_cost_usd: $0.01-0.05 per image (GPT-4V pricing)
```

### 6.2 Check Cost Config
```bash
# Verify pricing rates are loaded from config
grep -A 10 '"openai"' config.json | grep -A 5 "gpt-4-vision"

# Expected output shows input/output per-token pricing
```

---

## Phase 7: Export & Integration

### 7.1 Export as JSON
```bash
# Download all monument classifications as JSON
curl http://localhost:3000/download-json 2>/dev/null > monuments_export.json

# Or via CLI (if available)
node src/cli/index.js export monuments --format json --output monuments_export.json

# Verify structure
jq '.[0] | keys' monuments_export.json | head -20

# Expected: All 20 DEBS fields + metadata fields visible
```

### 7.2 Export as CSV
```bash
# Download as CSV
curl http://localhost:3000/download-csv 2>/dev/null > monuments_export.csv

# Or via CLI
node src/cli/index.js export monuments --format csv --output monuments_export.csv

# Verify CSV has correct columns
head -1 monuments_export.csv | tr ',' '\n' | head -20

# Expected: MONUMENT_CLASSIFICATION_CSV_COLUMNS in order:
# memorial_number, broad_type, detailed_type, ...confidence_level, comments, ...
```

### 7.3 Verify Auto-Detection
```bash
# Confirm source type auto-detection works
# Upload a monument image via web UI or API
# Check that results show "sourceType: monument_classification"

curl -s http://localhost:3000/results-data 2>/dev/null | jq '.sourceType'

# Expected: "monument_classification"
```

---

## Phase 8: Multi-Provider Comparison (Optional)

### 8.1 Test with Anthropic
```bash
# Process same image with Claude
node src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/ducltf-0420.jpg' \
  --source-type monument_classification \
  --provider anthropic
```

### 8.2 Test with Gemini
```bash
# Process same image with Gemini
node src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/ducltf-0420.jpg' \
  --source-type monument_classification \
  --provider gemini
```

### 8.3 Compare Results
```bash
# Get latest 3 classifications for ducltf-0420.jpg
sqlite3 data/memorials.db "
  SELECT
    ai_provider,
    data_json ->> '$.broad_type' as broad_type,
    data_json ->> '$.material_primary' as material,
    data_json ->> '$.confidence_level' as confidence,
    input_tokens,
    output_tokens,
    estimated_cost_usd
  FROM monument_classifications
  WHERE file_name LIKE '%ducltf-0420%'
  ORDER BY processed_date DESC
  LIMIT 3;
"

# Compare: Which provider gives most confident, lowest cost response?
```

---

## Phase 9: Edge Cases & Error Handling

### 9.1 Test Invalid Image
```bash
# Try with non-image file
touch sample_test_invalid.txt
echo "not an image" > sample_test_invalid.txt

node src/cli/index.js ingest \
  'sample_test_invalid.txt' \
  --source-type monument_classification \
  --provider openai 2>&1 | grep -i "error"

# Expected: Graceful error, file skipped
```

### 9.2 Test with Corrupt Image
```bash
# Create a truncated/corrupt image
dd if=/Users/danieltierney/projects/textharvester-web/sample_data/source_sets/monument_photos/ducltf-0420.jpg \
   of=sample_corrupt.jpg \
   bs=1024 \
   count=10

node src/cli/index.js ingest \
  'sample_corrupt.jpg' \
  --source-type monument_classification \
  --provider openai 2>&1

# Expected: API error handled gracefully, logged
```

### 9.3 Test with Invalid Confidence Response
```bash
# Manually insert a record with invalid confidence_level to test validation
sqlite3 data/memorials.db "
  INSERT INTO monument_classifications
    (file_name, broad_type, data_json, ai_provider)
  VALUES
    ('test_invalid.jpg', 'Headstone',
     '{\"broad_type\":\"Headstone\",\"confidence_level\":\"INVALID\"}',
     'test');
"

# Query to see how system handles it
sqlite3 data/memorials.db "
  SELECT
    file_name,
    json_extract(data_json, '$.confidence_level') as raw_confidence,
    json_extract(confidence_scores, '$.confidence_level') as numeric_confidence
  FROM monument_classifications
  WHERE file_name = 'test_invalid.jpg';
"

# Expected: Invalid level defaults to Medium (0.75) without crashing
```

---

## Phase 10: Performance & Logging

### 10.1 Check Processing Speed
```bash
# Measure time for single image
time node src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/ducltf-0435.jpg' \
  --source-type monument_classification \
  --provider openai

# Expected: 5-15 seconds total (includes API call + storage)
# Breakdown:
# - API call: 3-8 seconds
# - Image encoding: <1 second
# - Database storage: <1 second
```

### 10.2 Check Logs
```bash
# Verify scoped logger is working
grep "\[pid:" logs/app.log 2>/dev/null | tail -10

# Expected: Log lines prefixed with [pid:XXXXXXXX] showing processing steps
```

### 10.3 Monitor Memory Usage
```bash
# Start memory profiler
node --max-old-space-size=512 src/cli/index.js ingest \
  'sample_data/source_sets/monument_photos/*.jpg' \
  --source-type monument_classification \
  --provider openai

# Check peak memory in logs
grep "memory\|heap" logs/app.log 2>/dev/null | tail -5
```

---

## Phase 11: Integration with Existing Features

### 11.1 Verify It Doesn't Break Other Source Types
```bash
# Process a memorial OCR image to ensure monument_classification doesn't interfere
node src/cli/index.js ingest \
  'sample_data/source_sets/memorials/page_5.jpg' \
  --source-type record_sheet \
  --provider openai

# Verify still works
sqlite3 data/memorials.db "SELECT COUNT(*) FROM memorials WHERE processed_date > datetime('now', '-5 minutes');"

# Expected: New memorial records created alongside monument records
```

### 11.2 Check Results Endpoint Respects sourceType
```bash
# Query memorials
curl -s 'http://localhost:3000/results-data?sourceType=memorial' | jq '.sourceType, (.memorials | length)'

# Query monuments
curl -s 'http://localhost:3000/results-data?sourceType=monument_classification' | jq '.sourceType, (.monuments | length)'

# Expected: Each query returns correct source type
```

---

## Cleanup & Reporting

### Data Cleanup
```bash
# Optional: Remove test data
sqlite3 data/memorials.db "
  DELETE FROM monument_classifications
  WHERE processed_date > datetime('now', '-2 hours');
"

# Or restore backup
# cp data/memorials.db.backup.[timestamp] data/memorials.db
```

### Generate Summary Report
```bash
# Quick summary
echo "=== DEBS Monument Classification Test Summary ==="
echo "Total classifications: $(sqlite3 data/memorials.db 'SELECT COUNT(*) FROM monument_classifications')"
echo "Flagged for review: $(sqlite3 data/memorials.db 'SELECT COUNT(*) FROM monument_classifications WHERE needs_review = 1')"
echo "Total cost: $$(sqlite3 data/memorials.db 'SELECT ROUND(SUM(estimated_cost_usd), 2) FROM monument_classifications')"
echo "Avg confidence: $(sqlite3 data/memorials.db 'SELECT json_extract(confidence_scores, "$.confidence_level") FROM monument_classifications LIMIT 1')"
echo ""
echo "Sample record:"
sqlite3 data/memorials.db "SELECT json_pretty(json_extract(data_json, '$')) FROM monument_classifications LIMIT 1;" | head -30
```

---

## Success Criteria

✅ **All tests pass if:**
- [ ] All 5 monument images processed successfully
- [ ] 20 DEBS fields extracted for each image
- [ ] Confidence scores map correctly (High/Medium/Low → 1.0/0.75/0.3)
- [ ] Low confidence triggers needs_review flag
- [ ] [FV] tags preserved and field_verify_flags populated correctly
- [ ] processing_id attached and traceable in logs
- [ ] Cost tracking accurate (tokens and USD estimates)
- [ ] JSON/CSV exports complete and valid
- [ ] Query commands return correct records
- [ ] No interference with other source types
- [ ] Error handling graceful (invalid images, API failures)
- [ ] Performance acceptable (~5-15s per image)

---

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| "Cannot find module monumentClassificationStorage" | Import missing in server.js | Check server.js initialization |
| API returns empty classification | Model output invalid | Check prompt format in MonumentClassificationPrompt |
| needs_review always 0 | Confidence threshold logic wrong | Check config.confidence.reviewThreshold (should be 0.70) |
| Token counts 0 | Usage not captured | Verify provider returns `{ content, usage }` |
| [FV] tags not extracted | Regex not matching | Check pattern `[FV]` prefix in validateAndConvert |
| Export fails | Source type not added to resultsManager | Check monument_classification branch in all export functions |

