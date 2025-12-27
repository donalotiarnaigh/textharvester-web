# Git Strategy for OCR Exploration

## Recommendation: Create Separate Branch

**Branch from:** `main` (not `feature/cli`)  
**Branch name:** `exploration/ocr-comparison`  
**Reason:** Keep OCR exploration independent from CLI feature work

## Steps

### 1. Stash or commit current changes on feature/cli
```bash
# If you have uncommitted CLI work, stash it first
git stash

# Or commit it if ready
git add .
git commit -m "WIP: CLI work"
```

### 2. Create new branch from main
```bash
# Switch to main and update
git checkout main
git pull origin main

# Create new exploration branch
git checkout -b exploration/ocr-comparison
```

### 3. Cherry-pick OCR files
```bash
# Add only OCR-related files
git add ocr_comparison/
git add scripts/compare_ocr_results.js

# Commit with descriptive message
git commit -m "exploration: OCR comparison Mistral vs GPT-5.1

- Tested Mistral OCR API (basic, structured, bbox formats)
- Compared OCR accuracy across 5 grave card samples
- Generated comprehensive comparison reports
- Key finding: GPT-5.1 superior for structured extraction

Files:
- ocr_comparison/scripts/ - Test and comparison scripts
- ocr_comparison/docs/ - Reports and raw results
- scripts/compare_ocr_results.js - Original comparison script
"
```

### 4. Push exploration branch
```bash
git push -u origin exploration/ocr-comparison
```

### 5. Return to CLI work
```bash
git checkout feature/cli

# Restore stashed changes if needed
git stash pop
```

## Alternative: Keep on feature/cli

If you prefer to keep everything together:

```bash
# Just commit on feature/cli
git add ocr_comparison/
git add scripts/compare_ocr_results.js
git commit -m "exploration: OCR comparison Mistral vs GPT-5.1"
git push origin feature/cli
```

**Pros:** Simpler, all work in one place  
**Cons:** Mixes exploration with feature implementation

## Recommended Approach

**Use separate branch** (`exploration/ocr-comparison`) because:

1. ✅ **Clean separation** - Exploration vs implementation
2. ✅ **Independent review** - Can be reviewed/merged separately
3. ✅ **Flexible** - Can merge to main without CLI feature
4. ✅ **Documentation** - Clear history of what was explored
5. ✅ **No conflicts** - Won't interfere with CLI PR

## .gitignore Considerations

You may want to add to `.gitignore`:
```
# OCR test results (keep scripts, exclude large result files)
ocr_comparison/docs/*.json
```

This keeps the comparison scripts and markdown reports in git, but excludes the large JSON result files.
