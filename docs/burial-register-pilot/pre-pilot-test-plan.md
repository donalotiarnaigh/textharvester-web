# Pre-Pilot Test Plan

**Purpose:** Validate burial register processing functionality before the full ~210-page pilot run.

**Status:** Pre-flight testing checklist

---

## Overview

This document outlines critical tests to run before processing all 210 pages. These tests validate error handling, edge cases, provider compatibility, and system stability under realistic load.

**Estimated Total Time:** ~40-45 minutes

---

## Critical Tests (Must Complete)

### 1. Claude/Anthropic Provider Test
**Status:** ⚠️ Not tested (only GPT tested so far)

**Steps:**
1. Process 2-3 pages with Anthropic provider selected
2. Verify entries in database have `ai_provider: 'anthropic'`
3. Check page JSON stored under `data/burial_register/vol1/pages/anthropic/`
4. Verify same `entry_id` structure as GPT (for comparison)

**Success Criteria:**
- [ ] Entries stored with correct provider identifier
- [ ] Page JSON files created in correct directory
- [ ] No timeout errors
- [ ] Results page displays burial register entries correctly

**Time:** ~5 minutes

---

### 2. Larger Batch Processing Test
**Status:** ⚠️ Only 5 pages tested (need 20-30)

**Steps:**
1. Process 20-30 pages in a single batch
2. Monitor queue processing and progress tracking
3. Check memory usage during processing
4. Verify all entries stored correctly

**Success Criteria:**
- [ ] Queue handles batch without issues
- [ ] Progress tracking accurate throughout
- [ ] No memory leaks or performance degradation
- [ ] All entries stored with correct `entry_id` format
- [ ] Processing completes successfully

**Time:** ~15-20 minutes

---

### 3. "Replace Existing" with Larger Dataset
**Status:** ⚠️ Only tested with 8 entries

**Steps:**
1. Process 20-30 pages (creates ~160-240 entries)
2. Check entry count in database
3. Reprocess same pages with "Replace existing" checked
4. Verify old entries cleared and new ones inserted

**Success Criteria:**
- [ ] Old entries cleared correctly (count goes to 0, then back up)
- [ ] New entries inserted without duplicates
- [ ] No unique constraint violations
- [ ] Logs show clearing operation with correct count

**Time:** ~5 minutes

---

### 4. CSV Export Validation
**Status:** ⚠️ Basic export tested, need larger dataset validation

**Steps:**
1. Process 20-30 pages
2. Export CSV via results page download
3. Run export script: `node scripts/export-burial-register-csv.js gpt vol1`
4. Verify CSV contents

**Success Criteria:**
- [ ] CSV includes all entries
- [ ] Correct column order (matches `BURIAL_REGISTER_CSV_COLUMNS`)
- [ ] `uncertainty_flags` formatted as JSON strings
- [ ] Page range logged correctly in export script
- [ ] File size reasonable

**Time:** ~2 minutes

---

### 5. Edge Case Pages
**Status:** ⚠️ Not tested (see `test-data-prep.md` for specific pages)

**Pages to Test:**
- `page_042.png` - Contains marginalia beside entries
- `page_089.png` - Damaged rows with uncertainty flags
- `page_133.png` - Year header transitions mid-page

**Steps:**
1. Process each edge case page
2. Verify specific characteristics for each page type

**Success Criteria:**

**For page_042 (Marginalia):**
- [ ] Marginalia text appears in `marginalia_raw` or `extra_notes_raw`
- [ ] Marginalia preserved in stored page JSON
- [ ] Marginalia included in CSV export

**For page_089 (Damaged rows):**
- [ ] Uncertainty flags preserved as JSON strings
- [ ] No rows dropped due to damage
- [ ] Flags appear in CSV export correctly

**For page_133 (Year transitions):**
- [ ] `parish_header_raw`, `county_header_raw`, `year_header_raw` match page headers
- [ ] Headers propagate to all rows on page
- [ ] Year header correctly captured

**Time:** ~10 minutes

---

## Important Tests (Recommended)

### 6. Dual Provider Comparison
**Steps:**
1. Process same 2-3 pages with GPT
2. Clear entries
3. Process same pages with Claude
4. Compare results

**Success Criteria:**
- [ ] Both providers create entries with same `entry_id` structure
- [ ] Entries differ only in `ai_provider` and `model_name`
- [ ] Can export separate CSVs per provider
- [ ] Results page shows correct source type

**Time:** ~5 minutes

---

