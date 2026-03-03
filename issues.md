# Open Issues — P1 / P2

_Last updated: 2026-03-03_

---

## P1 — High Priority

### ~~[#119](https://github.com/donalotiarnaigh/textharvester-web/issues/119) Confidence score silently defaults to 1.0 when model returns scalar or omits confidence~~ ✅ Fixed
**Branch:** `fix/issue-119-confidence-null-default`

`_extractValueAndConfidence()` now returns `confidence: null` for scalars, missing key, NaN, and out-of-range values. `needs_review` logic flags `null` confidence records for review. 16 unit tests added in `__tests__/utils/prompts/BasePrompt.test.js`.

---

### ~~[#120](https://github.com/donalotiarnaigh/textharvester-web/issues/120) BurialRegisterPrompt does not emit per-field confidence envelopes consistently~~ ✅ Fixed
**Branch:** `fix/issue-120-burial-register-confidence-envelopes`

`getPromptText()` previously said "For each entry field (not the top-level page fields)", explicitly excluding `parish_header_raw`, `county_header_raw`, and `year_header_raw` from `{value, confidence}` envelope instructions. The JSON schema in the prompt also showed those fields as plain `string | null`. The fix updates the schema and CONFIDENCE SCORING section to cover all fields (page-level and entry-level), removes the exclusionary clause, and bumps the version to `1.1.0`. Four new parsing tests assert that `_confidence_scores` contains the correct numeric confidence for each header field when the model returns envelopes, and `null` when plain scalars are returned. No changes were required to the validation layer — `super.validateAndConvert()` already called `_extractValueAndConfidence` for every page field.

**Acceptance Criteria:**
- System prompt covers all fields (page-level and entry-level) in `{ value, confidence }` envelopes.
- Parsing tests verify `confidence_scores` contains entries for the three header fields.
- Prompt version bumped to `1.1.0`.

---

