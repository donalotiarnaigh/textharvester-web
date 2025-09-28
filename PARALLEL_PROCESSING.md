# Parallel Monument OCR Processing Design

## Objective
Implement parallel OCR processing so that each uploaded image is evaluated by both OpenAI and Anthropic vision models simultaneously. Persist both outputs side-by-side in the database so downstream workflows and UI can compare provider performance per image.

## Current Architecture Snapshot
- **Upload & Queueing** – `handleFileUpload` in `src/controllers/uploadHandler.js` normalises upload metadata and enqueues files, associating a *single* `provider` with each entry before calling `enqueueFiles` in `src/utils/fileQueue.js`.
- **Queue Worker** – `src/utils/fileQueue.js` processes one file at a time via `processFile(file.path, { provider })`, tracks retry state, and stores results/errors. The queue currently assumes a single provider per job and will retry failures sequentially.
- **File Processing** – `processFile` in `src/utils/fileProcessing.js` hydrates the appropriate model via `createProvider` (`src/utils/modelProviders/index.js`), requests OCR, passes the response through the prompt validator, and persists a single provider’s result with `storeMemorial` from `src/utils/database.js`.
- **Database Schema** – `src/utils/database.js` initialises the `memorials` table with per-record metadata (`memorial_number`, `first_name`, `last_name`, `year_of_death`, `inscription`, `file_name`, provider details). Each row represents one provider’s output for a file.
- **Results API/UI** – `src/controllers/resultsManager.js` exposes `/results-data`, `/download-json`, and `/download-csv`. The frontend (`public/js/modules/results/*.js` + `public/results.html`) assumes one row per provider output.

## High-Level Parallel Processing Plan
1. **Expand Data Model** to support both providers’ structured results on the same row. Proposed `memorials_parallel` (or extend current table) with:
   - Shared metadata: `id`, `file_name`, `memorial_number_ground_truth` (optional), `prompt_template`, `prompt_version`, `processed_date`.
   - OpenAI columns: `openai_memorial_number`, `openai_first_name`, `openai_last_name`, `openai_year_of_death`, `openai_inscription`, `openai_model_version`, `openai_status`, `openai_error_message`.
   - Anthropic columns: analogous `anthropic_*` fields.
   - Optional JSON blobs (`openai_raw_response`, `anthropic_raw_response`) for audit/debug.
   - Consider a lightweight `parallel_status` enum (`pending`, `partial`, `complete`) to track progress when one provider fails.
2. **Orchestrate Parallel Jobs** inside the worker layer so each file triggers both providers concurrently. Replace the single-provider `processFile` invocation with a coordinator that:
   - Loads the file once (base64) and creates provider-specific promises using existing provider classes.
   - Runs them with `Promise.allSettled` to capture both success and failure without short-circuiting.
   - Normalises outputs via current prompt templates and stores them with a new persistence helper that writes to the expanded table.
3. **Surface Both Outputs** through the API/UI. Extend `/results-data` to return combined records, and update the results table/modal to display side-by-side OpenAI vs Anthropic fields (including errors). Export routines should emit both columns in JSON/CSV for downstream analysis.
4. **Preserve Single-Provider Mode** via configuration (e.g., `.env` flag `PARALLEL_OCR=true`). When disabled, continue storing in the existing schema for backwards compatibility.

## Detailed Implementation Steps

### 1. Database Changes
- **Migration**: Create a new migration script under `src/utils/migrations/` (or extend existing process) to add the parallel columns. Approach options:
  - **Option A: New Table** `parallel_memorials` with the schema above, leaving the original `memorials` table untouched for historical data.
  - **Option B: Alter Existing Table** adding `openai_*` / `anthropic_*` columns and deprecate the single-provider fields. Requires backfill/rename for existing data.
- **Migration Strategy**:
  - Introduce a versioned migration runner (if not already) or extend `src/utils/migration.js` to handle schema evolution without manual SQLite edits.
  - Provide a backfill script (`scripts/migrate-memorials-to-parallel.js`) to pivot legacy rows into the new structure.
  - Update `storeMemorial` logic to write into the new schema (possibly splitting into `storeParallelMemorial` vs legacy path).
- **Indexing**: Add indexes on `file_name`, provider status columns, and `processed_date` to keep queries performant when filtering by provider or completion state.

### 2. Backend Processing Flow
- **Upload Handler** (`src/controllers/uploadHandler.js`):
  - Retain existing validation and PDF expansion. Instead of pushing provider-specific entries, enqueue jobs with `providers: ['openai', 'anthropic']` and pass prompt template/version.
  - Include a feature flag check (`if (process.env.PARALLEL_OCR === 'true')`) to decide whether to enqueue dual-provider work or fall back to the current single-provider behaviour.

