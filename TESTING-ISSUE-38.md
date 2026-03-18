# Testing Issue #38: Background PDF Conversion

## Overview
This document summarizes how to test the background PDF conversion feature implemented for Issue #38.

## What Was Changed

**Issue #38**: "Respond immediately on upload and offload PDF conversion"

### Problem
Users had to wait for PDF→JPEG conversion (30+ seconds for large PDFs) before getting an upload response.

### Solution
PDF conversion now happens in a background async process. Upload responses return within 500ms.

---

## Testing Resources

### 1. **Automated Unit Tests** (Already passing)
```bash
npm test __tests__/utils/conversionTracker.test.js
npm test __tests__/services/IngestService.test.js
npm test src/utils/__tests__/fileQueue.test.js
```

**Coverage**: 29 new unit tests
- ConversionTracker state management
- IngestService async handling
- FileQueue conversion tracking
- Progress state transitions

### 2. **Quick Manual Test** (5 minutes)
```bash
# Prepare test data
mkdir -p test-data/pdfs
# Place test PDF in test-data/pdfs/ or use the setup guide below

# Start server
npm start

# Run automated test script
./test-issue-38.sh
```

**What it verifies**:
- ✓ Upload response < 1000ms
- ✓ Conversion state visible immediately
- ✓ State transitions (converting → processing → complete)
- ✓ Error handling

### 3. **Detailed Manual Testing** (15 minutes)
```bash
# See: docs/manual-test-issue-38.md
# 7 comprehensive test scenarios with step-by-step instructions
```

**Scenarios covered**:
1. Single PDF upload timing
2. Mixed file types
3. Progress tracking
4. CLI ingest
5. Error handling
6. Concurrent uploads
7. Cancel processing

### 4. **Test Data Preparation**
```bash
# See: docs/test-data-setup.md
# Instructions for creating test PDFs using various tools
```

**Options**:
- Generate with ImageMagick
- Create with Ghostscript
- Use existing PDFs
- Download samples

---

## Quick Start: Running Tests

### Step 1: Prepare Test Data
```bash
# Option A: Use existing PDFs from your documents
cp ~/Documents/*.pdf test-data/pdfs/

# Option B: Create test PDFs (see docs/test-data-setup.md)
mkdir -p test-data/pdfs
# Create test-2page.pdf using ImageMagick or Ghostscript
```

### Step 2: Start the Server
```bash
npm start
# Server runs on http://localhost:3000
```

### Step 3: Run Tests

**Option A: Automated script** (recommended for quick validation)
```bash
./test-issue-38.sh
```

**Option B: Manual web UI testing**
1. Open http://localhost:3000/upload in browser
2. Upload a PDF, note response time (should be < 500ms)
3. Check http://localhost:3000/processing-status to see conversion progress
4. Observe state transitions in browser console:
   ```javascript
   setInterval(() => {
     fetch('/processing-status').then(r => r.json()).then(d =>
       console.log(`State: ${d.status}, Conversion: ${d.conversion ? 'active' : 'done'}`)
     );
   }, 1000);
   ```

**Option C: Detailed scenarios** (for comprehensive testing)
```bash
# Read the detailed guide
cat docs/manual-test-issue-38.md

# Follow each of the 7 scenarios
# Verify all acceptance criteria
```

---

## Success Criteria

All of these must pass:

| Criterion | Test Method | Expected Result |
|-----------|-------------|-----------------|
| Fast response | test-issue-38.sh | HTTP 200 in < 1000ms |
| Async conversion | Web UI + DevTools | State = 'converting' within 1s of upload |
| State transitions | Progress polling | converting → processing → complete |
| Background processing | CLI ingest | "Enqueued" before "Processing" |
| Error handling | Upload corrupt PDF | Errors appear in errors array |
| Sequential conversion | Multiple PDFs | PDFs converted one at a time |
| Cancel support | Click cancel button | Conversion state cleared |

---

## Test Files

