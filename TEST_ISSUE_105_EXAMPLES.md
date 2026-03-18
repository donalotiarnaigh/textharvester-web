# Issue #105 Testing: Expected Output Examples

This document shows the exact CLI output you should see when testing the duplicate detection implementation.

---

## Example 1: Successful First Processing

**Command:**
```bash
npm run cli -- ingest "sample_data/source_sets/memorials/page_5.jpg" \
  --source-type memorial \
  --provider openai
```

**Expected Output:**
```
Ingesting files matching: sample_data/source_sets/memorials/page_5.jpg...

✓ Successfully processed: page_5.jpg
  - Type: memorial
  - Provider: openai
  - Model: gpt-4-vision
  - Confidence: 0.92

Summary:
  Processed: 1
  Succeeded: 1
  Failed: 0
  Duplicates: 0

Records stored:
  Memorial ID 1:
    - First name: John
    - Last name: Smith
    - Year: 1857
    - File: page_5.jpg
    - Provider: openai
```

---

## Example 2: Duplicate Rejection (Same File, Same Provider)

**Command:**
```bash
npm run cli -- ingest "sample_data/source_sets/memorials/page_5.jpg" \
  --source-type memorial \
  --provider openai
```

**Expected Output (AFTER first processing):**
```
Ingesting files matching: sample_data/source_sets/memorials/page_5.jpg...

✗ Processing failed: page_5.jpg
  Error: Duplicate entry
  Message: Duplicate memorial already exists for file page_5.jpg, provider openai

Summary:
  Processed: 1
  Succeeded: 0
  Failed: 1
  Duplicates: 1

ERROR: File was already processed with this provider.
Please use a different provider to process the same file,
or process a different file.
```

**Log Output (with --verbose flag):**
```
[WARN] Duplicate memorial skipped: Duplicate entry: memorial already exists
       for file page_5.jpg, provider openai
[INFO] Cleaned up processed file: sample_data/source_sets/memorials/page_5.jpg
[INFO] Processing completed with 1 error (duplicate)
```

---

## Example 3: Same File, Different Provider (SUCCESS)

**Command (Step 1):**
```bash
npm run cli -- ingest "sample_data/source_sets/memorials/page_6.jpg" \
  --source-type memorial \
  --provider openai
```

**Output:**
```
✓ Successfully processed: page_6.jpg
  Provider: openai
  Memorial ID: 2
```

**Command (Step 2):**
```bash
npm run cli -- ingest "sample_data/source_sets/memorials/page_6.jpg" \
  --source-type memorial \
  --provider anthropic
```

**Output (Notice: SUCCESS, not duplicate error):**
```
✓ Successfully processed: page_6.jpg
  Provider: anthropic
  Memorial ID: 3

Summary:
  Processed: 1
  Succeeded: 1
  Failed: 0
  Duplicates: 0  ← Not counted as duplicate!
```

**Explanation**: Same file, but DIFFERENT provider = allowed (by design).

---

## Example 4: Query Results After Tests

**Command:**
```bash
npm run cli -- query list --source-type memorial
```

**Output (after running Examples 1-3):**
```
Memorials (3 records):

ID │ First Name │ Last Name │ Year │ File Name    │ Provider   │ Confidence
───┼────────────┼───────────┼──────┼──────────────┼────────────┼──────────
 1 │ John       │ Smith     │ 1857 │ page_5.jpg   │ openai     │ 0.92
 2 │ Jane       │ Doe       │ 1923 │ page_6.jpg   │ openai     │ 0.88
 3 │ Jane       │ Doe       │ 1923 │ page_6.jpg   │ anthropic  │ 0.91

Key observations:
✓ ID 1: page_5.jpg + openai (only one record for this combo)
✓ ID 2 & 3: page_6.jpg appears TWICE with different providers
✓ Total: 3 records (no accidental duplicates)
```

---

## Example 5: Database-Level Verification

**Check UNIQUE Index:**
```bash
sqlite3 data/memorials.db "SELECT sql FROM sqlite_master WHERE name='idx_memorials_file_provider';"
```

**Expected Output:**
```
CREATE UNIQUE INDEX idx_memorials_file_provider ON memorials(file_name, ai_provider)
```

