# Manual Testing Guide — Issue #104 Global Error Taxonomy

## Overview
This guide tests fatal vs transient error handling by using real API calls with intentional error conditions.

## Setup

### Prerequisites
- Valid API keys for at least one provider (OpenAI recommended for testing)
- A test image file (e.g., `test_memorial.jpg` from `test_exports/` or any JPEG)
- Config.json set up with your API key
- Clear logs: `rm -f logs/app.log` (optional, for cleaner output)

### Sample Test Image
Use any image from the test_exports directory:
```bash
ls test_exports/
# Sample output: test_memorial.jpg, test_register.jpg, etc.
```

---

## Test Scenarios

### Scenario 1: AUTH ERROR (401/403) — Fatal, No Retries

**Goal:** Verify that an invalid API key causes immediate failure without retries.

**Setup:**
```bash
# Temporarily break the API key in config.json
cp config.json config.json.backup
# Edit config.json: set OPENAI_API_KEY to "invalid_key_xyz"
```

**Test Command:**
```bash
npm run cli -- process --file test_exports/test_memorial.jpg --provider openai 2>&1 | tee /tmp/auth_test.log
```

**Expected Behavior:**
- ❌ Error appears immediately: "Unauthorized" or "Invalid API key"
- ✅ No "Retry" messages in logs
- ✅ Only 1 attempt shown (no retries)
- ✅ Error message contains `FatalError` or `auth_error`

**Verify in logs:**
```bash
grep -i "fatal\|auth_error\|unauthorized" /tmp/auth_test.log
grep -i "retry" /tmp/auth_test.log  # Should be EMPTY
```

**Restore config:**
```bash
mv config.json.backup config.json
```

---

### Scenario 2: CONFIG ERROR (Invalid Model) — Fatal, No Retries

**Goal:** Verify that an invalid model name causes immediate failure.

**Setup:**
```bash
# Edit config.json: set OPENAI_MODEL to "gpt-invalid-99999"
cp config.json config.json.backup
# Make the change, test, then restore
```

**Test Command:**
```bash
npm run cli -- process --file test_exports/test_memorial.jpg --provider openai 2>&1 | tee /tmp/config_test.log
```

**Expected Behavior:**
- ❌ Error: "Invalid model specified" or similar
- ✅ No retry attempts
- ✅ Log shows `FatalError` or `config_error`
- ✅ Single attempt only

**Verify:**
```bash
grep -i "fatal\|config_error\|invalid model" /tmp/config_test.log
grep -i "retry" /tmp/config_test.log  # Should be EMPTY
```

**Restore:**
```bash
mv config.json.backup config.json
```

---

### Scenario 3: VALIDATION ERROR — Fatal After Retries Exhausted

**Goal:** Verify that validation failures after all retries are marked as fatal (no queue retries).

**Setup:**
Create a malformed image or use a blank image that will fail OCR validation:
```bash
# Create a blank white image (will return empty/unreadable)
convert -size 100x100 xc:white test_exports/blank.jpg

# Or use an existing image and monitor logs
```

**Test Command:**
```bash
npm run cli -- process --file test_exports/blank.jpg --provider openai 2>&1 | tee /tmp/validation_test.log
```

**Expected Behavior:**
- First attempt: `processImage()` succeeds but returns no readable text
- Second attempt: (validation retry) adds preamble, tries again, still fails
- After 2nd failure: Error wrapped as `FatalError` with type `validation_exhausted`
- ✅ No queue-level retries (file not re-enqueued)
- ✅ Error result added to `processedResults`
- ✅ File cleaned up

**Verify:**
```bash
grep "validation_exhausted\|Validation failed after all retries" /tmp/validation_test.log
grep "empty\|no readable text" /tmp/validation_test.log
grep "enqueueFileForRetry" /tmp/validation_test.log  # Should NOT appear for this file
```