```
project-root/
├── test-issue-38.sh                    # Automated test script
├── docs/
│   ├── manual-test-issue-38.md         # Detailed 7-scenario test plan
│   ├── test-data-setup.md              # How to prepare test PDFs
│   └── TESTING-ISSUE-38.md            # This file
├── test-data/
│   └── pdfs/                           # Place test PDFs here
│       ├── test-2page.pdf
│       ├── test-5page.pdf
│       └── burial-register-10page.pdf
```

---

## Implementation Files Modified

**New files:**
- `src/utils/conversionTracker.js` — State management for PDF conversions

**Modified files:**
- `src/services/IngestService.js` — Async background conversion
- `src/utils/fileQueue.js` — Conversion-aware progress tracking
- `src/controllers/resultsManager.js` — API response includes conversion data
- `public/js/modules/processing/ProgressClient.js` — Frontend normalization
- `public/js/modules/processing/ProgressController.js` — State transitions
- `server.js` — Reduced upload timeout (30min → 5min)

---

## Troubleshooting

### Test script fails to connect
```bash
# Check if server is running
curl http://localhost:3000/processing-status

# If not, start it
npm start
```

### Response time still > 1000ms
- Check `src/services/IngestService.js` line 107 — should NOT await PDF conversion
- Look for `await convertPdfToJpegs()` — this would block the response

### State never shows 'converting'
- Verify `conversionTracker` is imported in `fileQueue.js`
- Check that conversion completes before first progress poll (1+ second delay)
- Try polling more frequently: `setInterval(fetch, 500)` instead of 1000

### PDFs converted in parallel (race condition)
- Verify `_startBackgroundConversion()` uses `for...of` loop, not `Promise.all()`
- Should convert sequentially: one PDF at a time

### Conversion errors not showing
- Ensure `conversionTracker.markConversionFailed()` is being called
- Check server logs: `tail -f logs/application.log`
- Verify corrupt PDF test creates an unparseable file

---

## Viewing Logs

Enable verbose logging during testing:

**In terminal:**
```bash
# Watch application logs
tail -f logs/application.log | grep -E "Background|Conversion|Converting"
```

**In browser console:**
```javascript
// Watch progress polling in real-time
setInterval(() => {
  fetch('/processing-status')
    .then(r => r.json())
    .then(d => {
      console.log('[' + new Date().toLocaleTimeString() + '] State:', d.status, 'Conversion:', d.conversion);
    });
}, 500);
```

**Expected log messages:**
```
[Background] Converting PDF: filename.pdf
[Background] Converted filename.pdf to 5 images
Conversion complete for /path/to/file.pdf
Registered 1 PDFs for background conversion
```

---

## After Testing Passes

1. **Update GitHub Issue**
   - Close Issue #38
   - Add summary: "Background PDF conversion implemented. HTTP responses return within 500ms. All tests passing."
   - Tag with `completed`

2. **Merge Branch**
   ```bash
   git checkout main
   git pull origin main
   git merge fix/issue-38-background-pdf-conversion
   git push origin main
   ```

3. **Update Documentation**
   - Add note to CHANGELOG.md
   - Update README with performance improvement

4. **Run Full Test Suite**
   ```bash
   npm test
   npm run lint
   ```

---

## Performance Expectations

### Upload Response Time
- **Before**: 30-60 seconds (waiting for PDF conversion)
- **After**: < 500ms (conversion is async)
- **Improvement**: 60-120x faster perceived response

### Overall Processing Time
- **Unchanged**: Same total time for all PDFs to be fully processed
- **Benefit**: User sees immediate feedback instead of hanging upload

### Memory Usage
- **Sequential conversion**: Minimal memory (one PDF at a time)
- **No parallel conversion**: Avoids memory pressure from multiple `pdftocairo` processes

---

## Questions?

- **Implementation details**: See `docs/manual-test-issue-38.md`
- **Test data setup**: See `docs/test-data-setup.md`
- **Code walkthrough**: See code comments in `src/utils/conversionTracker.js`
- **Architecture**: See `MEMORY.md` for pattern notes

---

## Related Issues

- **#37**: Controlled concurrency (complementary feature)
- **#39**: Paginate results (for large result sets)
- **#96**: Parallel model processing (different optimization)

