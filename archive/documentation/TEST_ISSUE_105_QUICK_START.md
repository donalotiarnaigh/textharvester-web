# Quick Start: Testing Issue #105 Implementation

This guide helps you quickly verify that the duplicate detection feature works correctly.

## 🚀 Fastest Way to Test (5 minutes)

### 1. Verify Branch is Correct
```bash
git branch -a | grep issue-105
# Should show: fix/issue-105-filename-based-identity
```

### 2. Run Automated Test Script
```bash
# Clean database and run all tests
bash scripts/test-issue-105.sh --cleanup --verbose

# Expected output: "✓ ALL TESTS PASSED"
```

That's it! If you see the success message, the implementation is working.

---

## 📋 What Gets Tested Automatically

The script (`scripts/test-issue-105.sh`) performs these checks:

| Test | What It Verifies | Status |
|------|------------------|--------|
| **Prerequisites** | API keys, npm, sqlite3, sample data | 🟢 Checks before proceeding |
| **Duplicate Same Provider** | Same file + same provider = rejected | 🟢 Test 1 |
| **Different Providers** | Same file + different provider = allowed | 🟢 Test 2 |
| **Database Schema** | UNIQUE indexes exist on both tables | 🟢 Test 3 |
| **Test Suite** | Jest tests for isDuplicate detection | 🟢 Test 4 |

---

## 🔧 Manual Testing (if you prefer step-by-step)

See **[MANUAL_TEST_ISSUE_105.md](./MANUAL_TEST_ISSUE_105.md)** for detailed step-by-step instructions.

Quick example:
```bash
# First processing (should succeed)
npm run cli -- ingest "sample_data/source_sets/memorials/page_5.jpg" \
  --source-type memorial --provider openai

# Second processing (should be rejected with duplicate error)
npm run cli -- ingest "sample_data/source_sets/memorials/page_5.jpg" \
  --source-type memorial --provider openai
```

---

## 📊 Key Files to Review

| File | Purpose |
|------|---------|
| `src/utils/database.js` | ✅ Added UNIQUE index & isDuplicate detection for memorials |
| `src/utils/graveCardStorage.js` | ✅ Added UNIQUE index & isDuplicate detection for grave_cards |
| `src/utils/fileProcessing.js` | ✅ Added try/catch for duplicate handling in both branches |
| `__tests__/utils/database.test.js` | ✅ 2 new duplicate detection tests |
| `src/utils/__tests__/graveCardStorage.test.js` | ✅ 2 new duplicate detection tests |
| `__tests__/fileProcessing.test.js` | ✅ 2 new duplicate handling tests |

---

## ✅ Verification Checklist

After running tests, verify:

- [ ] Script completed without errors
- [ ] See "✓ ALL TESTS PASSED" message
- [ ] Database file exists at `data/memorials.db`
- [ ] UNIQUE indexes visible in database:
  ```bash
  sqlite3 data/memorials.db ".indices memorials"
  # Should show: idx_memorials_file_provider
  ```
- [ ] All 1358 tests still pass:
  ```bash
  npm test 2>&1 | grep "Test Suites:"
  # Should show: "146 passed, 146 total"
  ```

---

## 🔍 Understanding the Implementation

### The Problem (Before Fix)
- Same file processed twice → 2 records created (corruption)
- No uniqueness constraint on file_name + ai_provider
- No duplicate detection in application

### The Solution (After Fix)
```
                    ┌─────────────────────────────────────┐
                    │   File Processing (fileProcessing.js)│
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   Try to Store Record               │
                    │   (storeMemorial/storeGraveCard)    │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   Database INSERT Statement         │
                    │   (with UNIQUE constraint check)    │
                    └────────────┬────────────────────────┘
                                 │
                    ┌────────────▼────────────────────────┐
                    │   UNIQUE Constraint Violation?      │
                    └────────┬──────────────────┬──────────┘
                             │ YES              │ NO
                    ┌────────▼──────┐  ┌────────▼──────┐
                    │ Set isDuplicate│  │ Store Success │
                    │ Return Error   │  │ Return ID     │
                    └────────┬──────┘  └────────┬──────┘
                             │                  │
                    ┌────────▼──────────────────▼──────┐
                    │ Handle in fileProcessing.js      │
                    │ Return Error Result (no throw)   │
                    └────────────────────────────────┘
```

### Key Changes
1. **Database Layer**: UNIQUE constraint prevents duplicate records
2. **Application Layer**: try/catch gracefully handles constraint violations
3. **API**: Returns error result instead of throwing exception
4. **Logging**: Warning messages identify duplicate files

---

## 🚨 Troubleshooting

### "UNIQUE constraint failed" error appears in test
✅ **This is EXPECTED** - it means duplicate detection is working!

### "isDuplicate flag not set"
Check that you're on the correct branch:
```bash
git branch --current
# Should show: fix/issue-105-filename-based-identity
```

### "Database file not found"
Initialize it by running a query:
```bash
npm run cli -- query list
```

### "Indexes don't exist"
Make sure app completed initialization:
```bash
sqlite3 data/memorials.db ".indices memorials"
```

---

## 📈 Test Coverage Summary

```
Total Tests Written: 6 new tests
├── graveCardStorage.test.js
│   ├── rejects duplicate grave cards ✓
│   └── allows same file with different provider ✓
├── database.test.js
│   ├── catches SQLITE_CONSTRAINT and sets isDuplicate ✓
│   └── non-UNIQUE errors don't set isDuplicate ✓
└── fileProcessing.test.js
    ├── handles duplicate memorial gracefully ✓
    └── handles duplicate grave card gracefully ✓

Existing Tests: 1352 (all still passing)
Total: 1358 tests passing ✅
```

---

## 🎯 Success Criteria (All Met ✅)

- [x] Memorials table has UNIQUE index on (file_name, ai_provider)
- [x] Grave cards table has UNIQUE index on (file_name, ai_provider)
- [x] Duplicate inserts are rejected with `isDuplicate = true` error
- [x] fileProcessing.js handles duplicates gracefully (returns error result, not thrown)
- [x] Existing duplicates cleaned up during initialization
- [x] All existing tests pass; no regressions
- [x] 6 new tests added covering all scenarios
- [x] Different providers can process same file
- [x] Error messages are clear and actionable

---

## 📚 Documentation

For more details, see:
- **MANUAL_TEST_ISSUE_105.md** - 7 detailed test scenarios with expected outputs
- **Code Changes** - Review diffs in the 6 modified files
- **Git Commit** - Full implementation: `git show ce53406`

---

## ⏱️ Time Estimates

| Activity | Time |
|----------|------|
| Run automated test script | 2-3 min |
| Verify database indexes | 1 min |
| Review manual test scenarios | 5 min |
| Run full manual test suite | 10-15 min |
| Review code changes | 10-15 min |

---

## 🎓 Learning Outcomes

After testing, you'll understand:
1. How UNIQUE constraints prevent duplicates at database level
2. How to handle constraint violations gracefully in application code
3. Error handling patterns for expected (non-fatal) errors
4. How to test for duplicate detection at multiple layers

---

**Ready? Start with:**
```bash
bash scripts/test-issue-105.sh --cleanup
```

Good luck! 🚀
