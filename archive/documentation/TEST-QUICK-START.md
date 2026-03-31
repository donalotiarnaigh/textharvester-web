# Quick Start: Testing processing_id Feature

## TL;DR

```bash
# Quick preview (no API calls needed)
./test-processing-id.sh --dry-run

# Real test (requires API key)
./test-processing-id.sh

# Verify in database
sqlite3 data/memorials.db "SELECT file_name, processing_id FROM memorials LIMIT 1;"
```

## What Gets Tested

✅ UUIDv4 `processing_id` generation per file
✅ Scoped logging with `[pid:XXXXXXXX]` prefix
✅ Database storage across all 3 record types
✅ Frontend display & CSV export

## Common Scenarios

### Test Everything
```bash
./test-processing-id.sh --verbose
```

### Test Specific Record Type
```bash
./test-processing-id.sh --type memorial
./test-processing-id.sh --type register
./test-processing-id.sh --type monument
```

### Test with Different Provider
```bash
./test-processing-id.sh --provider anthropic
./test-processing-id.sh --provider gemini
```

### Batch Test Multiple Providers
```bash
for provider in openai anthropic gemini; do
  echo "Testing with $provider..."
  ./test-processing-id.sh --type memorial --provider $provider
done
```

## Verify Results

### Via CLI
```bash
node bin/textharvester query list --limit 1
```

### Via Database
```bash
# Memorials
sqlite3 data/memorials.db \
  "SELECT id, file_name, processing_id FROM memorials ORDER BY id DESC LIMIT 1;"

# Burial Registers
sqlite3 data/memorials.db \
  "SELECT id, file_name, processing_id FROM burial_register_entries ORDER BY id DESC LIMIT 1;"

# Grave Cards
sqlite3 data/memorials.db \
  "SELECT id, file_name, processing_id FROM grave_cards ORDER BY id DESC LIMIT 1;"
```

### Via Logs (Verbose Mode)
```bash
./test-processing-id.sh --verbose | grep "\[pid:"
```

## Key Features

| Feature | Benefit |
|---------|---------|
| **Safe** | Sample data protected, copies tested |
| **Repeatable** | Run infinite tests without regenerating |
| **Verifiable** | Auto-queries database for confirmation |
| **Flexible** | Test individual types or all at once |
| **Observable** | Verbose mode shows all log lines |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Script not found | `chmod +x test-processing-id.sh` |
| No API key | Use `--dry-run` or set `OPENAI_API_KEY` |
| No database | Run `npm run init-db` first |
| File not found | Ensure you're in project root: `ls sample_data/source_sets/` |

## Full Documentation

See `docs/testing-processing-id.md` for:
- Complete command reference
- Manual testing approaches
- Advanced debugging
- Architecture details
- Troubleshooting guide

## Implementation Details

**Files Modified (Issue #127):**
- `src/utils/fileProcessing.js` — UUID generation & scoped logging
- `src/utils/database.js` — Schema migrations
- `src/utils/burialRegisterStorage.js` — Storage layer
- `src/utils/graveCardStorage.js` — Grave card storage
- `public/js/modules/results/main.js` — Frontend display
- `src/controllers/resultsManager.js` — CSV export

**Database Changes:**
- Added `processing_id TEXT` column to `memorials`
- Added `processing_id TEXT` column to `burial_register_entries`
- Added `processing_id TEXT` column to `grave_cards`

**Log Output Example:**
```
[INFO] [pid:4cb97918] Processing file: memorial.jpg
[INFO] [pid:4cb97918] Extracting text from image...
[INFO] [pid:4cb97918] OCR response validated successfully
[INFO] [pid:4cb97918] Memorial stored in database with ID: 42
[INFO] [pid:4cb97918] Cleaned up processed file
```

---

**Start Testing:** `./test-processing-id.sh --dry-run`
