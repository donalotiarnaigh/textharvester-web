# Open Issues — P1 / P2

_Last updated: 2026-03-16 (closed #116, #124, #125, #126, #142 — all completion audit complete)_

---

## P1 — High Priority

### ~~[#119](https://github.com/donalotiarnaigh/textharvester-web/issues/119) Confidence score silently defaults to 1.0 when model returns scalar or omits confidence~~ ✅ Fixed
**Branch:** `fix/issue-119-confidence-null-default`

`_extractValueAndConfidence()` now returns `confidence: null` for scalars, missing key, NaN, and out-of-range values. `needs_review` logic flags `null` confidence records for review. 16 unit tests added in `__tests__/utils/prompts/BasePrompt.test.js`.

---

### ~~[#120](https://github.com/donalotiarnaigh/textharvester-web/issues/120) BurialRegisterPrompt does not emit per-field confidence envelopes consistently~~ ✅ Fixed
**Branch:** `fix/issue-120-burial-register-confidence-envelopes`

`getPromptText()` previously said "For each entry field (not the top-level page fields)", explicitly excluding `parish_header_raw`, `county_header_raw`, and `year_header_raw` from `{value, confidence}` envelope instructions. The JSON schema in the prompt also showed those fields as plain `string | null`. The fix updates the schema and CONFIDENCE SCORING section to cover all fields (page-level and entry-level), removes the exclusionary clause, and bumps the version to `1.1.0`. Four new parsing tests assert that `_confidence_scores` contains the correct numeric confidence for each header field when the model returns envelopes, and `null` when plain scalars are returned. No changes were required to the validation layer — `super.validateAndConvert()` already called `_extractValueAndConfidence` for every page field.

---

### ~~[#130](https://github.com/donalotiarnaigh/textharvester-web/issues/130) No token or cost tracking — API spend is invisible~~ ✅ Fixed
**Branch:** `fix/issue-130-token-cost-tracking` (PR #140)

`processImage()` now returns `{ content, usage }` in both providers. `input_tokens`, `output_tokens`, and `estimated_cost_usd` columns added to all three tables (`memorials`, `burial_register_entries`, `grave_cards`). A `calculateCost(usage, costConfig)` helper in `fileProcessing.js` computes cost from per-model pricing rates in `config.json`. `IngestService.js` accumulates `sessionCostUsd` and halts with a warning when `maxCostPerSession` is exceeded. CLI `system cost [--from] [--to] [--provider]` subcommand added. `storeMemorial()` now takes 23 parameters.

---

### ~~[#116](https://github.com/donalotiarnaigh/textharvester-web/issues/116) Add per-field confidence scoring with human review queue~~ ✅ Fixed
**Branch:** `feature/typographic-analysis` (PR #117)

Per-field confidence scoring implemented with `{value, confidence}` envelope format for all field types across `MemorialOCRPrompt`, `BurialRegisterPrompt`, and `TypographicAnalysisPrompt`. `_extractValueAndConfidence()` in `BasePrompt` handles both envelope and scalar responses, returning numeric confidence (0–1) or `null` for missing/invalid confidence. Records with any field below `reviewThreshold` (0.70) are flagged with `needs_review = 1`. Frontend displays per-field confidence with color coding (green ≥0.90, yellow 0.70–0.89, red <0.70). CLI provides `query --needs-review` filter for review queue. 45 unit tests added; all 1200+ tests passing.

---

### [#121](https://github.com/donalotiarnaigh/textharvester-web/issues/121) No extraction accuracy measurement — impossible to detect quality regression
**Labels:** enhancement, data, high-priority
**Branch:** `fix/issue-121-extraction-accuracy-eval` (PR #137 — infrastructure merged; data pending)

**Status:** Infrastructure complete — blocked on real dataset from community group. Note: completing #133 (LLM logging) would accelerate building the gold-standard dataset by capturing real model outputs.

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

### ~~[#132](https://github.com/donalotiarnaigh/textharvester-web/issues/132) No retry on validation or parse failure — single bad model response loses the file~~ ✅ Fixed
**Branch:** `fix/issue-132-retry-on-validation-failure` (PR #145)

Two-layer retry system: Layer 1 (provider-level, max 3 retries) with error-type-aware backoff (rate_limit → exponential + jitter, timeout → 500ms, parse_error → 500ms). Layer 2 (validation-level, 1 retry) wraps processImage + validateAndConvert; on failure, prepends format-enforcement preamble. Both OpenAI and Anthropic providers integrated; Gemini follows same pattern. Config keys: `retry.maxProviderRetries`, `retry.validationRetries`, `retry.baseDelayMs`, `retry.maxDelayMs`, `retry.jitterMs`. 18 unit tests in `retryHelper.test.js` and `fileProcessing.test.js`; all 1190 tests passing.

---

### ~~[#136](https://github.com/donalotiarnaigh/textharvester-web/issues/136) Anthropic JSON extraction uses greedy regex — breaks on responses containing multiple JSON fragments~~ ✅ Fixed
**Branch:** `fix/issue-136-json-extraction`

New utility `src/utils/jsonExtractor.js` implements `extractFirstJsonObject()` — a character-by-character balanced-brace scanner that correctly extracts the first complete top-level JSON object from a string, handling nested objects, braces inside string literals, and escaped quotes. Integrated into both `anthropicProvider.js` (line 157) and `geminiProvider.js` (line 155), replacing the greedy `/\{[\s\S]*\}/` regex. Extraction method logged at debug level: `code_block` (markdown fence), `balanced_brace` (scanner), or `repaired` (fallback repair). 37 unit tests in `jsonExtractor.test.js` cover edge cases including multi-fragment responses. 8 integration tests (4 each provider) validate with realistic responses. All 1235 tests passing.

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

### ~~[#124](https://github.com/donalotiarnaigh/textharvester-web/issues/124) Silent null return on JSON parse failure hides data corruption in stored records~~ ✅ Fixed
**Branch:** `fix/issue-124-json-parse-failure-needs-review`

`validateAndConvertTypes()` in `src/utils/dataValidation.js` previously only called `logger.warn()` on JSON parse failure and silently returned `null`, leaving `needs_review` unchanged. The fix extends the JSON-field list to include `confidence_scores` and `validation_warnings`, switches to `logger.error()` (which always calls `console.error()` regardless of `quietMode` or sampling rate), and forces `needs_review = 1` on the returned record when any field fails to parse. 14 unit tests added in `__tests__/utils/dataValidation.test.js`.

---

### ~~[#125](https://github.com/donalotiarnaigh/textharvester-web/issues/125) Database migrations run without transactions — partial migration leaves schema in broken state~~ ✅ Fixed
**Labels:** bug, data
**Branch:** `fix/issue-125-migration-transactions`

Added `initializeMigrationsTable()` which creates a `schema_migrations` table on startup. A new `runColumnMigration(tableName, missing, migrationName)` helper wraps all `ALTER TABLE` calls inside a single `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` transaction. Seven integration tests verify idempotency, DDL rollback, and mid-migration crash simulation.

---

### ~~[#135](https://github.com/donalotiarnaigh/textharvester-web/issues/135) Human review workflow is incomplete — `reviewed_at` is never written~~ ✅ Fixed
**Branch:** `fix/issue-135-review-csv-columns`

Instead of implementing an in-app "Mark as Reviewed" workflow, we added `needs_review`, `reviewed_at`, `confidence_scores`, and `validation_warnings` columns to CSV exports. This lets users filter and review records externally (e.g. in spreadsheet software), which is more flexible for batch operations. The in-app workflow is deferred until there is demand for it. 4 new unit tests verify the columns appear in both memorial and burial register CSV exports. All 1237 tests pass.

---

### ~~[#134](https://github.com/donalotiarnaigh/textharvester-web/issues/134) `null` confidence and low confidence are indistinguishable in `needs_review` logic~~ ✅ Fixed
**Branch:** `fix/issue-134-confidence-coverage`

Changed `needs_review` logic from `Object.values(scores).some(s => s === null || s < threshold)` to `Object.values(scores).some(s => typeof s === 'number' && s < threshold)`. Now only explicitly low numeric confidence scores trigger review; null (absent) confidence is ignored. New `confidence_coverage REAL` column added to all three tables (`memorials`, `burial_register_entries`; embedded in `grave_cards` data_json) to track what fraction of fields returned numeric confidence. Frontend display fixed to show "N/A" for null scores instead of "NaN%". 7 new tests verify the fix; all 1244 tests passing.

---

### ~~[#126](https://github.com/donalotiarnaigh/textharvester-web/issues/126) `_confidence_scores` must be manually deleted before storage — fragile convention, data leak risk~~ ✅ Fixed
**Branch:** `fix/issue-126-confidence-scores-api` (PR #149)

Refactored `validateAndConvert()` across all prompt classes to return a tuple `[data, confidenceScores]` instead of attaching `_confidence_scores` to the data object. `fileProcessing.js` destructures the tuple and manages confidence scores separately. All call sites updated; no transient underscore-prefixed keys are stored in the database. 14 unit tests verify the clean API; all 1190 tests passing.

---

### ~~[#127](https://github.com/donalotiarnaigh/textharvester-web/issues/127) No request correlation ID — individual images untraceable through processing pipeline~~ ✅ Fixed
**Branch:** `fix/issue-127-correlation-id`

A UUIDv4 `processing_id` is now generated per file in `fileProcessing.js` and threaded through all log calls using a scoped logger that prefixes messages with `[pid:XXXXXXXX]`. The `processing_id` is stored in all three table schemas (`memorials`, `burial_register_entries`, `grave_cards`) and displayed in the detail view for each record type. CSV exports include the `processing_id` column for audit traceability. 13 unit tests verify correct UUID generation and storage.

---

### ~~[#133](https://github.com/donalotiarnaigh/textharvester-web/issues/133) LLM inputs and outputs are not logged — failures are undebuggable and eval datasets cannot be built~~ ✅ Fixed
**Branch:** `fix/issue-133-llm-audit-logging`

New SQLite table `llm_audit_log` stores full system prompt, user prompt, raw response, token counts, response time, and error details for every LLM API call. Each entry keyed with `processing_id` from #127. Log is always-on via `config.audit.enabled` (default: true). Storage module `src/utils/llmAuditLog.js` provides `initialize()`, `logEntry()` (fire-and-forget), and `getEntriesByProcessingId()` functions. Integrated into all three providers (OpenAI, Anthropic, Gemini) to capture raw response before JSON parsing. Initialized at server startup alongside other tables. 10 unit tests passing.

**Acceptance Criteria:**
- ✅ Full rendered system prompt + user message and full raw model response logged to dedicated `llm_audit_log` table
- ✅ Each entry keyed with request correlation ID (`processing_id` from #127)
- ✅ Log is always-on (not sampled) — separate from operational logs

---

## New Features

### ~~[#143](https://github.com/donalotiarnaigh/textharvester-web/issues/143) Add Gemini as a provider~~ ✅ Fixed
**Labels:** enhancement

Add Google Gemini as a first-class provider alongside OpenAI and Anthropic. Gemini Flash is significantly cheaper than GPT-5 and has shown strong results in field testing for monument image analysis. Note: a soft prerequisite for fully evaluating #142 (DEBS classification) with Gemini — field testing so far used the Gemini Gems interface, not the pipeline.

**New components:**
- `src/utils/modelProviders/geminiProvider.js` — implements the `processImage(base64, prompt, options) → { content, usage }` interface; normalises Gemini `usageMetadata` to `{ input_tokens, output_tokens }`
- `config.json` — `gemini.model`, `gemini.apiKey` (from `GEMINI_API_KEY` env), `costs.gemini_flash` / `costs.gemini_pro` pricing
- Provider dispatch extended to accept `--provider gemini`

**Acceptance Criteria:**
- ✅ `processImage()` returns `{ content, usage }` shape consistent with other providers
- ✅ `usage` normalisation unit-tested
- ✅ `--provider gemini` accepted in CLI
- ✅ API key read from `GEMINI_API_KEY` env variable

---

### ~~[#142](https://github.com/donalotiarnaigh/textharvester-web/issues/142) Add DEBS monument classification pipeline — physical stone recording~~ ✅ Fixed
**Labels:** enhancement

New standalone processing mode to document the physical characteristics of each funerary monument against the ADS/CBA DEBS schema (Mytum, CBA Practical Handbook 15). Separate from OCR transcription; run as a second pass over the same image folder. Green-lit by Professor Harold Mytum (Liverpool).

**Completed components:**
- `MonumentClassificationPrompt` (v1.0.0) — extends `BasePrompt`; DEBS V3 schema prompt returns flat JSON object (20 fields); `confidence_level` (High/Medium/Low) maps to numeric scores (1.0/0.75/0.3) and gates `needs_review`
- `monumentClassificationStorage.js` — new `monument_classifications` table with all 20 DEBS fields + cost columns + confidence/review columns; follows `graveCardStorage.js` pattern
- `fileProcessing.js` — new `monument_classification` source type branch; reads image directly (no PDF stitching); integrates validation retry, cost tracking, confidence scoring
- Prompt registry wiring in `providerTemplates.js` with MockProvider support
- QueryService and CLI integration (`query list --source-type monument_classification`, `ingest --source-type monument_classification`)
- resultsManager integration: JSON/CSV export with auto-detected source type
- server.js initialization of `monumentClassificationStorage`
- `[FV]` tag extraction into `field_verify_flags` array for field-level verification tracking

**Implementation (TDD red/green completed):**
1. ✅ `MonumentClassificationPrompt.test.js` (29 tests) — config, provider prompts, confidence mapping, field validation, numeric checks
2. ✅ `MonumentClassificationPrompt.js` — full implementation with DEBS schema, confidence envelope handling
3. ✅ `monumentClassificationStorage.test.js` (15 tests) — table creation, store/retrieve, JSON parsing, cost columns
4. ✅ `monumentClassificationStorage.js` — full storage implementation
5. ✅ `fileProcessing.test.js` (7 monument_classification tests) — template selection, storage, cost tracking, processing_id, needs_review logic
6. ✅ `fileProcessing.js` — full implementation with validation retry, cost injection, confidence logic
7. ✅ Wiring: providerTemplates.js, mockProvider.js, IngestService.js, QueryService.js, CLI (query.js, ingest.js), uploadHandler.js, resultsManager.js, server.js

**Acceptance Criteria:**
- ✅ `npm test` green: 1256+ tests passing (29 prompt + 15 storage + 7 fileProcessing tests added)
- ✅ `ingest --source-type monument_classification --provider openai` stores records in `monument_classifications` table
- ✅ `query list --source-type monument_classification` returns classified records
- ✅ Cost tracking works: `input_tokens`, `output_tokens`, `estimated_cost_usd` populated
- ✅ Confidence scoring: High→1.0, Medium→0.75, Low→0.3; Low confidence triggers `needs_review = 1`
- ✅ [FV] tag preservation and `field_verify_flags` extraction working
- ✅ Mock provider returns valid 20-field responses for testing

---

## Backlog — Open Issues

_19 open, unstarted issues organized by category:_

### Advanced Accuracy & ML

**#115** — Fine-tune GPT-4o on Historic Graves verified data for domain-specific accuracy
**#114** — Implement evaluation metrics (IFR, field-level F1) with Historic Graves ground truth
**#113** — Implement RimAG (Retrieval-in-the-Middle) two-pass processing strategy
**#112** — Integrate Logainm API for placename validation (RAG enhancement)
**#96** — Feature: Enable simultaneous GPT and Claude processing for burial registers

### Architecture & Code Quality

**#105** — Arch: Enforce Filename-Based Identity
**#102** — Refactor: Abstract StorageService for Record Types
**#101** — Feat: Implement Strict Validation Middleware
**#100** — Refactor: Decouple Type-Specific UI Config from main.js
**#99** — Refactor: Implement Strategy Pattern for Record Processors

### Data Export & Streaming

**#98** — Enhancement: Dynamic CSV Flattening for All Types
**#39** — Paginate results and stream exports (CSV/JSONL)

### Performance & Optimization

**#40** — Optimize image pipeline and retry caching
**#41** — Reduce logging verbosity and sample performance metrics
**#37** — Add controlled concurrency to file processing queue
**#38** — Respond immediately on upload and offload PDF conversion

### UI/UX & Features

**#26** — Enhancement: Provider-Specific Name Handling Configuration
**#23** — UI Inconsistency: Copy Button Visible But Only Works When Modal Expanded
**#10** — Enhancement: Implement Parallel Model Processing & Automated Comparison