**List all indexes:**
```bash
sqlite3 data/memorials.db ".indices memorials"
```

**Expected Output:**
```
idx_memorials_file_provider
sqlite_autoindex_memorials_1
```

**Verify constraint works at DB level:**
```bash
# Try to manually insert duplicate (should fail)
sqlite3 data/memorials.db "INSERT INTO memorials (file_name, ai_provider, first_name) VALUES ('page_5.jpg', 'openai', 'Test');"
```

**Expected Error:**
```
Error: UNIQUE constraint failed: memorials(file_name, ai_provider)
```

---

## Example 6: Verbose Logging Output

**Command:**
```bash
npm run cli -- ingest "sample_data/source_sets/memorials/page_7.jpg" \
  --source-type memorial \
  --provider openai \
  --verbose
```

**Expected Detailed Log Output:**
```
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Starting file processing
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Reading file: sample_data/source_sets/memorials/page_7.jpg (size: 355KB)
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Encoding image to base64
[DEBUG] [pid:550e8400-e29b-41d4-a716-446655440000] Image encoded: 473KB
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Sending to OpenAI Vision API
[DEBUG] [pid:550e8400-e29b-41d4-a716-446655440000] API request body size: 485KB
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] OpenAI API call completed in 2847ms
[DEBUG] [pid:550e8400-e29b-41d4-a716-446655440000] Raw response (2150 bytes)...
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Validating response structure
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Response validated successfully
[DEBUG] [pid:550e8400-e29b-41d4-a716-446655440000] Extracted fields: first_name, last_name, year_of_death...
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Storing memorial in database
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Successfully stored memorial with ID: 4
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Cleaned up processed file
[INFO] [pid:550e8400-e29b-41d4-a716-446655440000] Processing completed successfully
```

**When Same File Processed Again (Duplicate):**
```
[INFO] [pid:660e9411-e39c-41d4-a716-446655440001] Starting file processing
[INFO] [pid:660e9411-e39c-41d4-a716-446655440001] Reading file: sample_data/source_sets/memorials/page_7.jpg
...
[INFO] [pid:660e9411-e39c-41d4-a716-446655440001] Successfully stored memorial with ID: 4
[INFO] [pid:660e9411-e39c-41d4-a716-446655440001] Cleaned up processed file
↑ Shows success, but next attempt shows:

[WARN] [pid:770e0522-e49d-41d4-a716-446655440002] Duplicate memorial skipped: Duplicate entry:
       memorial already exists for file page_7.jpg, provider openai
[INFO] [pid:770e0522-e49d-41d4-a716-446655440002] Cleaned up processed file
[ERROR] [pid:770e0522-e49d-41d4-a716-446655440002] Processing error: duplicate
```

Key detail: Processing IDs (pid) change on each run, allowing you to trace specific files through logs.

---

## Example 7: CSV Export After Duplicate Attempt

**Command:**
```bash
npm run cli -- export memorials --output memorial_export.csv
```

**Output:**
```
✓ Exported 3 memorials to memorial_export.csv
```

**File Content:**
```csv
id,memorial_number,first_name,last_name,year_of_death,file_name,ai_provider
1,NULL,John,Smith,1857,page_5.jpg,openai
2,NULL,Jane,Doe,1923,page_6.jpg,openai
3,NULL,Jane,Doe,1923,page_6.jpg,anthropic
```

**Key Observation:**
- 3 rows (header + 2 data)
- No duplicate rows despite attempting to re-ingest page_5.jpg
- Each (file_name, provider) combination appears exactly once

---

## Example 8: Error Handling (Graceful Failure)

**Scenario: Processing fails on duplicate (not a crash)**

```bash
# Terminal window shows:
npm run cli -- ingest "sample_data/source_sets/memorials/page_5.jpg" \
  --source-type memorial --provider openai

✗ Processing failed: page_5.jpg
  Reason: Duplicate entry

$ echo $?
1  ← Non-zero exit code (expected for errors)
```

**Important**: Application does NOT crash; it returns gracefully with exit code 1.

**Application remains running** - you can process other files immediately:
```bash
$ npm run cli -- ingest "sample_data/source_sets/memorials/page_8.jpg" \
  --source-type memorial --provider openai

✓ Successfully processed: page_8.jpg
```

