# Open Issues — P1 / P2

_Last updated: 2026-03-07 (marked #130 fixed; moved #132 and #136 to P1; reordered P2; added dependency notes)_

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

### [#132](https://github.com/donalotiarnaigh/textharvester-web/issues/132) No retry on validation or parse failure — single bad model response loses the file
**Labels:** bug, high-priority

`fileProcessing.js:334` calls `validateAndConvert()` once; on failure the file fails completely. Anthropic provider has zero retries. OpenAI has 3 retries but treats all error types identically. `ResponseLengthValidator.generateRetryPrompt()` exists in `BasePrompt.js` but is never called. For heritage surveys where re-photography is impractical, permanent data loss on a single bad API response is unacceptable.

**Acceptance Criteria:**
- On parse/validation failure, one retry is attempted using `generateRetryPrompt()`.
- OpenAI retry logic distinguishes error types: rate-limit → exponential backoff with jitter; parse error → format-enforcement prompt; timeout → single timeout increase then fail.
- Anthropic provider implements at least one retry on parse failure.

---

### [#136](https://github.com/donalotiarnaigh/textharvester-web/issues/136) Anthropic JSON extraction uses greedy regex — breaks on responses containing multiple JSON fragments
**Labels:** bug

`anthropicProvider.js:148` uses `/\{[\s\S]*\}/` which matches from the first `{` to the last `}`. A model response with explanatory text containing braces, or two separate JSON objects, produces malformed input to the JSON parser. No logging of which parsing branch succeeded makes failures opaque. This is an active silent data corruption risk on every Anthropic API call.

**Acceptance Criteria:**
- Greedy regex replaced with a balanced-brace scanner that reliably extracts the first complete top-level JSON object.
- Which extraction branch was taken (`code_block`, `raw_json`, `repaired`) is logged per request.
- Unit test: assert correct extraction when model response contains multiple `{...}` fragments.

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

### [#135](https://github.com/donalotiarnaigh/textharvester-web/issues/135) Human review workflow is incomplete — `reviewed_at` is never written
**Labels:** bug, ui

`reviewed_at DATETIME` column exists in both DB schemas but is never populated. No API endpoint exists to mark a record reviewed. The frontend shows "Needs Review" badges but has no submit/confirm button. Records in `needs_review=1` state accumulate with no resolution path — the review feature is visibly broken for any user who tries to use it.

**Acceptance Criteria:**
- `PATCH /api/memorials/:id/review` (and equivalent for burial register) sets `reviewed_at = NOW()`, `needs_review = 0`, and optionally accepts field corrections.
- Frontend detail panel shows a "Mark as Reviewed" button when `needs_review = 1`.
- `reviewed_at` is displayed in the record metadata panel when set.

---

### [#134](https://github.com/donalotiarnaigh/textharvester-web/issues/134) `null` confidence and low confidence are indistinguishable in `needs_review` logic
**Labels:** bug, data

`_extractValueAndConfidence()` returns `confidence: null` both when the model omits confidence entirely (scalar response) and when confidence is invalid. `fileProcessing.js:342` checks `s === null || s < threshold` treats both identically, so a prompt change that stops emitting `{value, confidence}` wrappers silently floods the review queue with false positives.

**Acceptance Criteria:**
- `confidence: null` (not provided) is distinguishable from explicitly low confidence.
- A `confidence_coverage` metric tracks what fraction of fields returned a numeric confidence.
- `needs_review` is only set when confidence is explicitly low, not when absent.

---

### [#126](https://github.com/donalotiarnaigh/textharvester-web/issues/126) `_confidence_scores` must be manually deleted before storage — fragile convention, data leak risk
**Labels:** bug, data

`BasePrompt.validateAndConvert()` attaches `_confidence_scores` directly onto the returned data object, requiring callers to manually delete it before storage. Any new code path that bypasses `formatProviderResponse()` will accidentally store or leak the internal key. Note: fixing this before implementing #142 (DEBS classification) means the new prompt class gets a clean API from the start rather than inheriting the fragile convention.

**Suggested fix:** Return a tuple `{ data, confidenceScores }` or add a separate `extractConfidenceScores()` method.

**Acceptance Criteria:**
- `_confidence_scores` is no longer attached to the returned data object.
- Confidence scores returned via an explicit typed API.
- All call sites updated; no `delete validatedData._confidence_scores` remaining.
- Unit tests verify the returned `data` object never contains a key starting with `_`.

---

### [#127](https://github.com/donalotiarnaigh/textharvester-web/issues/127) No request correlation ID — individual images untraceable through processing pipeline
**Labels:** enhancement, data

No single correlation ID is threaded through the upload-to-storage pipeline. Debugging requires correlating log lines across layers using filename alone (which is not unique for reprocessed files). Retry attempt counts and API latency cannot be linked to specific stored records. Note: #133 (LLM logging) depends on this — its acceptance criteria requires each log entry to be keyed with a correlation ID.

**Suggested fix:** Generate a UUIDv4 `processing_id` per file in `IngestService` or `fileProcessing.js`, thread it through all log calls, store it in the DB, and surface it in the detail view.

**Acceptance Criteria:**
- `processing_id` (UUID) generated per file and propagated through all processing steps.
- `processing_id` stored in the database on the processed record.
- All log lines during a single file's processing share the same `processing_id`.
- Detail view in the frontend displays `processing_id` for support/audit purposes.

---

### [#133](https://github.com/donalotiarnaigh/textharvester-web/issues/133) LLM inputs and outputs are not logged — failures are undebuggable and eval datasets cannot be built
**Labels:** enhancement, high-priority

Full prompt text and full model response JSON are never stored or logged. Anthropic provider logs only the first 200 chars of the prompt (`anthropicProvider.js:76`). Payload logging sampling is 5% in config, meaning 95% of production calls leave no trace. Note: depends on #127 (correlation ID) to key log entries; completing this will also accelerate building the gold-standard dataset needed to unblock #121 (eval).

**Acceptance Criteria:**
- Full rendered system prompt + user message and full raw model response logged to a dedicated `llm_audit_log` table or append-only JSONL file.
- Each entry keyed with a request correlation ID (see #127).
- Log is always-on (not sampled) — separate from operational logs.

---

## New Features

### [#143](https://github.com/donalotiarnaigh/textharvester-web/issues/143) Add Gemini as a provider
**Labels:** enhancement

Add Google Gemini as a first-class provider alongside OpenAI and Anthropic. Gemini Flash is significantly cheaper than GPT-5 and has shown strong results in field testing for monument image analysis. Note: a soft prerequisite for fully evaluating #142 (DEBS classification) with Gemini — field testing so far used the Gemini Gems interface, not the pipeline.

**New components:**
- `src/utils/modelProviders/geminiProvider.js` — implements the `processImage(base64, prompt, options) → { content, usage }` interface; normalises Gemini `usageMetadata` to `{ input_tokens, output_tokens }`
- `config.json` — `gemini.model`, `gemini.apiKey` (from `GEMINI_API_KEY` env), `costs.gemini_flash` / `costs.gemini_pro` pricing
- Provider dispatch extended to accept `--provider gemini`

**Acceptance Criteria:**
- `processImage()` returns `{ content, usage }` shape consistent with other providers
- `usage` normalisation unit-tested
- `--provider gemini` accepted in CLI
- API key read from `GEMINI_API_KEY` env variable

---

### [#142](https://github.com/donalotiarnaigh/textharvester-web/issues/142) Add DEBS monument classification pipeline — physical stone recording
**Labels:** enhancement

New standalone processing mode to document the physical characteristics of each funerary monument against the ADS/CBA DEBS schema (Mytum, CBA Practical Handbook 15). Separate from OCR transcription; run as a second pass over the same image folder. Green-lit by Professor Harold Mytum (Liverpool).

Note: consider completing #126 first — fixing the `_confidence_scores` API before adding another prompt class avoids propagating the fragile pattern. #143 (Gemini) is a soft prerequisite if provider comparison for classification is wanted.

**New components:**
- `MonumentClassificationPrompt` — extends `BasePrompt`; DEBS V3 schema prompt adapted to return a flat JSON object (20 fields); `confidence_level` (High/Medium/Low) maps to `needs_review`
- `monumentClassificationStorage.js` — new `monument_classifications` table with all 20 DEBS fields + cost + review columns; follows `graveCardStorage.js` pattern
- `fileProcessing.js` — new `monument_classification` source type branch
- Prompt registry, QueryService, CLI, and `config.json` wiring

**Implementation order (TDD red/green):**
1. `MonumentClassificationPrompt` tests → implementation
2. `monumentClassificationStorage` tests → implementation
3. `fileProcessing.js` branch tests → implementation
4. Wiring (prompt registry, QueryService, CLI, config)

**Key decisions:**
- Output format: JSON (OpenAI `json_object` mode; consistent with rest of pipeline)
- Pipeline mode: standalone `--type monument-classification`
- `[FV]` tags preserved in stored values; `field_verify_flags` provides summary
- Provider preference: GPT-5 (field testing shows GPT ≥ Gemini > Claude for classification)

**Acceptance Criteria:**
- `npm test` green including new unit tests for prompt and storage
- `ingest --type monument-classification --provider openai` stores records in `monument_classifications`
- `query list --type monument-classification` returns classified records
- Cost tracking works (`input_tokens`, `output_tokens`, `estimated_cost_usd` populated)