**Check database** (validation errors are stored as error results, not fatal throws):
```bash
sqlite3 data/ocr_memorials.db "SELECT * FROM memorials WHERE fileName = 'blank.jpg';" 2>/dev/null || echo "No DB entry (validation-exhausted is error result, not stored)"
```

---

### Scenario 4: RATE LIMIT ERROR (429) — Transient, Retries

**Goal:** Verify that rate limit errors trigger retries (not fatal).

**Challenge:** Hard to trigger naturally. Options:
1. **Fastest:** Set `maxProviderRetries: 0` temporarily in config.json to simulate immediate failure on next error
2. **Realistic:** Send many concurrent requests to trigger rate limit (only works with paid tier)

**Setup Option A (Quick):**
```bash
# Edit config.json
"retry": {
  "maxProviderRetries": 2,
  "validationRetries": 1,
  ...
}
```

**Setup Option B (Realistic):**
Concurrently process multiple files to naturally trigger rate limit:
```bash
# Copy test image multiple times
for i in {1..10}; do cp test_exports/test_memorial.jpg test_exports/test_$i.jpg; done

# Process all at once
npm run cli -- process --files test_exports/test_*.jpg --provider openai 2>&1 | tee /tmp/ratelimit_test.log
```

**Expected Behavior (with valid config):**
- First attempt fails with "429" or "Rate limit"
- ✅ Logs show: "Retry 1/2 after rate_limit error, waiting 1000ms"
- ✅ Retry attempts shown (NOT fatal immediately)
- ✅ May succeed on retry 2, or fail after exhausting retries

**Verify:**
```bash
grep "rate_limit\|Retry.*rate_limit" /tmp/ratelimit_test.log
grep -c "Retry" /tmp/ratelimit_test.log  # Should show multiple retries
```

---

### Scenario 5: TIMEOUT ERROR — Transient, Retries

**Goal:** Verify that timeout errors trigger retries (not fatal).

**Setup:**
Set a very short timeout in config.json to simulate network delays:
```json
"openAI": {
  "timeout": 1  // 1ms — will always timeout
}
```

**Test Command:**
```bash
npm run cli -- process --file test_exports/test_memorial.jpg --provider openai 2>&1 | tee /tmp/timeout_test.log
```