- **Queue Module** (`src/utils/fileQueue.js`):
  - Introduce a new job shape: `{ path, providers, promptTemplate, promptVersion }`.
  - Update `enqueueFiles`, `dequeueFile`, and retry bookkeeping to handle provider arrays.
  - Replace the single `processFile` call with a new orchestrator, e.g. `processFileWithProviders(filePath, providers, prompts)`.
  - Capture per-provider errors within the job result instead of treating any failure as job-level retry. Retries should only re-run the failing provider unless the file read fails.
  - Mark queue progress based on the slowest provider; maintain per-provider performance metrics via `QueueMonitor`.

- **Processing Layer** (`src/utils/fileProcessing.js`):
  - Extract shared logic (file read, prompt resolution) into helper functions so they can be reused for each provider without duplicate disk IO.
  - Implement `processWithProvider(providerName, fileContext)` that returns a normalised payload `{ status: 'success'|'error', data|error }`.
  - Add `processFileWithProviders` to execute `Promise.allSettled` on `providers.map(processWithProvider)` and return a combined structure.
  - Route legacy `processFile` to call `processFileWithProviders` with a single provider for backwards compatibility.

- **Persistence** (`src/utils/database.js`):
  - Add methods such as `storeParallelResult(fileName, metadata, providerResults)` that upserts into the parallel table, updating only the provider-specific columns that completed.
  - Include helper queries to retrieve combined results for `/results-data` and exports.
  - Adjust `clearAllMemorials` to truncate both legacy and parallel tables when the “replace existing” option is used.

- **Error Handling**:
  - Continue leveraging `isEmptySheetError` but store the outcome under the provider’s status column so the UI can display “Empty sheet (OpenAI)” vs “Success (Anthropic)”.
  - Ensure failed provider entries preserve the source image for manual review or schedule a retry pipeline.

### 3. API & UI Updates
- **Results Controller** (`src/controllers/resultsManager.js`):
  - Fetch from the new parallel data source when the flag is enabled.
  - Return a structured response, e.g. `{ fileName, openai: {...}, anthropic: {...}, processed_date }` for the frontend to consume.
  - Adjust CSV/JSON export helpers (`src/utils/dataConversion.js`) to map parallel fields to headers like `openai_first_name`, `anthropic_first_name`, etc.

- **Frontend (`public/results.html` & `public/js/modules/results`)**:
  - Update the table header and row rendering to show both providers’ key fields, e.g., two name columns or a grouped layout with nested tables/cards.
  - Extend the modal to toggle between providers or show a side-by-side comparison of inscriptions and structured fields.
  - Surface provider status badges (success/error) to highlight discrepancies.
  - Ensure download buttons continue to function, now producing multi-provider datasets.

### 4. Configuration & Deployment
- Add `.env` / `config.json` entries:
  ```
  PARALLEL_OCR=true
  PARALLEL_PROVIDERS=openai,anthropic
  PARALLEL_MAX_CONCURRENCY=2
  ```
- Document rate-limit considerations for both APIs; ensure `PerformanceTracker` captures separate metrics per provider to monitor cost/latency.
- Update `README.md` with setup instructions for the new feature flag and migration steps.

### 5. Testing Strategy
- **Unit Tests**:
  - Mock provider classes in `src/utils/modelProviders/__tests__` to validate `processFileWithProviders` orchestrates concurrent calls and handles mixed outcomes.
  - Extend queue tests to cover partial failures and ensure retries target the correct provider subset.
  - Validate database persistence with in-memory SQLite (or tmp DB) to ensure columns update correctly without clobbering other providers’ data.

- **Integration / E2E**:
  - Add script-level tests (`scripts/test-providers.js`) to exercise the parallel path, verifying that both provider outputs land in the same record.
  - Update frontend Jest tests (`public/js/__tests__/results.test.js`) to cover the new table layout and error badges.

- **Performance Validation**:
  - Monitor queue throughput using `src/utils/performanceTracker.js` and update dashboards to reflect dual-provider timings (e.g., record both per-provider latency and combined wall-clock time).

### 6. Rollout & Migration Plan
1. Land database migration and persistence changes behind the `PARALLEL_OCR` flag.
2. Deploy with the flag off; run migration/backfill while keeping legacy flow live.
3. Enable parallel processing in staging, validating API rate limits and DB load.
4. Once stable, enable in production and communicate the new columns to data consumers.
5. Schedule clean-up to retire legacy single-provider code paths if no longer needed.

### 7. Future Enhancements
- Introduce a third-party provider adapter interface to make adding new models trivial.
- Implement conflict resolution heuristics (e.g., highlight fields where providers disagree) for editorial review.
- Support asynchronous re-processing of failed providers without re-uploading images.
- Provide analytics dashboards comparing provider accuracy over time.

## Summary
By restructuring the database to hold both providers’ outputs per file, orchestrating provider calls concurrently in the worker, and updating the API/UI to surface side-by-side data, we can evaluate OpenAI and Anthropic in parallel with minimal disruption to the existing flow. Feature flags and migration tooling will allow incremental rollout while maintaining backwards compatibility.