### 7. Error Handling Scenarios
**Steps:**
1. Test with invalid/corrupted image file
2. Monitor behavior during API failure (if possible to simulate)
3. Check queue continues processing other files

**Success Criteria:**
- [ ] Errors logged clearly with context
- [ ] Processing continues for other files in queue
- [ ] Queue doesn't hang on errors
- [ ] Error messages include file path and entry identifiers

**Time:** ~5 minutes

---

### 8. Database Integrity Check
**Steps:**
1. After processing 20-30 pages, query database
2. Check for duplicates, missing entries, data consistency

**Success Criteria:**
- [ ] No duplicate entries (unique constraint working)
- [ ] All `entry_id` values unique and correctly formatted (`vol1_p###_r###`)
- [ ] `processed_date` timestamps present and reasonable
- [ ] Page numbers sequential and correct
- [ ] All required fields populated

**Verification Query:**
```sql
SELECT 
  COUNT(*) as total_entries,
  COUNT(DISTINCT entry_id) as unique_entry_ids,
  COUNT(DISTINCT page_number) as unique_pages,
  MIN(processed_date) as first_processed,
  MAX(processed_date) as last_processed
FROM burial_register_entries;
```

**Time:** ~2 minutes

---

### 9. Performance Under Sustained Load
**Steps:**
1. Process 30-50 pages continuously
2. Monitor memory usage, log file growth, processing speed

**Success Criteria:**
- [ ] No memory leaks (memory usage stable)
- [ ] Log files don't grow excessively
- [ ] Processing speed remains consistent
- [ ] No database lock issues
- [ ] Queue throughput stable

**Time:** ~20-25 minutes (if running separately)

---

### 10. Export Script Validation
**Steps:**
1. Process pages with GPT provider
2. Run: `node scripts/export-burial-register-csv.js gpt vol1`
3. Verify output file and contents

**Success Criteria:**
- [ ] CSV generated correctly
- [ ] All entries included
- [ ] Page range logged correctly
- [ ] File saved to: `data/burial_register/vol1/csv/burials_vol1_openai.csv`
- [ ] Logs show entry count and page range

**Time:** ~2 minutes

---

## Recommended Test Sequence

### Quick Validation (30 minutes)
1. **Claude Provider Test** (5 min) - Verify both providers work
2. **Edge Case Pages** (10 min) - Validate special scenarios
3. **Larger Batch** (15 min) - Test with 20-30 pages

### Full Validation (45 minutes)
1. **Claude Provider Test** (5 min)
2. **Edge Case Pages** (10 min)
3. **Larger Batch** (15 min)
4. **Replace Existing** (5 min)
5. **CSV Export** (2 min)
6. **Export Script** (2 min)
7. **Database Integrity** (2 min)
8. **Dual Provider Comparison** (5 min)

---

## Quick Validation Checklist

After each test batch, verify:

- [ ] All entries have correct `entry_id` format (`vol1_p###_r###`)
- [ ] Page JSON files exist in correct provider directory
- [ ] Database entry count matches expected (pages × entries per page)
- [ ] CSV export includes all entries
- [ ] No errors in logs (check `logs/error.log`)
- [ ] Results page displays correctly
- [ ] Source type detection working
- [ ] Logs show proper context (volume_id, page_number, entry counts)

---

## Pre-Flight Checklist

Before starting full 210-page run:

- [ ] All critical tests completed successfully
- [ ] Both providers (GPT and Claude) tested
- [ ] Edge cases handled correctly
- [ ] Larger batch processing validated
- [ ] CSV export working correctly
- [ ] "Replace existing" functionality verified
- [ ] Database integrity confirmed
- [ ] Logging provides sufficient visibility
- [ ] Timeout configuration appropriate (90s working well)
- [ ] Export script tested

---

## Notes

- **Timeout Configuration:** Currently set to 90 seconds for burial register processing. This has eliminated retry issues seen with 30s timeout.

- **Parallel Processing:** System processes 3 files concurrently (`maxConcurrent: 3`). This significantly reduces total processing time.

- **Expected Performance:** 
  - ~32.5 seconds per page average
  - With 3 parallel workers: ~44 minutes for 210 pages
  - Sequential would be ~114 minutes (1.9 hours)

- **Monitoring:** Use `tail -f logs/combined.log` during full run to monitor progress.

---

## Related Documents

- `test-data-prep.md` - Specific test pages and expected outputs
- `pilot_run_preparation.md` - Full pilot run operational checklist
- `TECH_DESIGN.md` - Technical architecture details

---

**Last Updated:** 2025-12-03  
**Status:** Ready for testing