### [#121](https://github.com/donalotiarnaigh/textharvester-web/issues/121) No extraction accuracy measurement — impossible to detect quality regression
**Labels:** enhancement, data, high-priority
**Branch:** `fix/issue-121-extraction-accuracy-eval` (PR #137 — infrastructure merged; data pending)

**Status:** Infrastructure complete — blocked on real dataset from community group.

**Completed:**
- `scripts/eval.js` — evaluation CLI and library (`computeCER`, `computeFieldAccuracy`, `evaluateNeedsReview`, `runEvaluation`); `--floor N` flag exits 1 when accuracy is below threshold; gracefully exits 0 with a warning when no data is present.
- `eval/gold-standard/memorials.json` and `burial-register.json` — schema placeholder files with `records: []`; format documented in `eval/README.md`.
- `eval/fixtures/ci-baseline.json` — placeholder for pre-computed model outputs (empty until real data is available).
- `__tests__/scripts/eval.test.js` — 36 passing unit tests covering all metric functions and file integrity; 5 data-dependent tests skip automatically when records are empty and activate once data is committed.
- `docs/evaluation.md` — full documentation including `reviewThreshold = 0.70` rationale and instructions for re-enabling the CI gate.
- `npm run eval` / `npm run eval:check` scripts added to `package.json`.

**Remaining steps:**
1. **Obtain dataset** — receive hand-labelled records (≥ 20 memorials) from local community group.
2. **Commit gold standard** — populate `eval/gold-standard/memorials.json` (and `burial-register.json` if available) with the real records.
3. **Generate CI baseline fixture** — run the system against the gold-standard images; save extracted outputs to `eval/fixtures/ci-baseline.json` using the schema in `eval/README.md`.
4. **Re-enable CI gate** — add the `eval:check` step back to `.github/workflows/ci.yml` (instructions in `docs/evaluation.md`).
5. **Verify** — run `npm run eval:check`; confirm overall accuracy ≥ 0.85 and adjust the floor if needed.

**Acceptance Criteria:**
- ✅ Reproducible evaluation script exists and is documented.
- ⏳ At least 20 hand-labelled records committed as gold standard — pending community dataset.
- ⏳ CI fails if field-level accuracy drops below a defined floor — infrastructure ready; step disabled until data is available.
- ✅ `reviewThreshold` value is backed by a documented measurement.

---

## P2 — Data Integrity

### ~~[#123](https://github.com/donalotiarnaigh/textharvester-web/issues/123) Cross-field validation absent — impossible dates and ages accepted silently~~ ✅ Fixed
**Branch:** `fix/issue-123-cross-field-validation` (PR #138)

Cross-field plausibility checks added to `MemorialOCRPrompt.validateAndConvert()` and `BurialRegisterPrompt.validateAndConvertEntry()`. Implausible field combinations downgrade affected confidence scores to `0.4` (below the `0.70` review threshold), triggering `needs_review = 1` automatically. Specific reasons are stored in a new `validation_warnings TEXT` column on both tables.

**Checks implemented:**
- `IDENTICAL_NAMES` — first_name equals last_name → caps both name confidence scores
- `IMPLAUSIBLE_AGE` — inscription age > 150 → caps inscription confidence
- `IMPLAUSIBLE_AGE` — implied birth year < 1400 (death − age) → caps inscription + year_of_death confidence
- `IMPLAUSIBLE_AGE` — burial register age_raw > 150 → caps age_raw confidence

10 new unit tests (TDD red→green) across both prompt test files.

---

### [#124](https://github.com/donalotiarnaigh/textharvester-web/issues/124) Silent null return on JSON parse failure hides data corruption in stored records
**Labels:** bug, data

`src/utils/dataValidation.js` silently returns `null` on JSON parse failure for stored JSON fields. Records that should be flagged for review are silently skipped because `confidence_scores` becomes `null` and the `needs_review` logic has no scores to evaluate.

**Acceptance Criteria:**
- Parse failures in `validateAndConvertTypes()` set `needs_review = 1` on the affected record.
- A structured error (not just `logger.warn`) is emitted, visible regardless of sampling rate.
- Unit test: simulate corrupted `confidence_scores` TEXT; assert `needs_review` is set to `1` on retrieval.

---

### [#125](https://github.com/donalotiarnaigh/textharvester-web/issues/125) Database migrations run without transactions — partial migration leaves schema in broken state
**Labels:** bug, data

All schema migrations in `database.js` and `src/utils/migrations/` execute DDL statements with no wrapping transaction. A crash mid-migration leaves the schema in an inconsistent state with no rollback path and no migration state table to record what was applied.

**Acceptance Criteria:**
- All multi-statement migrations wrapped in explicit SQLite transactions (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`).
- A `schema_migrations` table exists and is populated on each successful migration.
- Integration test: simulate a mid-migration crash; assert the schema is fully rolled back.

---

### [#126](https://github.com/donalotiarnaigh/textharvester-web/issues/126) `_confidence_scores` must be manually deleted before storage — fragile convention, data leak risk
**Labels:** bug, data

`BasePrompt.validateAndConvert()` attaches `_confidence_scores` directly onto the returned data object, requiring callers to manually delete it before storage. Any new code path that bypasses `formatProviderResponse()` will accidentally store or leak the internal key.

**Suggested fix:** Return a tuple `{ data, confidenceScores }` or add a separate `extractConfidenceScores()` method.

**Acceptance Criteria:**
- `_confidence_scores` is no longer attached to the returned data object.
- Confidence scores returned via an explicit typed API.
- All call sites updated; no `delete validatedData._confidence_scores` remaining.
- Unit tests verify the returned `data` object never contains a key starting with `_`.

---

### [#127](https://github.com/donalotiarnaigh/textharvester-web/issues/127) No request correlation ID — individual images untraceable through processing pipeline
**Labels:** enhancement, data

No single correlation ID is threaded through the upload-to-storage pipeline. Debugging requires correlating log lines across layers using filename alone (which is not unique for reprocessed files). Retry attempt counts and API latency cannot be linked to specific stored records.

**Suggested fix:** Generate a UUIDv4 `processing_id` per file in `IngestService` or `fileProcessing.js`, thread it through all log calls, store it in the DB, and surface it in the detail view.

**Acceptance Criteria:**
- `processing_id` (UUID) generated per file and propagated through all processing steps.
- `processing_id` stored in the database on the processed record.
- All log lines during a single file's processing share the same `processing_id`.
- Detail view in the frontend displays `processing_id` for support/audit purposes.