---

## Example 9: Initialization Log (First Run)

When database initializes for the first time, you'll see:

```
[INFO] Connected to SQLite database
[INFO] Memorials table initialized
[INFO] Migration add_cost_columns_v1: completed
[INFO] memorials: removed 0 duplicates  ← (0 if DB is fresh)
[INFO] memorials: unique index on (file_name, ai_provider) ensured
[INFO] Burial register entries table initialized
[INFO] Grave cards table initialized
[INFO] grave_cards: unique index on (file_name, ai_provider) ensured
[INFO] All database tables initialized and ready
```

**If importing old database WITH duplicates:**
```
[INFO] memorials: removed 5 duplicates  ← Migration cleaned up old data
[INFO] memorials: unique index on (file_name, ai_provider) ensured
```

---

## Example 10: Automated Test Script Output

**Command:**
```bash
bash scripts/test-issue-105.sh --verbose
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║  Issue #105: Enforce Filename-Based Identity - Test Suite  ║
╚════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verifying Prerequisites
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ npm is available
✓ sqlite3 is available
✓ Sample data directory exists
✓ API key is configured

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 1: Memorial Duplicate Detection (Same Provider)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Processing sample_data/source_sets/memorials/page_5.jpg (first time)...
✓ First ingestion succeeded
ℹ Processing sample_data/source_sets/memorials/page_5.jpg (second time)...
✓ Duplicate was correctly rejected
✓ Only 1 record exists in database (no duplicate created)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 2: Memorial Different Providers (Same File)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Processing sample_data/source_sets/memorials/page_6.jpg with openai...
✓ Processing with provider 1 succeeded
ℹ Processing sample_data/source_sets/memorials/page_6.jpg with anthropic...
✓ Processing with provider 2 succeeded (same file, different provider)
✓ 2 records exist for same file with different providers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 3: Database Schema Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Database file exists
✓ Memorials table has UNIQUE index on (file_name, ai_provider)
✓ Grave cards table has UNIQUE index on (file_name, ai_provider)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Test 4: Automated Test Suite
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ Running Jest tests for issue #105...
✓ All duplicate detection tests passed

╔════════════════════════════════════════════════════════════╗
║                    ✓ ALL TESTS PASSED                      ║
╚════════════════════════════════════════════════════════════╝
```

---

## Troubleshooting: What To Do If Output Differs

### Issue: Duplicate NOT rejected (still allows second insert)
**Likely Cause**: UNIQUE index not created
**Fix**:
```bash
sqlite3 data/memorials.db "CREATE UNIQUE INDEX IF NOT EXISTS idx_memorials_file_provider ON memorials(file_name, ai_provider);"
```

### Issue: Application crashes instead of returning error
**Likely Cause**: Error not being caught in fileProcessing.js
**Fix**: Verify branch is correct:
```bash
git log --oneline | head -1
# Should show: "feat: enforce filename-based identity"
```

### Issue: Verbose logs don't show processing_id
**Likely Cause**: Old version of code
**Fix**: Pull latest:
```bash
git pull origin fix/issue-105-filename-based-identity
npm install
```

### Issue: CSV export shows duplicate records
**Likely Cause**: Duplicates weren't rejected (see "Application crashes" fix above)
**Fix**: Clear database and restart:
```bash
rm -f data/memorials.db
npm run cli -- query list  # Reinitialize
```

---

## Key Patterns to Look For

When testing, verify these outputs appear:

✅ **Success Pattern**:
```
✓ Successfully processed: [file]
Successfully stored memorial with ID: [n]
```

✅ **Duplicate Rejection Pattern**:
```
✗ Processing failed: [file]
Duplicate entry: [file] already exists
[WARN] Duplicate memorial skipped
```

✅ **Different Provider Pattern**:
```
✓ Successfully processed: [file]
Successfully stored memorial with ID: [n1]
✓ Successfully processed: [file]  (same file, different provider)
Successfully stored memorial with ID: [n2]
```

❌ **If you see a CRASH** (stacktrace):
This is NOT expected - verify you're on the correct branch.

---

**Next Steps:**
- Follow the test examples above
- Compare your actual output to expected output
- Report any significant differences
- File issues if test results don't match