**Expected Behavior:**
- First attempt: Timeout after 1ms
- ✅ Logs show: "Retry 1/3 after timeout error, waiting 500ms"
- ✅ Multiple retry attempts
- ✅ Will eventually exhaust retries (can't succeed with 1ms timeout)
- ✅ Final error is wrapped as `FatalError` (exhausted provider retries)

**Verify:**
```bash
grep "timeout\|Retry.*timeout" /tmp/timeout_test.log
grep -c "Retry" /tmp/timeout_test.log  # Should show 3 retries
```

**Restore timeout:**
```bash
# Edit config.json: set timeout back to 30000 (30 seconds)
```

---

### Scenario 6: Normal Success Path — No Retries Needed

**Goal:** Verify that successful processing doesn't trigger retries.

**Test Command:**
```bash
npm run cli -- process --file test_exports/test_memorial.jpg --provider openai 2>&1 | tee /tmp/success_test.log
```

**Expected Behavior:**
- ✅ API call succeeds on first attempt
- ✅ No "Retry" messages in logs
- ✅ Validation succeeds
- ✅ Data stored in database
- ✅ File cleaned up

**Verify:**
```bash
grep "completed successfully\|stored in database" /tmp/success_test.log
grep -i "retry\|error" /tmp/success_test.log  # Should be empty or only unrelated messages
```

---

## Integration Test: Queue-Level Behavior

### Test that fatal errors don't queue-retry

**Setup:**
Break API key again, then process multiple files in a batch:
```bash
# Edit config.json: invalid API key
cp config.json config.json.backup

# Create 3 test files
cp test_exports/test_memorial.jpg test_exports/batch_1.jpg
cp test_exports/test_memorial.jpg test_exports/batch_2.jpg
cp test_exports/test_memorial.jpg test_exports/batch_3.jpg
```

**Test Command:**
```bash
npm run cli -- process --files test_exports/batch_*.jpg --provider openai 2>&1 | tee /tmp/queue_test.log
```

**Expected Behavior:**
- All 3 files fail immediately with auth error
- ✅ No queue-level retries (file not re-enqueued)
- ✅ All 3 errors appear in results
- ✅ Processing completes quickly (no retries = no delays)
- ✅ Files cleaned up

**Verify:**
```bash
grep "enqueueFileForRetry" /tmp/queue_test.log  # Should be EMPTY
grep "Fatal error\|fatal" /tmp/queue_test.log  # Should appear 3 times
grep -i "auth_error\|unauthorized" /tmp/queue_test.log
```

**Restore:**
```bash
mv config.json.backup config.json
```

---

## Log Inspection Checklist

After each test, check logs for:

### Fatal Error Indicators ✅
```bash
grep -i "fatal\|FatalError" logs/app.log
# Should show:
# - "fatal" in error catch block
# - error type (auth_error, config_error, etc.)
# - Message about skipping retries
```

### Retry Behavior ✅
```bash
grep -i "Retry" logs/app.log
# Count of retries should match error type:
# - Auth error: 0 retries (fatal immediately)
# - Config error: 0 retries (fatal immediately)
# - Rate limit: up to 3 retries (transient)
# - Timeout: up to 3 retries (transient)
```

### Validation Retry ✅
```bash
grep -i "validation failed\|format-enforcement" logs/app.log
# Should show:
# - First validation failure
# - Retry with preamble
# - Either success or exhaustion (fatal)
```

### Queue Behavior ✅
```bash
grep -i "enqueueFileForRetry\|processedResults" logs/app.log
# Fatal errors: should NOT see enqueueFileForRetry for that file
# Transient errors: may see enqueueFileForRetry up to maxRetryCount times
```

---

## Database Verification

### Check error results stored (not fatal throws)
```bash
sqlite3 data/ocr_memorials.db "SELECT fileName, error, errorMessage FROM memorials WHERE error = 1 LIMIT 10;"

# Or for burial registers:
sqlite3 data/ocr_memorials.db "SELECT * FROM burial_register_entries WHERE error = 1 LIMIT 10;"
```

### Check processing_id tracking
```bash
sqlite3 data/ocr_memorials.db "SELECT processing_id, fileName, error FROM memorials WHERE processing_id IS NOT NULL LIMIT 5;"

# Should show UUIDs like: "a1b2c3d4-..."
```

---

## Quick Reference: All Scenarios

| Scenario | Setup | Expected | Verify |
|----------|-------|----------|--------|
| **Auth Error** | Invalid API key | Fail immediately, 0 retries | No "Retry" in logs |
| **Config Error** | Invalid model | Fail immediately, 0 retries | No "Retry" in logs |
| **Validation Exhausted** | Blank image | Fail after 2 validation attempts | `validation_exhausted` in logs |
| **Rate Limit** | Many concurrent requests | Fail then retry (up to 3) | Multiple "Retry" messages |
| **Timeout** | timeout: 1ms | Fail then retry (up to 3) | Multiple "Retry" messages |
| **Success** | Valid image + config | Succeed on first attempt | No retries, data stored |
| **Queue No-Retry** | Invalid key + batch | All fail fatally, no queue-retry | `enqueueFileForRetry` NOT called |

---

## Cleanup

```bash
# Remove test files
rm -f test_exports/test_*.jpg test_exports/batch_*.jpg test_exports/blank.jpg

# Remove test logs
rm -f /tmp/*_test.log

# Restore config if needed
# (Already done above, but double-check)
```

---

## Expected Cost Impact

- **Before fix:** Each file error = 7 API calls (3 provider + 1 validation + 3 queue)
- **After fix:** Fatal error = 1 API call (immediate fail, no retries)
- **Example:** 100 files with auth error
  - Before: 700 wasted calls ❌
  - After: 100 actual calls ✅ → **86% savings** 💰

