# Issue Tracker — TextHarvester Web

_Last updated: 2026-04-08 · 49 open issues · [24 completed](#completed-issues)_

---

## Open & Blocked Issues

### [#121](https://github.com/donalotiarnaigh/textharvester-web/issues/121) No extraction accuracy measurement — impossible to detect quality regression

**Labels:** enhancement, data, high-priority
**Status:** Infrastructure complete — **blocked on real dataset** from community group

**Completed infrastructure:**
- `scripts/eval.js` — evaluation CLI with `computeCER`, `computeFieldAccuracy`, `evaluateNeedsReview`, `runEvaluation`
- `eval/gold-standard/` and `eval/fixtures/` skeleton with documented schema
- `__tests__/scripts/eval.test.js` — 36 passing unit tests; 5 data-dependent tests auto-skip when empty
- `docs/evaluation.md` — full documentation with `reviewThreshold = 0.70` rationale
- `npm run eval` / `npm run eval:check` scripts in `package.json`

**Remaining:**
1. Receive hand-labelled records (≥20 memorials) from local community group
2. Populate `eval/gold-standard/memorials.json` with real records
3. Generate CI baseline fixture from model outputs
4. Re-enable CI gate in `.github/workflows/ci.yml`
5. Verify field-level accuracy ≥ 0.85

---

## Backlog — Open Issues by Impact

**27 unstarted issues. Ordered by impact (highest first):**

### Critical — Product Readiness

Blocking adoption by external customers. Each unresolved item is a ceiling on how many users can be served without direct support.

**#162** — ~~Managed API keys and user onboarding for hosted deployments~~ ⏸️ Deferred — split into sub-issues
Hosted infrastructure exists (prod on Fly.dev, staging on Fly.dev) but serves a single set of server-side API keys with no per-user isolation, authentication, or usage tracking. Split into 5 incremental sub-issues:
- **#175** — User authentication and session management (foundation)
- **#176** — Bring-your-own-key (BYOK) API key management (depends on #175)
- **#177** — Per-user data isolation (depends on #175)
- **#178** — Frontend auth UI and user onboarding (depends on #175, #176)
- **#179** — Per-user usage dashboard (depends on #175, #177)

~~**#163** — Startup API key validation with guidance~~ ✅ Fixed
Server starts silently with no API keys. Users only discover the problem when their first upload fails. Need validation on startup, clear error messages, and links to provider key creation pages.

**Fix (branch `fix/issue-163-startup-api-key-validation`):** Added `src/utils/apiKeyValidator.js` with `validateApiKeys()`, `getProviderStatus()`, and `logValidationResults()`. Server now logs warnings with env var names and key creation URLs for each missing provider on startup, and an error-level message if no keys are configured at all. New `GET /api/providers/status` endpoint exposes availability (never key values) so the frontend can disable unavailable providers in the model selection dropdown. 20 new tests (17 unit + 3 integration), all 1464 tests passing.

### High Impact — Customer Self-Service

Determines whether customers can work independently or need ongoing support.

~~**#164** — Schema wizard should analyse all uploaded example images~~ ✅ Fixed
Wizard instructs users to upload 3-5 examples but `SchemaGenerator` only analyses the first image. Remaining uploads are wasted. Variable-format documents get incomplete schemas.

**Fix (branch `fix/issue-164-schema-wizard-all-images`):** Refactored `SchemaGenerator.generateSchema()` to analyze each uploaded image independently via new `_analyzeFile()` helper, then merge schemas with `_mergeSchemas()`. Union of fields across all images; majority-vote on conflicting types; first non-empty description wins. Gracefully handles partial failures (skips failed images, uses successful ones). Error thrown only if all analyses fail. 6 new tests added (multi-image analysis, field merging, type conflicts, partial failures, backward compatibility, all-fail error). All 1470 tests passing.

~~**#165** — Schema wizard — required/optional toggle per field~~ ✅ Fixed
All detected fields are marked required (hardcoded MVP assumption). Optional fields that the AI can't always extract cause false validation failures users can't fix without database access.

**Fix (branch `fix/issue-165-schema-required-optional-toggle`):** Modified `SchemaGenerator._mergeSchemas()` to track field frequency (how many schemas each field appeared in) and mark fields as required only if they appear in ALL analyzed images. Frontend wizard UI now displays a Required checkbox column in the field editor table, allowing users to toggle required/optional status. Manually added fields default to unchecked (optional). CLI `schema propose` command displays Required column in output. Backward compatible: single-image uploads and existing schemas continue to work as before. 5 new tests covering frequency tracking, required/optional computation, and edge cases. All 1480 tests passing.

~~**#166** — Inline result correction without re-processing~~ ✅ Fixed
No way to fix AI errors in the UI. "Needs Review" badge flags problems but offers no edit form. Users must re-process (burning API credits) or access the database directly.

**Fix (branch `fix/issue-166-inline-result-correction`):** Implemented full-stack inline editing with:
- **Backend DB layer**: `updateMemorial()`, `updateBurialRegisterEntry()`, `updateGraveCard()` with editable field whitelists; `markAsReviewed()` helper
- **API routes**: PATCH endpoints for each record type + POST review endpoints at `/api/results/{type}/{id}` and `/api/results/{type}/{id}/review`
- **Frontend**: "Edit" and "Mark as Reviewed" buttons in detail views; Mark as Reviewed functional (closes detail, removes badge, API call succeeds); Edit button shows placeholder message for Phase 2
- **Database**: Added `edited_at` and `edited_fields` columns to all 3 tables (memorials, burial_register_entries, grave_cards); added `needs_review`/`reviewed_at` to grave_cards
- **Tests**: 9 updateMemorial tests, 9 updateBurialRegisterEntry tests, 9 updateGraveCard tests, 23 API controller tests; all 1528 tests passing
- **Follow-up for Phase 2**: Full inline edit UI with form fields, save/cancel logic, optimistic updates

~~**#183** — Inline edit forms for all record types~~ ✅ Fixed
Phase 2 of #166. Complete the inline correction feature by adding full edit form UI with field editing, save/cancel, and optimistic updates. Users can now edit any extracted field directly in the detail view without re-processing.

**Fix (branch `fix/issue-183-inline-edit-forms`):** Implemented full inline edit form UI with:
- **New module** `public/js/modules/results/inlineEdit.js` (150 lines): Field config maps, form HTML generation, value extraction, API submission, edit/cancel/save orchestration
- **Form generation**: Bootstrap 4 forms with pre-populated, XSS-escaped values; change detection via `data-original` attributes
- **Edit mode toggle**: `enterEditMode()` stores original HTML, swaps in form; `exitEditMode()` restores original
- **Save/cancel logic**: `handleSave()` extracts changed fields, submits PATCH, re-renders detail on success; error display on failure
- **Event delegation**: Edit/Save/Cancel buttons wired in main.js; record JSON stored on detail rows for form population
- **Data persistence**: Updates in-memory `allMemorials` array and re-renders detail rows with API response data
- **CSS styling**: `.inline-edit-form` classes, button states, textarea sizing, error alerts
- **Tests**: 26 unit tests covering field configs, form generation, value extraction, edit mode toggle, cancel/restore
- **Bug fixes**: Fixed 2 copy-paste bugs in detail view button variable references (grave-card and burial-register types)
- **All tests passing**: 26 new tests + 3019 existing tests, no regressions

~~**#167** — Project/collection model to group uploads~~ ✅ Fixed
All records go into flat tables with no project concept. Users processing multiple graveyards or surveys have no way to partition, filter, or export by collection.

**Fix (branch `fix/issue-167-project-collection-model`, PR #195):** Implemented full project/collection model with projects table (UUID primary key, unique names), project_id columns in all three data tables (memorials, burial_register_entries, grave_cards), indexes for fast filtering. Updated IngestService to thread project_id through upload→queue→processing→storage pipeline. Added project management UI (public/projects.html) with CRUD operations, upload form project selector, and results filtering by project. Frontend modules: projectSelection.js, projectFilter.js. Backend: projectStorage.js CRUD, projectController.js routes, projectRoutes.js. QueryService filters by projectId. Backward compatible — existing records have project_id = NULL. Deletion protected if project has associated records. 10 new unit tests (projectStorage, projectRoutes), 343-line E2E test suite, all 1596 tests passing.

~~**#168** — Custom schemas — integrate with confidence scoring and retry pipeline~~ ✅ Fixed
`DynamicProcessor` bypassed the standard pipeline entirely. Custom schemas got no confidence scoring, no validation warnings, no retry logic, no audit logging, no cost tracking.

**Fix (branch `claude/review-next-issue-2CPME`):** Fixed critical bug where `provider.processImage` returned `{ content, usage }` but `DynamicProcessor` treated the whole object as LLM data. Refactored to use `processWithValidationRetry` (retry with format-enforcement preamble on parse/validation failure), `injectCostData` (input/output tokens + USD cost), `llmAuditLog.logEntry` (success and error), `processing_id` via `crypto.randomUUID()`, and `needs_review = 0` default. `SchemaDDLGenerator` now includes `processing_id`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, `needs_review` in all new dynamic tables. Old tables handled gracefully via `PRAGMA table_info` column filter. 10 new unit tests + E2E mock fix. 1556 tests passing.

~~**#169** — Pre-processing cost estimate before batch submission~~ ✅ Fixed
No cost visibility before processing. Session cap ($5.00) is buried in config.json. Community groups uploading large batches hit the cap partway through with no prior warning.

**Fix (branch `fix/issue-169-cost-estimate-before-batch`):** Implemented full cost estimation system: `CostEstimator` utility queries historical average token usage per file from database, falls back to conservative source-type defaults when no history exists. Handles complex cases: burial registers (multiple entries per file) grouped and averaged, PDF multiplier (3x pages for non-grave-cards), and provider-to-model mapping. New `GET /api/cost-estimate` endpoint validates params and returns detailed estimate. Frontend `costEstimate.js` module fetches estimates on file add/remove and selector changes (debounced), renders Bootstrap card with total cost, per-file cost, session cap ($5.00) with percentage bar (green/yellow/red), warning if exceeds cap, and disclaimer. HTML panel in index.html between "Replace existing" checkbox and dropzone. Wired in dropzone.js init. 19 unit tests (CostEstimator), 12 route tests, all 1621 tests passing.

~~**#170** — Volume ID autocomplete from existing values~~ ✅ Fixed
Freeform text field with no validation. Teams using inconsistent naming ("Vol 1", "volume_1", "vol-1") fragment their data with no way to merge or reconcile.

**Fix (branch `fix/issue-170-volume-id-autocomplete`):** Implemented HTML5 `<datalist>` autocomplete using existing database values. Added `getDistinctVolumeIds()` query function to `burialRegisterStorage.js` to fetch unique volume IDs. Created `/api/volume-ids` endpoint in new `volumeIdRoutes.js`. Frontend JS module fetches volume IDs when burial_register source type is selected and populates the datalist using DOM API (safe from XSS). No external dependencies. Tests: 5 new storage query tests + 4 route tests, all 1636 tests passing, lint clean.

~~**#171** — Schema versioning with column migration on edit~~ ✅ Fixed
No migration path when a schema is edited after processing documents. `version` column exists but is never incremented. Users who missed a field after processing 500 documents need direct support.

**Fix (branch `fix/issue-171-schema-versioning-column-migration`):** Implemented full schema editing with automatic column migration and version tracking. Backend: `SchemaDDLGenerator.generateAlterColumns()` and `mapFieldTypeToSQL()` helpers for DDL generation. `SchemaManager.updateSchema(id, changes)` validates schema changes (rejects type changes and field removals, allows adding new fields, updating descriptions/required status), runs transactional `ALTER TABLE ADD COLUMN` migrations via `runColumnMigration()`, increments `version`, and adds `updated_at` column. `PUT /api/schemas/:id` endpoint with proper error handling (404 if not found, 422 if unsupported operations). Frontend: Edit button on schema list page shows schema version (v1, v2, etc.). Schema wizard detects `?edit=<id>` param, pre-populates fields with existing fields locked (name/type disabled, delete button hidden), allows adding new fields freely. Save button shows confirmation: "This will add N new column(s): field_a, field_b". Tests: 5 SchemaDDLGenerator tests + 2 SchemaManager tests (not found, type changes). All 1642 tests passing.

### High Impact — Data Quality & Accuracy

Direct improvements to correctness and trustworthiness of extracted data.

**#114** — Implement evaluation metrics (IFR, field-level F1) with Historic Graves ground truth
Without measurement there is no way to know if changes improve or regress quality. Prerequisite for #115.

**#112** — ~~Integrate Logainm API for placename validation (RAG enhancement)~~ ⏸️ Deferred
Post-processing validation of placenames against an authoritative source; catches a class of error no prompt tuning can fix.
**Exploratory finding (2026-03-18):** The primary record type (memorials/monument photos) has no structured placename fields — location data is embedded in free-text `inscription` only. Logainm integration maps cleanly to burial registers (`parish_header_raw`, `county_header_raw`, `abode_raw`) but burial registers are not the primary business use case. Extracting placenames from inscription text would require NER/regex parsing, adding significant complexity for uncertain value. Deferred until structured placename fields are added to the memorial schema or burial register processing becomes a priority.

**#113** — Implement RimAG (Retrieval-in-the-Middle) two-pass processing strategy
Two-pass extraction has shown significant accuracy gains in VLM literature; highest-leverage prompt-level improvement available.

**#115** — Fine-tune GPT-4o on Historic Graves verified data for domain-specific accuracy
Domain fine-tuning, but blocked on #114 (need metrics first) and on obtaining a labelled dataset.

### Medium Impact — Throughput & Scalability

Affects batch processing capacity and result delivery speed.

**#39** — Paginate results and stream exports (CSV/JSONL)
Large result sets cause memory pressure and slow UI; pagination is essential as data grows.

~~**#234** — Add Mistral OCR provider~~ ✅ Fixed
Integrates `mistral-ocr-latest` (specialist historical-document OCR) via a two-step pipeline: OCR extraction → `mistral-large-latest` chat structuring. New `MistralProvider` class; `getProviderPrompt('mistral')` cases in all three prompt templates; backward-compatible `perPageCost` extension to `calculateCost()`. See [implementation plan comment](https://github.com/donalotiarnaigh/textharvester-web/issues/234#issuecomment-4224939683).

**Fix (branch `fix/issue-234-mistral-ocr-provider`):** Two-step pipeline: `client.ocr.process()` (mistral-ocr-latest) extracts markdown from the image, then `client.chat.complete()` (mistral-large-latest) structures it into JSON using the standard prompt templates. New `MistralProvider` class with full `withRetry`, `llmAuditLog.logEntry`, and `PerformanceTracker` integration. Registered in provider factory. `getProviderPrompt('mistral')` cases added to all six prompt classes; `'mistral'` template instances added to all six maps in `providerTemplates.js`. `calculateCost()` extended with backward-compatible `pages_processed * perPageCost` branch. Mistral config block and `costs.mistral` pricing added to `config.json`. Manual Jest mock at `__mocks__/@mistralai/mistralai.js` resolves ESM-only SDK incompatibility with CJS test runner. 23 new unit tests, all 1766 existing tests passing.

**#96** — Enable simultaneous GPT and Claude processing for burial registers
Run two providers in parallel and compare/merge; improves throughput and enables consensus quality checks.

**#10** — Implement Parallel Model Processing & Automated Comparison
Broader version of #96 across all record types; enables provider benchmarking.

### Medium Impact — Code Health & Maintainability

Reduces defect risk and makes future feature work cheaper.

**#99** — Refactor: Implement Strategy Pattern for Record Processors
`fileProcessing.js` has three near-identical branches; a strategy pattern would cut duplication and simplify adding new types.

**#102** — Refactor: Abstract StorageService for Record Types
Four storage modules share boilerplate; a base class would reduce maintenance surface.

**#101** — Feat: Implement Strict Validation Middleware
Input validation is scattered; centralised middleware prevents malformed data from reaching processing logic.

**#100** — Refactor: Decouple Type-Specific UI Config from main.js
Frontend `main.js` has type-specific rendering logic interleaved; extracting config improves readability and testability.

**#173** — Upgrade sqlite3 to v6 to resolve tar and @tootallnate/once vulnerabilities
9 Dependabot alerts (5 high `tar`, 1 low `@tootallnate/once`, plus transitive deps) all root in `sqlite3@5.x` → `node-gyp` → `tar`. Build-time only (not runtime exploitable), but blocks a clean `npm audit`. Requires breaking upgrade to `sqlite3@6.0.1` with verification across all storage modules.

### Lower Impact — Polish & Optimisation

Valuable but not blocking other work or affecting correctness.

**#98** — Enhancement: Dynamic CSV Flattening for All Types
Current CSV export is hard-coded per type; dynamic flattening would auto-adapt to schema changes.

**#40** — Optimize image pipeline and retry caching
Performance improvement; current pipeline works but wastes bandwidth on retries of already-converted images.

**#41** — Reduce logging verbosity and sample performance metrics
Operational polish; noisy logs make debugging harder but don't affect functionality.

**#26** — Enhancement: Provider-Specific Name Handling Configuration
Edge-case name formatting differences between providers; low frequency in practice.

**#23** — UI Inconsistency: Copy Button Visible But Only Works When Modal Expanded
Minor UX bug; button is visible but non-functional in collapsed state.

~~**#187** — Cost data (tokens, USD) missing from CSV export and web results UI~~ ✅ Fixed
Database stores `input_tokens`, `output_tokens`, `estimated_cost_usd` for all records, but these are not visible in CSV exports or the web results table. Users cannot compare cost efficiency across providers or export cost analysis. Discovered during ardmore flash photography test — OpenAI cost $0.31 for 26 files vs Anthropic $0.47.

**Fix (branch `claude/review-next-issue-2CPME`, PR #192):** Added `input_tokens`, `output_tokens`, `estimated_cost_usd` to `MEMORIAL_CSV_COLUMNS`. Added sortable Cost (USD) column to results table header and memorial main row. Added Input Tokens, Output Tokens, Cost (USD) to memorial detail view. Fixed detail row colspan from 9 to 11.

~~**#188** — Gemini cost tracking returns 0 tokens and $0 cost for all records~~ ✅ Fixed
Gemini provider showed 0 input_tokens, 0 output_tokens, $0.00 estimated_cost for all successful records.

**Fix (branch `claude/next-issue-qoTF5`):** `usageMetadata` is nested under `response.response` in the Google Generative AI SDK, but `geminiProvider.js` was reading `response.usageMetadata` (top level) — always `undefined`, always defaulting to 0. Changed lines 132-133 to `response.response.usageMetadata?.promptTokenCount` / `candidatesTokenCount`. Updated all 11 test mocks to reflect the real SDK structure. 26 tests passing.

---

## Research Issues

_23 issues opened 2026-04-07. Based on VLM digitisation techniques survey covering 30+ papers (2024–2026). Fully investigated and triaged 2026-04-07. E = effort (1–5), I = impact (1–5)._

### Ready to Implement — 6 issues

Deterministic accuracy wins and cost reductions with well-defined implementation paths.

| # | Technique | E | I | Status |
|---|-----------|---|---|--------|
| [#216](https://github.com/donalotiarnaigh/textharvester-web/issues/216) | Extended cross-field validation rules (date arithmetic, age plausibility, ordering) | 2 | 3 |
| [#213](https://github.com/donalotiarnaigh/textharvester-web/issues/213) | Degenerate output detection (CCR metric, length ratio, entropy) | 2 | 3 | ✅ Implemented locally — PR pending |
| [#215](https://github.com/donalotiarnaigh/textharvester-web/issues/215) | Historical date format parsing (Latin months, Old Style/New Style) | 2 | 3 | ✅ Implemented — PR #226 |
| [#222](https://github.com/donalotiarnaigh/textharvester-web/issues/222) | Prompt caching for repeated system prompts and schemas | 2 | 3 | ✅ Implemented — PR #230, merged 2026-04-08 |
| [#206](https://github.com/donalotiarnaigh/textharvester-web/issues/206) | Schema-constrained generation across all providers | 3 | 4 | ✅ Implemented — PR #229 |
| [#219](https://github.com/donalotiarnaigh/textharvester-web/issues/219) | Active learning loop with Langfuse trace logging | 3 | 3 |

### Prototype & Evaluate — Backlog — 15 issues

Techniques requiring empirical validation on real data before full pipeline integration. Ordered by impact ↓, effort ↑.

| # | Technique | E | I |
|---|-----------|---|---|
| [#205](https://github.com/donalotiarnaigh/textharvester-web/issues/205) | Self-consistency sampling with majority voting | 3 | 4 |
| [#207](https://github.com/donalotiarnaigh/textharvester-web/issues/207) | Field-level multi-model ensemble voting (RAGsemble / Guardian Pipeline) | 3 | 4 |
| [#212](https://github.com/donalotiarnaigh/textharvester-web/issues/212) | Multimodal correction pass (image + OCR → second VLM) | 3 | 4 |
| [#223](https://github.com/donalotiarnaigh/textharvester-web/issues/223) | Cascading model strategy (cheap first-pass → confident escalation) | 3 | 4 |
| [#203](https://github.com/donalotiarnaigh/textharvester-web/issues/203) | Row-level image slicing with two-shot prompting | 4 | 4 |
| [#221](https://github.com/donalotiarnaigh/textharvester-web/issues/221) | Batch API usage (OpenAI + Anthropic, 50% flat discount) | 4 | 4 |
| [#225](https://github.com/donalotiarnaigh/textharvester-web/issues/225) | Community-driven transcription correction (FamilySearch model) | 2 | 3 |
| [#209](https://github.com/donalotiarnaigh/textharvester-web/issues/209) | Minimal pre-processing pipeline with CLAHE via Sharp.js | 2 | 3 |
| [#204](https://github.com/donalotiarnaigh/textharvester-web/issues/204) | OCR-Agent reflection mechanisms (capability + memory reflection) | 3 | 3 |
| [#210](https://github.com/donalotiarnaigh/textharvester-web/issues/210) | Region/row cropping before VLM inference | 3 | 3 |
| [#214](https://github.com/donalotiarnaigh/textharvester-web/issues/214) | Retrieval-augmented grounding for place/person names | 3 | 3 |
| [#218](https://github.com/donalotiarnaigh/textharvester-web/issues/218) | LLM-as-judge / Panel of LLM Judges (PoLL) | 3 | 3 |
| [#224](https://github.com/donalotiarnaigh/textharvester-web/issues/224) | Two-step extraction (free-text → structured) | 3 | 3 |
| [#208](https://github.com/donalotiarnaigh/textharvester-web/issues/208) | Composite confidence scoring (cross-model + logprobs + self-consistency + doc quality) | 4 | 3 |
| [#211](https://github.com/donalotiarnaigh/textharvester-web/issues/211) | Perspective correction for monument photographs | 4 | 2 |

### Closed — Deferred — 2 issues

Effort exceeds expected impact for the current API-only, low-infrastructure deployment profile.

| # | Technique | Reason |
|---|-----------|--------|
| [#217](https://github.com/donalotiarnaigh/textharvester-web/issues/217) | LangGraph.js agentic pipeline | Key agentic patterns already implemented; benchmark evidence doesn't apply to heritage records; LangChain ecosystem churn risk |
| [#220](https://github.com/donalotiarnaigh/textharvester-web/issues/220) | CHURRO open-source OCR model (Stanford, EMNLP 2025) | Requires external GPU infrastructure; cost advantage only at high volume; accuracy on TextHarvester corpus unverified |

---

#### Ready to Implement — detail entries

---

### [#216] Extended cross-field validation rules (date arithmetic, age plausibility, ordering)
**Status**: ✅ Implemented — PR pending, merged 2026-04-07
**Branch**: `fix/issue-216-extended-cross-field-validation`

## Technique
After per-field extraction, apply deterministic arithmetic and ordering checks across related fields (e.g. death year vs. inscription age → implied birth year; burial date must be after death date; year_of_death within a plausible historical range) to flag logically inconsistent records without making any additional API calls.

## Research basis
No external paper; the technique is standard data-quality practice and extends the cross-field validation already implemented in issue #123 (IDENTICAL_NAMES, IMPLAUSIBLE_AGE), which demonstrated that deterministic checks cleanly integrate with the existing `validationWarnings` / `needs_review` pipeline.

## Viability assessment
Fully feasible within the existing Node.js/API-only stack — every check is pure integer arithmetic or regex string parsing on fields already extracted by the AI. The `crossFieldWarnings` pattern is established in both `MemorialOCRPrompt.validateAndConvert()` and `BurialRegisterPrompt.validateAndConvertEntry()`, and `GraveCardPrompt.validateAndConvert()` already returns `validationWarnings: []` ready to be populated. No new npm packages, no schema changes, and no provider-layer modifications are required.

## Ratings
- **Effort**: 2/5 — Purely additive changes to three existing `validateAndConvert()` methods following a well-established pattern; no new modules, no schema changes, and no integration wiring needed.
- **Impact**: 3/5 — Catches logical inconsistencies (future death years, burial before death, age/year arithmetic mismatches) that per-field confidence scores cannot detect, improving `needs_review` precision for the most common AI transcription errors on historical records.

## Relevant existing code
- `src/utils/prompts/templates/MemorialOCRPrompt.js:200–232`: existing `crossFieldWarnings` block with IDENTICAL_NAMES and IMPLAUSIBLE_AGE checks — direct extension point.
- `src/utils/prompts/templates/BurialRegisterPrompt.js:321–337`: existing `crossFieldWarnings` block with IMPLAUSIBLE_AGE on `age_raw` — needs date-order and year-range rules added.
- `src/utils/prompts/templates/GraveCardPrompt.js:193–195`: returns `validationWarnings: []` and already validates ISO date format; ready to accept ordering checks on `date_of_death.iso` vs `date_of_burial.iso`.
- `src/utils/processingHelpers.js`: `applyValidationWarnings()` consumes the warnings array and sets `needs_review = 1` — no changes needed here.
- `src/utils/database.js` / `src/utils/burialRegisterStorage.js` / `src/utils/graveCardStorage.js`: `validation_warnings TEXT` column already exists in all three tables.

## Implementation sketch
- **`MemorialOCRPrompt.validateAndConvert()`**: add `DEATH_YEAR_IMPLAUSIBLE` (year_of_death < 1400 or > current year) and `DEATH_YEAR_FUTURE` (year_of_death > current year) checks after the existing IMPLAUSIBLE_AGE block; cap `confidenceScores.year_of_death` to 0.4 on either trigger.
- **`BurialRegisterPrompt.validateAndConvertEntry()`**: add `DATE_ORDER_ANOMALY` — parse a 4-digit year out of `burial_date_raw` and compare against the 4-digit year in `year_header_raw`; if burial year is more than 2 years after the page header year, flag as anomalous (the ±2 tolerance handles cross-year-boundary pages); add `BURIAL_YEAR_IMPLAUSIBLE` if the parsed burial year falls outside 1500–current year.
- **`GraveCardPrompt.validateAndConvert()`**: iterate `interments`; for each entry with both `date_of_death.iso` and `date_of_burial.iso`, add `BURIAL_BEFORE_DEATH` if burial ISO is strictly before death ISO (`Date.parse` comparison); add `AGE_IMPLAUSIBLE` if `age_at_death` parses to a number > 150 or < 0; add `AGE_DEATH_MISMATCH` if (death year − age) < 1400.
- **Config**: no new config keys needed; checks always run (same behaviour as existing #123 rules); `config.confidence.reviewThreshold` (0.70) already gates the `needs_review` flag.
- **Tests**: add a `describe('extended cross-field validation')` block in each of the three prompt test files — approximately 3–4 new `it()` cases per file covering the happy path (no warning), each new warning trigger, and confidence-cap behaviour (9–12 tests total).

## Risks and gotchas
- **Regex fragility on raw date strings**: `burial_date_raw` and `year_header_raw` are transcribed verbatim (e.g. "8th March 1847", "1847", "March 1847") — the year extractor must use `/(\d{4})/` rather than full date parsing to stay robust; non-extractable strings should be silently skipped, not warned.
- **GraveCardPrompt lacks confidence score infrastructure**: unlike the memorial and burial register prompts, `GraveCardPrompt.validateAndConvert()` returns `confidenceScores: {}`; the ordering warnings can still populate `validationWarnings` and force `needs_review = 1`, but per-field confidence caps are not available for grave card fields without a broader refactor.
- **Interaction with issue #215 (historical date normalisation)**: once #215 is implemented, the `burial_date_raw` year-extraction logic in this issue should delegate to `historicalDateParser.js` rather than maintain its own regex — implement #215 first or leave a TODO comment to avoid duplication.
- **False-positive risk on legitimate multi-year pages**: burial registers sometimes span year boundaries; the ±2-year tolerance on `DATE_ORDER_ANOMALY` mitigates this but may still fire on volumes that span longer gaps; the `needs_review` flag (rather than a hard error) keeps this non-destructive.

## Recommended next step
Implement as described — the checks are deterministic, the integration pattern is proven, no new dependencies are required, and the existing `validation_warnings` infrastructure handles all edge cases gracefully.
---

### [#213] Degenerate output detection (CCR metric, length ratio, entropy)
**Status**: ✅ Implemented locally — PR pending, 2026-04-08
**Branch**: `fix/issue-213-degenerate-output-detection`

## Technique
After a successful VLM extraction, apply three lightweight algorithmic checks — Character Confusion Rate (CCR), output-to-image length ratio, and Shannon entropy of the output text — to detect fluent hallucinations that pass JSON validation but contain invented content.

## Research basis
FedCSIS 2025 found VLM hallucinations on historical documents are fluent and undetectable by structural checks alone, and established a CCR threshold of ~40% as an effective discriminator for degenerate outputs.

## Viability assessment
All three metrics are pure-JS arithmetic over the already-captured `raw_response` string in `llmAuditLog.js`, requiring no new API calls, no GPU, and no additional npm dependencies. Integration is a natural extension of the existing `applyValidationWarnings()` pattern in `processingHelpers.js`, which already feeds a `_validation_warnings` array into `needs_review` flags and database columns on all three record types. The main risk is threshold calibration: aggressive thresholds on short inscriptions (e.g. a memorial with only a name and date) will produce false positives unless minimum-length guards are applied.

## Ratings
- **Effort**: 2/5 — A single new module (~100 lines) plus one-line integration hooks in the three processor files and a config section; no schema changes, no new dependencies, and the `validation_warnings` + `needs_review` path is already wired end-to-end.
- **Impact**: 3/5 — Directly addresses the silent failure mode where a blank or damaged image yields a plausible-looking but entirely fabricated extraction that passes confidence scoring and validation; impact is bounded by the real-world frequency of this failure mode in the target image set.

## Relevant existing code
- `src/utils/processingHelpers.js`: `applyValidationWarnings(data, warnings)` — the natural hook to inject degenerate-detection results; sets `data.needs_review = 1` and populates `data.validation_warnings`.
- `src/utils/llmAuditLog.js`: stores `raw_response TEXT` (full response before JSON parsing) — ideal input for CCR and entropy computation, already captured for every call.
- `src/utils/responseLengthValidator.js`: existing `validateResponseLength()` tracks response character length against provider limits; the length-ratio check is a complementary measurement against expected content length.
- `src/utils/errorTypes.js`: pattern for validation error types that feed into `_validation_warnings`.
- `config.json` `confidence` section: establishes the pattern for feature-flagged threshold configuration.

## Implementation sketch
- **New module** `src/utils/degenerateOutputDetector.js`: export `computeEntropy(text)` (Shannon entropy over character frequencies), `computeCCR(text)` (fraction of characters outside the expected Latin/digit/punctuation set for historical English), `computeLengthRatio(rawResponse, minExpected)` (raw char count divided by a per-source-type floor), and `detectDegenerate(rawResponse, sourceType, thresholds)` which combines all three and returns `{ isDegenerate, metrics, reasons[] }`.
- **Modified** `src/utils/processingHelpers.js`: add `applyDegenerateDetection(data, rawResponse, sourceType, config)` helper that calls `degenerateOutputDetector.detectDegenerate` and, if positive, pushes a `DEGENERATE_OUTPUT` reason string into `data._validation_warnings` (triggering the existing `applyValidationWarnings` path).
- **Modified processors** (`memorialProcessor.js`, `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`): after `processWithValidationRetry` returns, call `applyDegenerateDetection` using the `raw_response` captured in the audit log entry or passed through `usage`.
- **Modified `config.json`**: add `"degenerateDetection": { "enabled": true, "ccrThreshold": 0.40, "minEntropy": 1.5, "lengthRatioMin": 0.05 }` — all thresholds tunable without code changes.
- **New test file** `__tests__/utils/degenerateOutputDetector.test.js`: unit tests covering normal English text, repetitive hallucination, high-symbol output, very short responses, and per-source-type length floor edge cases (8–10 tests).

## Risks and gotchas
- **False positives on short inscriptions**: a genuine memorial with only "JOHN SMITH | 1842" has low character count and moderate entropy; the length-ratio and entropy floors must be set conservatively or conditioned on minimum output length to avoid flagging valid short extractions.
- **CCR character-set dependency**: if future document types include Irish-language text (fada characters: á, é, í, ó, ú) or Latin abbreviations, the expected character set must be extended or CCR will fire spuriously on correct extractions.
- **No ground truth for threshold tuning**: without a labelled set of known-degenerate outputs the thresholds are set from the paper's findings on a different corpus; an initial deployment with `enabled: false` and metric-only logging via the audit log is strongly recommended before activating the `needs_review` flag.
- **Raw response access**: `raw_response` is logged to `llm_audit_log` as a fire-and-forget side effect; the main processing pipeline does not currently return the raw string to the processor caller, so the detector will need either a direct pass-through from `processWithValidationRetry` or a query back to the audit log — the cleaner path is extending the return value of `processWithValidationRetry` to include `rawResponse`.

## Recommended next step
Implement as described — but deploy initially with `degenerateDetection.enabled: false` and add metric-only logging to the audit log to collect CCR/entropy/length-ratio baselines across real uploads before activating the `needs_review` flag.
---

### [#215] Historical date format parsing (Latin months, Old Style/New Style)
**Status**: ✅ Implemented — PR [#226](https://github.com/donalotiarnaigh/textharvester-web/pull/226), merged 2026-04-07
**Branch**: `fix/issue-215-historical-date-parsing`

## Technique
Post-extraction normalization of archaic date strings — Latin month abbreviations ("7ber" = September through "Xber/10ber" = December), dual-dated years ("1723/4" for the Old Style / New Style calendar boundary), and pre-1752 Julian calendar year-start correction (new year was 25 March, not 1 January) — into a canonical ISO partial-date and a reliable integer year suitable for querying and cross-field validation.

## Research basis
Standard archival palaeography practice; English parish records before 2 September 1752 used the Julian calendar with Lady Day (25 March) as the legal new year, producing dual-dated entries that silently corrupt `year_of_death` extraction in any system expecting Gregorian integers.

## Viability assessment
The parsing rules are entirely deterministic regex/lookup tables with no API calls, no GPU, and no external infrastructure — fully compatible with a Node.js backend. The existing `burial_date_raw` and `year_of_death` fields already store the AI's raw transcription, so normalised counterparts can be added as new columns without touching the provider pipeline. The `needs_review` flag and `validation_warnings` array (introduced in #123) provide a ready-made channel to surface ambiguous dual-dated entries to users.

## Ratings
- **Effort**: 2/5 — A new self-contained `historicalDateParser.js` module plus two new DB columns; integration with existing processors is a handful of lines each.
- **Impact**: 3/5 — Directly prevents silent year extraction errors on the entire pre-1752 English and Irish parish corpus, which is a significant portion of the heritage records this project targets.

## Relevant existing code
- `src/utils/prompts/templates/BurialRegisterPrompt.js`: `validateAndConvertEntry()` is where cross-field warnings are generated and `burial_date_raw` is validated — natural insertion point for date normalisation.
- `src/utils/prompts/templates/MemorialOCRPrompt.js`: `validateAndConvert()` contains the IMPLAUSIBLE_AGE check that already uses `year_of_death`; normalised year would make this check more reliable for pre-1752 records.
- `src/utils/database.js`: `year_of_death` column has a CHECK constraint allowing TEXT patterns — the normalised column needs its own constraint or a more permissive type.
- `src/utils/burialRegisterStorage.js`: `buildBurialEntryParams()` assembles the INSERT parameter array — needs two new fields appended.
- `src/utils/dataValidation.js`: `validateAndConvertTypes()` parses `year_of_death` to integer and logs a warning on failure — this is the silent failure point for "1723/4" style values.

## Implementation sketch
- **New module `src/utils/historicalDateParser.js`**: exports `parseBurialDate(rawString)` returning `{ normalizedDate, normalizedYear, warnings[] }`. Handles: (1) Latin ordinal abbreviations via lookup table (`{7: 'Sep', 8: 'Oct', 9: 'Nov', X: 'Nov', 10: 'Nov', Dec: 'Dec'}`); (2) dual-year pattern `YYYY/YY` → extract Gregorian year as the latter value (e.g. "1723/4" → 1724); (3) OS year-start correction — if month is Jan, Feb, or 1–24 Mar and year is pre-1752, add 1 to infer Gregorian year and append warning `OLD_STYLE_YEAR_CORRECTED`.
- **Schema migration**: add `burial_date_normalized TEXT` and `burial_date_year INTEGER` columns to `burial_register_entries` via `runColumnMigration()` in `database.js`; add `year_of_death_normalized INTEGER` to `memorials` for parity.
- **Integration in `BurialRegisterPrompt.validateAndConvertEntry()`**: call `parseBurialDate(result.burial_date_raw)` after field validation; write `normalizedDate` and `normalizedYear` onto the result object; push any parser warnings into `crossFieldWarnings`.
- **Integration in `MemorialOCRPrompt.validateAndConvert()`**: call `parseBurialDate` on the `inscription` field if it contains a year pattern, or expose a separate normalisation step in `memorialProcessor.js` for `year_of_death` strings.
- **Storage**: append `burial_date_normalized` and `burial_date_year` in `buildBurialEntryParams()` and the INSERT statement in `burialRegisterStorage.js`; no changes needed to the frontend unless a normalised-date column is surfaced in the results table.
- **Tests**: unit-test `historicalDateParser.js` with a table of known inputs (e.g. `"7ber 1712"` → Sep 1712, `"Jan 1723/4"` → Jan 1724 + warning, `"Xber 1749"` → Dec 1749); integration-test that `validateAndConvertEntry` propagates warnings to `validation_warnings` and sets `needs_review = 1`.

## Risks and gotchas
- **Regex ambiguity**: "7" in ordinary dates like "7th January 1803" must not be misread as September — the Latin abbreviation pattern only fires when it appears as `\d{1,2}ber` or `Xber` without a following month name.
- **Dual-dating convention inconsistency**: some registrars wrote "1723/4" meaning OS/NS, others used it informally without calendar intent; the parser should set `needs_review = 1` on all dual-dated entries rather than silently committing a Gregorian year.
- **`year_of_death` CHECK constraint**: the existing `GLOB '*-*'` allowance in the memorials table was designed for ranges, not OS/NS notation — "1723/4" still fails the integer cast, so the normalised column must carry the integer year and the raw column must remain untouched.
- **Scope creep**: full Julian→Gregorian proleptic conversion (adjusting actual day counts, not just year-start) is a separate and substantially harder problem; this sketch intentionally covers only the year-boundary and month-abbreviation issues documented in the issue.

## Recommended next step
Implement as described — the parsing rules are well-defined, the module is self-contained, no external dependencies are needed, and the existing `needs_review`/`validation_warnings` infrastructure handles ambiguous cases gracefully.
---

### [#222] Prompt caching for repeated system prompts and schemas
**Status**: ✅ Implemented — PR #230, merged 2026-04-08
**Branch**: `fix/issue-222-prompt-caching`

## Technique
Attach provider-native cache markers to static system prompts so that subsequent API calls within a session reuse the cached version rather than re-charging for the same tokens on every request.

## Research basis
No specific paper; both OpenAI (November 2024) and Anthropic (August 2024) released production prompt caching APIs: OpenAI caches automatically at 50% discount for repeated prefixes ≥1024 tokens; Anthropic caches via explicit `cache_control: { type: "ephemeral" }` markers at 90% discount on reads (10% of full input rate) with a 5-minute TTL extended to 1 hour in later versions; Google Gemini context caching requires explicit cache object creation via `GoogleAICacheManager` with a 2048-token minimum per cached content block.

## Viability assessment
For Anthropic (the highest per-token cost provider at $5/$25 per MTok), caching is not automatic — adding `cache_control` to the system block requires changing the `system` parameter in `anthropicProvider.js` from a plain string to a content-block array (a ~3-line change), and the response `usage` will then include `cache_creation_input_tokens` and `cache_read_input_tokens` requiring an update to `calculateCost()`. For OpenAI, prompt caching is already fully automatic at 50% discount with no code changes, but the MemorialOCRPrompt system prompt is approximately 375 tokens — below OpenAI's 1024-token minimum — meaning GPT-5.4 cache hits may not activate for current prompt sizes. Gemini context caching is not viable for current prompt sizes as `gemini-3.1-pro-preview` requires a 2048-token minimum, exceeding all three prompt templates.

## Ratings
- **Effort**: 2/5 — The core Anthropic change is 3-4 lines in `anthropicProvider.js` plus a `calculateCost()` update; OpenAI is already automatic with an optional improvement to read `cached_tokens` from the usage response for accurate cost reporting.
- **Impact**: 3/5 — Meaningful cost reduction for large Anthropic batches (90% savings on ~375 system-prompt tokens per file), but system prompts represent only ~10–15% of total input tokens (images dominate), so real-world batch savings are approximately 8–13% of Anthropic input costs — measurable and useful but not transformative.

## Relevant existing code
- `src/utils/modelProviders/anthropicProvider.js`: `messages.create()` at line ~98 passes `system: systemPrompt` as a plain string; changing this to `system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]` activates caching.
- `src/utils/modelProviders/openaiProvider.js`: reads `apiResult.usage?.prompt_tokens` at line ~142; `apiResult.usage?.prompt_tokens_details?.cached_tokens` is available but not currently read for cost differentiation.
- `src/utils/processingHelpers.js`: `calculateCost()` at line ~112 multiplies `input_tokens × inputPerMToken` uniformly; Anthropic caching splits input into three token types (regular, cache write, cache read) each with a different effective rate.
- `config.json` `costs` section: per-provider pricing entries for `inputPerMToken`; would need companion `cacheReadPerMToken` and `cacheWritePerMToken` fields (or derive at 10% and 100% of `inputPerMToken`) to produce accurate cost estimates.
- `src/utils/llmAuditLog.js`: `logEntry()` stores `input_tokens` and `output_tokens`; does not currently record `cache_creation_input_tokens` or `cache_read_input_tokens` — the audit log will under-report effective input tokens when caching is active unless extended.

## Implementation sketch
- **Modified `src/utils/modelProviders/anthropicProvider.js`**: change `system: systemPrompt` (line ~102) to `system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }]`; update usage extraction (line ~133-136) to also read `apiResult.usage?.cache_creation_input_tokens ?? 0` and `apiResult.usage?.cache_read_input_tokens ?? 0`; pass all three to `calculateCost()` via an extended usage object.
- **Modified `src/utils/processingHelpers.js`**: update `calculateCost(usage, costConfig)` to handle optional `cache_creation_input_tokens` (charged at full `inputPerMToken`) and `cache_read_input_tokens` (charged at `cacheReadPerMToken`, default 10% of input rate); derive cache rate from config if present, otherwise fall back to 10% of `inputPerMToken`.
- **Modified `config.json`**: add `"cacheReadPerMToken"` entries under `costs.anthropic` for each model (e.g. `0.50` for `claude-opus-4-6`; 10% of $5.00 input rate); no schema changes needed.
- **Optional: modified `src/utils/modelProviders/openaiProvider.js`**: read `apiResult.usage?.prompt_tokens_details?.cached_tokens ?? 0` and adjust cost calculation to apply 50% discount on that portion, improving accuracy of the `estimated_cost_usd` column for OpenAI records.
- **Optional: modified `src/utils/llmAuditLog.js`**: add `cache_creation_tokens INTEGER DEFAULT 0` and `cache_read_tokens INTEGER DEFAULT 0` columns to `llm_audit_log` via migration, and populate from the extended usage object, to enable per-session cache efficiency analysis.
- **Tests**: update `__tests__/utils/anthropicProvider.test.js` to include `cache_creation_input_tokens` and `cache_read_input_tokens` in mock usage responses; add 2–3 `calculateCost()` tests covering cache-aware cost calculation; existing tests should pass unchanged since the new fields default to 0.

## Risks and gotchas
- **Anthropic cache TTL boundary**: the ephemeral cache has a 5-minute TTL (extended with activity); files processed more than 5 minutes after the first call in a session will incur a fresh cache write — low-volume processing or long gaps between files reduce the effective cache hit rate.
- **System prompt variability breaks caching**: the validation-retry preamble in `processWithValidationRetry()` is prepended to the *user* prompt, not the system prompt, so retries do not break caching; however, if the system prompt is ever dynamically modified (e.g. custom schema injected), the cache key changes and cache hits will drop to zero for that file.
- **OpenAI 1024-token floor**: the current MemorialOCRPrompt system prompt (~375 tokens) and BurialRegisterPrompt system prompt (~600 tokens) are both below OpenAI's 1024-token automatic-caching minimum; cost savings from OpenAI caching will not materialise without either expanding the prompts or appending the user prompt text to the system prompt prefix.
- **Audit log token counts become misleading without migration**: `input_tokens` stored in `llm_audit_log` and in the record tables will reflect only non-cached tokens when caching is active, causing `estimated_cost_usd` to appear lower than it should (the cache write tokens on the first call are not currently captured) — deploy the optional audit log column migration to keep cost data accurate.

## Recommended next step
Implement as described — the Anthropic change is low-risk and targeted, with immediate measurable cost impact on any batch larger than one file; implement the optional OpenAI cached-token tracking and audit log extension in the same PR to keep cost accounting accurate.
---

### [#206] Schema-constrained generation across all providers
**Status**: ✅ Implemented — PR #229, merged 2026-04-08
**Branch**: `fix/issue-206-schema-constraints`

## Technique
Pass a provider-native JSON Schema object to each API call so the model's decoder is grammatically constrained to emit only valid, schema-matching JSON — eliminating parse errors at source rather than repairing them after the fact.

## Research basis
arXiv:2510.08623 (PARSE framework) reports a 92% reduction in first-retry parse errors when schema-constrained generation is enabled, and notes that deliberate field ordering in the schema recovers the reasoning quality penalty introduced by strict output modes.

## Viability assessment
The technique is architecturally feasible with no external infrastructure: OpenAI supports `response_format: { type: 'json_schema', json_schema: { strict: true, schema: {...} } }` natively in GPT-4o+ (and GPT-5.x), Gemini supports `responseSchema` in `generationConfig`, and Anthropic supports schema-constrained output via tool-use (`tools` + `tool_choice: { type: 'tool' }`). The custom-schema path (`SchemaManager`, `dynamicProcessing.js`) already stores JSON Schema objects and uses `ajv` (already a dependency) for validation, so the schema representation exists for that path. The primary complication is the per-field confidence envelope (`{ "value": ..., "confidence": ... }`) used across all built-in prompts, which requires a nested JSON Schema representation and is not trivially expressible in Anthropic tool-use `input_schema`.

## Ratings
- **Effort**: 3/5 — Requires a `getJsonSchema()` method on each built-in prompt template, modifications to all three provider implementations to accept and pass the schema object, schema threading through `providerOptions`, and separate test updates per provider; Anthropic requires a more significant structural change from plain `messages.create` to tool-use.
- **Impact**: 4/5 — A 92% parse-error reduction would effectively eliminate the validation retry path for schema errors, reducing per-file latency and cost, and is particularly high-value for Anthropic which currently applies the most complex JSON repair logic.

## Relevant existing code
- `src/utils/modelProviders/openaiProvider.js:99`: Uses `response_format: { type: 'json_object' }` — the direct upgrade target is `{ type: 'json_schema', json_schema: { strict: true, schema: {...} } }`.
- `src/utils/modelProviders/geminiProvider.js:84-92`: `generationConfig` already has `responseMimeType: 'application/json'`; adding `responseSchema` is a single property addition.
- `src/utils/modelProviders/anthropicProvider.js:98-119`: Plain `messages.create` with no tool use — switching to tool-use for schema enforcement is the most invasive change.
- `src/utils/dynamicProcessing.js:129`: Already compiles `schema.json_schema` with `ajv` — the JSON Schema representation exists for the custom-schema path and could be reused directly.
- `src/utils/prompts/BasePrompt.js`: Field definitions exist but not in JSON Schema format; needs a `getJsonSchema()` method that emits a JSON Schema draft-7 object.
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` / `VALIDATION_RETRY_PREAMBLE` — with schema-constrained generation, this path should fire far less often for parse errors, but remains necessary for semantic validation failures.

## Implementation sketch
- **Modified** each built-in prompt template (`MemorialOCRPrompt.js`, `BurialRegisterPrompt.js`, `GraveCardPrompt.js`, `MonumentPhotoOCRPrompt.js`): add a `getJsonSchema()` method that returns a JSON Schema draft-7 object describing the expected output; the confidence envelope means each field property is `{ type: 'object', properties: { value: {...}, confidence: { type: 'number' } }, required: ['value', 'confidence'] }`.
- **Modified** `openaiProvider.js`: when `options.jsonSchema` is provided, replace `response_format: { type: 'json_object' }` with `response_format: { type: 'json_schema', json_schema: { name: 'extraction', strict: true, schema: options.jsonSchema } }`; note that GPT-5.x `reasoning_effort` and strict JSON schema are compatible.
- **Modified** `geminiProvider.js`: when `options.jsonSchema` is provided, add `responseSchema: options.jsonSchema` to `generationConfig` alongside the existing `responseMimeType`.
- **Modified** `anthropicProvider.js`: when `options.jsonSchema` is provided, restructure the API call to pass `tools: [{ name: 'extract', input_schema: options.jsonSchema }]` and `tool_choice: { type: 'tool', name: 'extract' }`; extract the result from `content[0].input` instead of `content[0].text`.
- **Modified** `src/utils/fileProcessing.js` and `processingHelpers.js`: pass `jsonSchema: promptTemplate.getJsonSchema()` in `providerOptions` for each of the three processing branches; the custom-schema path in `dynamicProcessing.js` can pass `schema.json_schema` directly.
- **New tests**: provider tests for each of the three providers verifying the schema parameter is included in the API call payload; prompt template tests for `getJsonSchema()` output structure (~10–15 new tests total).

## Risks and gotchas
- **Confidence envelope complexity**: the `{ value, confidence }` wrapper per field produces a deeply nested JSON Schema; OpenAI strict mode requires `additionalProperties: false` at every level, which means the schema must be exhaustively specified — any undeclared field returned by the model (e.g. `_validation_warnings` transients) will cause a hard rejection.
- **Anthropic tool-use restructure**: switching from `messages.create` to tool-use changes the response shape (`content[0].input` vs `content[0].text`), affects the audit log `raw_response` capture, and requires updating `isInvalidResponse()` and the `ResponseLengthValidator` path.
- **Field ordering sensitivity**: the PARSE paper notes that field ordering in the schema affects reasoning quality — the current prompt templates specify fields in a particular order that should be replicated in the schema's `properties` object (JSON object key order is not guaranteed in all environments; use an explicit `required` array to encode ordering intent).
- **Custom schema path divergence**: custom schemas (`SchemaManager`) don't use confidence envelopes, so they can pass `schema.json_schema` directly with no modification; but built-in prompt schemas with confidence envelopes need a different shape, and the two paths must not be conflated in the provider layer.

## Recommended next step
Implement as described — start with OpenAI (smallest change: swap `json_object` for `json_schema`) behind a `config.schemaConstrained.enabled` feature flag, measure parse-error rate reduction on a held-out batch, then extend to Gemini before tackling the more invasive Anthropic tool-use change.
---

### [#219] Active learning loop with Langfuse trace logging
**Status**: Investigated

## Technique
Prioritise human annotation effort by computing a per-record disagreement score (derived from low confidence scores and validation warnings), then optionally stream trace data to Langfuse for an observability dashboard, dataset management, and annotation workflow that feeds the evaluation harness.

## Research basis
Siddhant & Lipton, "Deep Bayesian Active Learning for Natural Language Processing" (arXiv:1802.10038) showed that uncertainty-based sample selection achieves <1% error rate with roughly 1,000 labelled examples, versus ~5,000 needed by random selection — directly relevant to building a gold-standard corpus efficiently.

## Viability assessment
Active learning is feasible within the existing stack: the confidence scoring system (`BasePrompt._extractValueAndConfidence`), `needs_review` flag, and inline edit UI (issues #166/#183) already form a functional annotation loop — records surface via `needs_review`, humans correct them via the edit form, and `scripts/eval.js` can consume the result. Langfuse (npm `langfuse`, v3.38.20) adds an observability dashboard, dataset versioning, and score/feedback APIs on top of what `llmAuditLog.js` already stores locally; it can self-host via Docker or use the Langfuse cloud, but either route introduces an external service dependency that the existing stack deliberately avoids.

## Ratings
- **Effort**: 3/5 — Integrating the Langfuse SDK into all three providers, wiring the existing `processing_id` as a trace ID, adding a dataset-export path from corrected records to `eval/gold-standard/`, and updating `config.json` touches at least six files across providers, fileProcessing, and the eval pipeline.
- **Impact**: 3/5 — Reduces annotation cost significantly once the community dataset arrives (fewer records need labelling for the same accuracy gain), but the core extraction accuracy ceiling is set by the LLM; impact grows over time rather than being immediately measurable.

## Relevant existing code
- `src/utils/llmAuditLog.js`: already stores full prompt/response/token/timing per `processing_id` — covers what Langfuse trace logging would capture, making Langfuse's raw trace value partially redundant locally.
- `src/utils/fileProcessing.js`: generates `processing_id` via `crypto.randomUUID()` and threads it through all three processing branches — the natural Langfuse trace root.
- `src/prompts/BasePrompt.js`: `_extractValueAndConfidence()` and `result._confidence_scores` produce per-field confidence — the raw material for a disagreement score.
- `public/js/modules/results/inlineEdit.js` + PATCH API endpoints: existing human correction workflow; corrected fields logged in `edited_fields` column — the annotation capture point.
- `scripts/eval.js`: gold-standard evaluation harness; active learning feeds labelled records into `eval/gold-standard/memorials.json` that this script consumes.
- `config.json` `"confidence": { "reviewThreshold": 0.70 }`: threshold that already gates `needs_review`; disagreement score thresholding would live alongside this.

## Implementation sketch
- **New utility** `src/utils/disagreementScore.js`: exports `computeDisagreementScore(confidenceScores, validationWarnings)` — returns a 0–1 score based on minimum per-field confidence and warning count; score stored in a new `disagreement_score REAL DEFAULT NULL` column via `runColumnMigration` in `database.js`, `burialRegisterStorage.js`, and `graveCardStorage.js`.
- **Annotation export CLI command**: `node src/cli/index.js eval export-annotations` — queries records where `edited_at IS NOT NULL`, formats them into gold-standard JSON shape, and appends/merges to `eval/gold-standard/memorials.json`; closes the active learning loop into `scripts/eval.js`.
- **Optional Langfuse integration** behind `config.activelearning.langfuseEnabled`: add `langfuse` npm package; create `src/utils/langfuseClient.js` wrapping `Langfuse.trace()` with the existing `processing_id` as trace ID; call in each provider after the API response, matching the existing `llmAuditLog.logEntry()` fire-and-forget pattern.
- **Langfuse score flush** in the PATCH correction handler (`src/controllers/resultsController.js`): when `edited_fields` is non-empty, call `langfuseClient.score(processingId, fieldName, correctedValue)` to register human feedback against the original trace.
- **Frontend annotation queue view**: add a `/annotation-queue` page or filter mode in the existing results list, sorted by `disagreement_score DESC`, to surface highest-value records without the Langfuse UI.
- **Config section** in `config.json`: `"activeLearning": { "enabled": true, "disagreeThreshold": 0.5, "langfuseEnabled": false, "langfuseHost": "https://cloud.langfuse.com" }`.

## Risks and gotchas
- **Duplicate trace storage**: `llmAuditLog.js` already stores everything Langfuse traces would capture; running both doubles storage and write overhead — evaluate whether the Langfuse dashboard adds enough value over a custom query on `llm_audit_log` to justify the extra dependency.
- **External service requirement**: Langfuse self-hosting requires Docker Compose (Postgres + ClickHouse + web service) — non-trivial on Fly.io where the app currently uses SQLite; the cloud option sends full prompts including document image data to a third-party server, raising privacy concerns for genealogical records.
- **Active learning assumes model retraining**: the arXiv:1802.10038 results apply to fine-tunable models; for TextHarvester's API-only LLMs (GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro), "active learning" only improves annotation efficiency into the eval dataset — it does not directly update the models, so accuracy gains require manually updated gold standard + eval feedback loop rather than automatic weight updates.
- **Cold-start dependency on #121**: the technique's value compounds with dataset size; until the community group delivers the ≥20 hand-labelled records (blocking #121), there is no ground truth to measure the annotation quality improvement against, making early implementation hard to validate.

## Recommended next step
Implement as described — build `disagreementScore.js` and the annotation export CLI command first (no external dependency), defer Langfuse integration until the community dataset from #121 arrives and justifies the observability overhead.

---

#### Prototype & Evaluate — detail entries

---

### [#205] Self-consistency sampling with majority voting
**Status**: Investigated

## Technique
Generate N independent responses to the same prompt+image, then either field-level majority-vote across the N outputs (classic self-consistency) or pass all N raw outputs to a text-only adjudication LLM call that selects the most consistent answer (Universal Self-Consistency — USC).

## Research basis
Self-consistency (Wang et al., 2023) is consistently reported as the highest-accuracy single prompting technique for structured extraction; the USC variant (Chen et al., 2023) reduces the aggregation step to one additional API call regardless of N, avoiding brittle field-by-field comparison logic.

## Viability assessment
The technique is architecturally feasible within the existing Node.js/API-based stack: all three providers (OpenAI, Anthropic, Gemini) support a `temperature` parameter that enables stochastic sampling, and N calls to `processImage()` can be orchestrated in a new wrapper in `processingHelpers.js` without touching the database or frontend. The USC adjudication call takes only text (no image), so its token cost is minimal. The primary constraint is cost: N=3 samples triples per-file API spend, which interacts directly with the `$5.00` session cap and the existing `CostEstimator` utility which currently assumes one call per file.

## Ratings
- **Effort**: 3/5 — Requires a new `selfConsistency.js` module, temperature option threading through all three provider implementations, a cost-aggregation change in `injectCostData`, a USC adjudication prompt, and updated tests; no schema or frontend changes needed.
- **Impact**: 4/5 — Empirically the highest-accuracy single-pass technique and directly addresses the primary failure mode (inconsistent OCR on ambiguous inscriptions); USC limits extra cost to N+1 calls where the +1 adjudication call is image-free.

## Relevant existing code
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` is the natural site for a `processWithSelfConsistency()` sibling or wrapper; `VALIDATION_RETRY_PREAMBLE` shows the existing pattern for prompt manipulation.
- `src/utils/modelProviders/openaiProvider.js`, `anthropicProvider.js`, `geminiProvider.js`: Each calls its respective SDK without exposing `temperature`; all three SDKs accept it natively and it must be threaded through from `providerOptions`.
- `src/utils/processingHelpers.js` `injectCostData()`: Sums usage for a single call; USC needs usage summed across N+1 calls before storing one record.
- `src/utils/llmAuditLog.js`: Logs one entry per `processing_id`; N samples + 1 adjudication will generate N+1 entries per file, inflating audit log at scale.
- `config.json`: `retry` section provides the pattern for a new `"selfConsistency": { "enabled": false, "n": 3, "temperature": 0.7 }` feature flag block.

## Implementation sketch
- **New module** `src/utils/selfConsistency.js`: exports `runSelfConsistency(provider, base64Image, userPrompt, providerOptions, n, temperature)` that calls `provider.processImage()` N times in parallel (`Promise.all`) with `temperature` injected into `providerOptions`, returning an array of `{ content, usage }` results; also exports `buildUscAdjudicationPrompt(rawResponses)` that formats all N raw responses into a single text prompt for the adjudication call.
- **Modified** `src/utils/processingHelpers.js`: add `processWithSelfConsistencyRetry()` that, when `config.selfConsistency.enabled`, calls `runSelfConsistency()` to collect N outputs, then makes one text-only adjudication call to the same provider (`processImage` with a null/placeholder image and the USC prompt), validates the adjudicated output, and aggregates total token usage; falls back to existing `processWithValidationRetry()` if disabled.
- **Modified** provider implementations (`openaiProvider.js`, `anthropicProvider.js`, `geminiProvider.js`): accept `options.temperature` and pass it to the SDK call; default to existing behaviour (temperature omitted) when not present.
- **Modified** `src/utils/processingHelpers.js` `injectCostData()`: accept an optional `usageArray` (array of usage objects) and sum token counts before computing cost, to correctly attribute N+1 call costs to one stored record.
- **Modified** `config.json`: add `"selfConsistency": { "enabled": false, "n": 3, "temperature": 0.7, "adjudicationProvider": null }` (null = same provider as extraction).
- **New tests** `__tests__/utils/selfConsistency.test.js`: parallel call orchestration, USC prompt construction, usage aggregation, and the fallback-disabled path (6–10 tests).

## Risks and gotchas
- **Cost multiplication**: N=3 triples per-file spend; combined with `maxProviderRetries: 3` and `validationRetries: 1`, worst-case per-file calls become `(3 samples × 8 provider attempts) + 1 adjudication = 25 calls`; the session cap of $5 will fire mid-batch on any large upload and `CostEstimator` will undercount by 3–4×.
- **Temperature support inconsistency**: Gemini's `GenerationConfig` uses `temperature` while Anthropic uses it in the top-level API call body and OpenAI in the `ChatCompletion` options — the threading is straightforward but requires testing each provider separately; setting temperature=0.7 is a reasonable default but may need tuning per provider.
- **USC adjudication prompt portability**: The adjudication prompt must be schema-agnostic or schema-aware; for dynamic custom schemas (issue #168) there is no fixed schema to embed, so the adjudicator must infer the target structure from the N sample responses alone, which may reduce reliability on unusual field sets.
- **Audit log inflation**: A 200-file batch at N=3 generates 800 audit log entries instead of 200; for large-volume deployments this could exhaust SQLite page cache and slow queries on `llm_audit_log`; consider a `selfConsistency` flag in the audit entry to allow filtering or separate aggregation.

## Recommended next step
Prototype and evaluate on test corpus first — implement USC with N=3 behind a `config.selfConsistency.enabled` flag, measure actual field agreement rate on a sample of ambiguous inscription images, and compare `needs_review` flag rates before and after enabling it to quantify accuracy improvement before committing to the full cost model rework.
---

### [#207] Field-level multi-model ensemble voting (RAGsemble / Guardian Pipeline)
**Status**: Investigated

## Technique
Send each document image to all three configured providers (OpenAI, Anthropic, Gemini) in parallel, then compare extracted field values field-by-field and select the majority-vote winner for each field, flagging fields where all models disagree as low-confidence and needs_review.

## Research basis
arXiv:2601.05266 (RAGsemble) and arXiv:2603.08954 (Guardian Pipeline) both report that ensemble approaches outperform every single-model baseline on document extraction tasks, with field-level voting substantially more powerful than document-level voting because individual fields have independent error patterns across models.

## Viability assessment
The technique is architecturally well-suited to TextHarvester: all three providers already implement the same `processImage()` interface via `BaseVisionProvider`, and `createProvider()` accepts an `AI_PROVIDER` override so all three can be instantiated and called in parallel with `Promise.all` without any SDK additions. The existing `applyConfidenceMetadata()`, `needs_review` flag, and confidence panel in the frontend are natural consumers of ensemble disagreement as a confidence signal — no schema or frontend changes are required. The primary constraint is a tripling of per-file API cost, which interacts directly with the $5.00 session cap and causes `CostEstimator` to undercount actual spend by approximately 3×.

## Ratings
- **Effort**: 3/5 — Requires a new `ensembleVoting.js` module, a `processWithEnsemble()` sibling in `processingHelpers.js`, usage aggregation across three providers, and integration into each processor; all three providers already have compatible interfaces, so no provider-layer changes are needed.
- **Impact**: 4/5 — Ensemble voting consistently outperforms every single-model baseline in the literature and directly addresses the primary failure mode of uncertain OCR by converting model disagreement into an actionable confidence signal that flows through the existing `needs_review` pipeline.

## Relevant existing code
- `src/utils/modelProviders/index.js`: `createProvider()` accepts `{ AI_PROVIDER: 'openai' | 'anthropic' | 'gemini' }` — all three providers can be instantiated without any new factory code.
- `src/utils/modelProviders/baseProvider.js`: Common `processImage()` interface means all three providers can be called identically; `Promise.all` across three instances requires no per-provider special-casing.
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` is the direct predecessor; `processWithEnsemble()` would be a sibling following the same `{ validationResult, usage }` return contract.
- `src/utils/processingHelpers.js` `injectCostData()`: Handles a single `usage` object; ensemble mode requires summing `input_tokens` and `output_tokens` across all three provider responses before cost calculation.
- `src/utils/processingHelpers.js` `applyConfidenceMetadata()`: Accepts `confidenceScores` keyed by field name — ensemble disagreement (0 or 1 models agreeing on a value) maps directly to low confidence scores for flagged fields.
- `src/utils/processors/memorialProcessor.js`, `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`: Each calls `processWithValidationRetry()` once; the ensemble wrapper replaces this call when the feature flag is enabled.

## Implementation sketch
- **New module** `src/utils/ensembleVoting.js`: exports `runEnsemble(providers, base64Image, userPrompt, providerOptions, validateFn)` that calls each provider via `processWithValidationRetry()` in parallel (`Promise.all`), returning an array of `{ validationResult, usage }` outcomes; and `voteOnFields(results)` that iterates all field keys, picks the value with the most votes (≥2 of 3), assigns a `confidence` of `1.0` for unanimous, `0.65` for majority, and `0.3` for all-disagree (below `reviewThreshold`), returning a merged `validationResult` and `needs_review` flag.
- **Modified** `src/utils/processingHelpers.js`: add `processWithEnsemble(providers, base64Image, userPrompt, providerOptions, validateFn)` that delegates to `runEnsemble()`, sums `usage` across all provider calls, and returns `{ validationResult, usage }` in the same shape as `processWithValidationRetry()` so processors require minimal changes.
- **Modified** `src/utils/processors/memorialProcessor.js`, `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`: when `config.ensemble.enabled`, instantiate all three providers (or only the configured subset), call `processWithEnsemble()` instead of `processWithValidationRetry()`, and store the provider names as a comma-separated list in `ai_provider` (e.g. `"openai,anthropic,gemini"`).
- **Modified** `src/utils/processingHelpers.js` `injectCostData()`: accept an optional `usageArray` parameter; when present, sum all `input_tokens` and `output_tokens` before computing estimated cost, attributing the full ensemble cost to the single stored record.
- **Modified** `config.json`: add `"ensemble": { "enabled": false, "providers": ["openai", "anthropic", "gemini"], "minVotesForConsensus": 2 }` following the existing feature-flag pattern.
- **New tests** `__tests__/utils/ensembleVoting.test.js`: parallel orchestration, unanimous vote, majority vote, all-disagree vote, usage summation, and provider partial-failure fallback (8–12 tests).

## Risks and gotchas
- **3× cost per file**: with `maxProviderRetries: 3` and `validationRetries: 1`, worst-case per-file provider calls become 24 (3 providers × 8 attempts each); the session cap of $5.00 will trigger approximately 3× sooner than `CostEstimator` predicts, and `CostEstimator` needs a separate update to multiply its per-file estimate by the number of ensemble providers.
- **Field-value normalisation**: providers may return semantically identical values in different formats (e.g. "1st January 1901" vs "01-01-1901" vs "1901-01-01") — the voting logic must normalise string values before comparison or treat trivially different strings as disagreements, which could artificially inflate the `needs_review` rate.
- **Provider partial failure**: if one provider returns an API error (rate limit, timeout) mid-ensemble, the remaining two may still form a majority — the module must handle `Promise.allSettled` semantics and log a warning rather than failing the whole file; but a silent 2-of-2 "majority" is indistinguishable from a 2-of-3 majority in stored records.
- **Custom schema path excluded**: `DynamicProcessor` in `dynamicProcessing.js` uses a separate code path that does not go through `processWithValidationRetry()` — ensemble voting would need a separate integration there, or ensemble mode must be documented as unsupported for custom-schema files.

## Recommended next step
Prototype and evaluate on sample data first — implement for the memorial branch only behind `config.ensemble.enabled`, run on a held-out set of graveyard photos with known ground truth, and measure whether the `needs_review` rate for genuinely ambiguous records improves before committing to the 3× cost increase across all record types.
---

### [#212] Multimodal correction pass (image + OCR → second VLM)
**Status**: Investigated

## Technique
After a standard first-pass extraction, feed both the original image and the first-pass extracted text back to a second VLM call that reviews and corrects any OCR errors by comparing the text against the image.

## Research basis
arXiv:2504.00414 and arXiv:2408.17428 report <1% CER on printed historical documents and >60% CER reduction when a second VLM pass incorporates socio-cultural grounding context alongside the original image and first-pass transcript.

## Viability assessment
The technique is fully viable within the existing Node.js/API architecture — it requires no local GPU or new SDK, and the `processImage()` interface on all three providers already accepts arbitrary prompt text that can embed first-pass JSON. The main integration point is `processWithValidationRetry()` in `processingHelpers.js`, which would be extended with an optional post-validation correction call. The critical practical concern is cost: every enabled document doubles the API call count, halving the effective session budget under the existing $5 cap.

## Ratings
- **Effort**: 3/5 — Requires a new `performCorrectionPass()` helper, `getCorrectionPrompt()` methods on all three prompt templates, integration into all three processor files, audit log handling for a second pass, and a config flag; cross-cutting but not architecturally disruptive.
- **Impact**: 4/5 — A >60% CER reduction would meaningfully improve accuracy across all document types, though the papers measure on their own corpora and actual improvement on handwritten Irish heritage inscriptions must be validated empirically.

## Relevant existing code
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` — the correction pass would run after this function returns successfully; `injectCostData()` accumulates tokens naturally if called for both passes.
- `src/utils/processors/memorialProcessor.js`, `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`: each calls `processWithValidationRetry` and would invoke the correction pass afterward when `config.correctionPass.enabled` is true.
- `src/utils/modelProviders/baseProvider.js`: `processImage(base64Image, prompt, options)` interface requires no changes; the correction prompt simply passes first-pass text as part of the user prompt string.
- `src/utils/llmAuditLog.js`: logs each API call by `processing_id`; a second call per file naturally produces a second audit row with no schema change required.
- `src/utils/prompts/BasePrompt.js`: the prompt class hierarchy is the natural home for a `getCorrectionPrompt(firstPassText)` method.

## Implementation sketch
- **New helper** `performCorrectionPass(provider, base64Image, firstPassText, providerOptions, validateFn, log)` in `processingHelpers.js`: sends image + first-pass plain-text transcript to the provider with a correction-focused prompt; calls `validateFn` on the result; returns `{ validationResult, usage }`.
- **New method** `getCorrectionPrompt(firstPassText)` on `BasePrompt` (and overrides in `MemorialOCRPrompt`, `BurialRegisterPrompt`, `GraveCardPrompt`): constructs a prompt that presents the image again alongside the first-pass text and asks the model to identify and fix transcription errors, keeping the same JSON schema.
- **Modified processors** (`memorialProcessor.js`, `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`): after `processWithValidationRetry` succeeds, if `config.correctionPass?.enabled`, call `performCorrectionPass` and use its result; accumulate tokens from both passes before calling `injectCostData`.
- **Modified `config.json`**: add `"correctionPass": { "enabled": false, "provider": null }` — `provider: null` means same provider as first pass; a string value (e.g. `"openai"`) allows routing to a different/cheaper model for the second call.
- **Optional**: add `pass_number INTEGER DEFAULT 1` column to `llm_audit_log` (migration) so first vs. second pass entries are distinguishable in the audit trail.

## Risks and gotchas
- **Cost doubling**: enabling correction pass halves the number of files processable within the $5 session cap; `costs.maxCostPerSession` check in `IngestService.js` will trigger at half the current volume, which could surprise users mid-batch.
- **Correction hallucination**: on ambiguous or partially illegible inscriptions the second VLM may "correct" already-correct extractions or introduce new errors — empirical A/B measurement against a gold-standard set is essential before enabling by default.
- **First-pass text format**: passing structured JSON (rather than rendered plain text) as the correction input may cause the model to re-parse rather than visually cross-check; the correction prompt must explicitly instruct the model to compare text against the image, not just reformat the JSON.
- **Audit log volume**: if enabled, every processed file generates two `llm_audit_log` rows; on a 200-image batch this doubles audit storage and may require the optional `pass_number` column to avoid ambiguous queries.

## Recommended next step
Prototype and evaluate on sample data first — implement the correction pass as a standalone script against 20–30 memorial images with known ground truth and measure net CER change before integrating into the main pipeline.
---

### [#223] Cascading model strategy (cheap first-pass → confident escalation)
**Status**: Investigated

## Technique
Run each document through a cheap model first (e.g., Gemini Flash or Claude Haiku), accept the result if per-field confidence scores are uniformly high, and escalate to the expensive model only when confidence falls below a configurable threshold.

## Research basis
C3PO framework (arXiv:2511.07396) demonstrates that cascading LLM calls achieves <20% of full-ensemble cost with ≤2–10% accuracy gap on structured extraction tasks by routing only the hard cases to the capable model.

## Viability assessment
The existing confidence scoring pipeline (`_confidence_scores` attached by every `validateAndConvert()` call) already provides the per-field signal needed to gate escalation — no additional model introspection is required. All three cheap models (Gemini Flash at $0.075/$0.30, Claude Haiku at $1.00/$5.00) are already listed in `config.json` and their SDKs are installed, so no new packages or infrastructure are needed. The main complexity is that escalation doubles the API calls (and thus cost) for the hard fraction, and the session cost cap in `IngestService.js` must account for two possible charges per file.

## Ratings
- **Effort**: 3/5 — Requires a new `cascadeProcessor.js` orchestrator, config additions, integration into `processFile()`, and updates to cost tracking to sum tokens from both calls when escalation occurs.
- **Impact**: 4/5 — If 70–80% of well-scanned heritage documents achieve high confidence on the cheap model (plausible for clean typed burial registers), the technique could cut per-file API cost by 60–75%, directly extending the `maxCostPerSession` budget.

## Relevant existing code
- `src/utils/fileProcessing.js`: `processFile()` is the single entry point; provider selection happens at line 20 and the provider instance is created at line 91 — a cascade wrapper can call this function twice with different provider configs.
- `src/utils/modelProviders/index.js`: `createProvider()` factory already accepts `AI_PROVIDER` and per-provider model config via `customConfig`; a cheap-model provider instance is straightforward to construct.
- `src/utils/processingHelpers.js`: `applyConfidenceMetadata()` computes `needs_review` from per-field scores; the same scores are available to gate cascade escalation — `data.confidence_scores` is the direct signal.
- `config.json` `costs` section: `gemini-2.5-flash` ($0.075/$0.30) and `claude-haiku-4-5` ($1.00/$5.00) are already priced, confirming cheap-model support is already wired.
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` wraps provider calls with validation retry; a cascade processor would call this independently for the cheap and expensive providers, reusing all retry and audit infrastructure.
- `src/utils/llmAuditLog.js`: `logEntry()` is keyed on `processing_id`; when escalation occurs, two audit entries with the same `processing_id` are written — the table supports this since there is no unique constraint on `processing_id`.

## Implementation sketch
- **New `config.json` section**: add `"cascade": { "enabled": false, "cheapProvider": "gemini", "cheapModel": "gemini-2.5-flash", "escalationThreshold": 0.90, "expensiveProvider": "openai", "expensiveModel": "gpt-5.4" }` — `escalationThreshold` set to `autoAcceptThreshold` (0.90) so escalation only triggers when any field falls below the auto-accept confidence level.
- **New module `src/utils/cascadeProcessor.js`**: exports `processFileCascade(filePath, options)` — calls `processFile()` with cheap provider config, reads `result.confidence_scores`, computes the minimum per-field score, returns result if `minScore >= config.cascade.escalationThreshold`, otherwise calls `processFile()` again with the expensive provider config and returns that result; logs the escalation decision via `logger.info`.
- **Modified `src/utils/fileProcessing.js`**: at the top of `processFile()`, check `config.cascade?.enabled` and, if set, delegate to `cascadeProcessor.processFileCascade()` passing through all options — this keeps the cascade entirely transparent to the caller.
- **Cost tracking**: when escalation occurs, both calls' `input_tokens`, `output_tokens`, and `estimated_cost_usd` must be summed before storage; `cascadeProcessor` accumulates a `cumulativeUsage` object and the final stored record reflects total spend across both calls; add `cascade_escalated INTEGER DEFAULT 0` to all three record tables so cost dashboards and analytics can separate cheap-only vs. escalated records.
- **Session cost guard**: `IngestService.js` accumulates `sessionCostUsd` from the stored result's `estimated_cost_usd` — since `cascadeProcessor` sums both calls into that field, the existing guard fires correctly without changes.
- **Tests**: unit-test `cascadeProcessor` with mocked `processFile` calls — cover: (1) cheap model high-confidence → no escalation, (2) cheap model low-confidence → escalation + summed cost, (3) cheap model validation failure → escalation, (4) cascade disabled → direct passthrough.

## Risks and gotchas
- **Contradictory transcriptions**: if the cheap model returns plausible but incorrect data with artificially high confidence, the cascade will accept it without checking the expensive model — per-field confidence scores self-reported by the cheap model are not independently verified; this risk is mitigated by setting `escalationThreshold` high (0.90) but not eliminated.
- **Doubled latency on hard cases**: documents that do escalate incur two sequential API calls, increasing processing time for the most difficult records; this may frustrate users expecting uniform throughput.
- **Cheap model validation failure path**: if the cheap model's response fails `validateAndConvert()` entirely (not just low confidence), `processWithValidationRetry()` will throw after exhausting retries; `cascadeProcessor` must catch this and escalate to the expensive model rather than surfacing a fatal error.
- **Audit log interpretation**: two `llm_audit_log` entries for the same `processing_id` are structurally valid but may confuse queries that assume one entry per file; document the cascade pattern in a comment on `llm_audit_log`'s schema and ensure any evaluation tooling groups by `processing_id` rather than counting rows.

## Recommended next step
Prototype and evaluate on sample data first — the cost savings are compelling, but the quality of cheap-model self-reported confidence on heritage documents (faded ink, handwriting, archaic script) is unknown and must be measured before relying on it as an escalation gate.

---
---

### [#203] Row-level image slicing with two-shot prompting
**Status**: Investigated

## Technique
Physically crop each row of a tabular document (e.g. burial register page) into a separate image before sending to the VLM, and include two labeled example row images + expected JSON in the prompt to anchor the model's output format.

## Research basis
arXiv:2510.23066 and arXiv:2501.11623 report 8.8× improvement in field-level accuracy on heritage tabular records; two examples found to be the optimal few-shot count for this document type.

## Viability assessment
The technique is architecturally feasible within the existing Node.js/API stack: `sharp` is already a production dependency and can slice rows via its `extract()` API, no GPU or external service is required. However, it fundamentally restructures the burial register pipeline from one API call per page to N calls per row (typically 20–40 rows per page), multiplying API cost and audit log volume by the same factor. Automatic row boundary detection without a layout-detection ML model is fragile for faded or irregular registers, making the slicing step the highest-risk component.

## Ratings
- **Effort**: 4/5 — Requires a new row-detection module (non-trivial with pure Sharp pixel projection), a breaking change to `burialRegisterProcessor.js`, a curated two-shot example fixture set, and updated cost-tracking logic to aggregate per-row token usage back to the page record.
- **Impact**: 4/5 — An 8.8× field-level accuracy improvement on burial registers would be transformative for that document type, but the technique only applies to tabular records and adds substantial per-page API cost.

## Relevant existing code
- `src/utils/imageProcessor.js`: Sharp already imported and used for image optimisation; `sharp(input).extract()` is the natural slicing primitive.
- `src/utils/processors/burialRegisterProcessor.js`: Current pipeline sends a full page image in one call; this is the file that would be restructured.
- `src/utils/prompts/templates/BurialRegisterPrompt.js`: Prompt text would need a `getTwoShotPrompt(exampleRows)` variant that embeds base64 example images + expected JSON before the main extraction request.
- `src/utils/processingHelpers.js`: `processWithValidationRetry` wraps each provider call; would need to be invoked N times per page with per-row images.
- `config.json`: Provides the pattern for adding a new feature flag section (e.g. `"rowSlicing": { "enabled": false }`).

## Implementation sketch
- **New module** `src/utils/imageProcessing/rowSlicer.js`: use `sharp(path).raw()` to produce a grayscale pixel buffer, compute horizontal intensity projections to locate whitespace gaps between rows, return an array of `{top, height}` crop coordinates; fall back to uniform division by `row_count` if gap detection yields implausible results.
- **New fixtures dir** `eval/row-examples/`: 2–3 manually selected row images (`.jpg`) with paired ground-truth JSON files; loaded at startup or lazily by `BurialRegisterPrompt`.
- **Modified** `BurialRegisterPrompt.js`: add `getTwoShotUserPrompt(exampleImageBase64s)` that prepends two `[Image: <base64>] → <expected JSON>\n\n` blocks before the main prompt.
- **Modified** `burialRegisterProcessor.js`: when `config.rowSlicing.enabled`, call `rowSlicer.detectRows(filePath)`, loop over row crops, call `processWithValidationRetry` per row with the two-shot prompt, then reassemble the results into the existing `entries` array structure.
- **Modified** `config.json`: add `"rowSlicing": { "enabled": false, "examplesPath": "eval/row-examples/", "maxRowsPerPage": 50 }`.
- **Modified** `__tests__/utils/imageProcessing/rowSlicer.test.js`: unit tests for projection-based row detection with synthetic images (5–8 tests).

## Risks and gotchas
- **Cost explosion**: a 30-row page with `maxProviderRetries: 3` and `validationRetries: 1` generates up to 240 provider calls versus the current 8 — session cost cap of $5 will trigger mid-batch on any large upload.
- **Row detection reliability**: historical registers with merged cells, handwritten headers spanning two rows, or faded ruling lines will produce mis-aligned crops; a fallback to uniform slicing reduces but does not eliminate this.
- **Two-shot example portability**: example rows must visually match the register being processed; a single fixture set trained on one register format may degrade accuracy on a different format, requiring per-volume example management.
- **Audit log volume**: each row generates its own `llm_audit_log` entry; a 200-page volume processed in row-slicing mode could produce 6,000+ audit rows, inflating the database significantly.

## Recommended next step
Prototype and evaluate on test corpus first — specifically, measure actual field-level accuracy improvement against a gold-standard burial register page with known ground truth before committing to the pipeline restructure.
---

### [#221] Batch API usage (OpenAI + Anthropic, 50% flat discount)
**Status**: Investigated

## Technique
Submit API requests as JSONL batch files to OpenAI's Batch API or Anthropic's Message Batches API to receive a flat 50% cost discount in exchange for accepting asynchronous (up to 24-hour) completion rather than synchronous per-request responses.

## Research basis
No specific paper; both provider APIs are production-ready and documented: OpenAI Batch API (launched May 2024, up to 50,000 requests/batch) and Anthropic Message Batches API (launched September 2024, up to 10,000 requests/batch); both offer a consistent 50% discount on all token charges for batched requests.

## Viability assessment
Both provider SDKs already installed (`openai ^4.24.0`, `@anthropic-ai/sdk ^0.39.0`) expose batch APIs (`client.batches` and `client.beta.messages.batches` respectively) without additional packages or infrastructure. The fundamental challenge is that the current pipeline is entirely synchronous — `processFile()` calls `provider.processImage()` and immediately stores the result — while batch APIs are asynchronous with completion times of minutes to hours; adopting batch mode therefore requires a new submission-and-poll architecture that decouples upload from result availability and alters the frontend's real-time progress model. A practical hybrid approach — using synchronous calls for interactive uploads and batch-only for bulk re-processing jobs — would limit the impact on user experience while still capturing the discount.

## Ratings
- **Effort**: 4/5 — Requires a new batch submission module, a persistent `batch_jobs` DB table to track job ID → file mapping, a polling/webhook mechanism to retrieve results and feed them into the existing storage pipeline, config additions, and frontend changes to expose a non-real-time "batch mode" option.
- **Impact**: 4/5 — A guaranteed 50% reduction in API cost for the two most expensive providers (OpenAI GPT-5.4 at $2.50/$20 per MTok and Claude Opus 4.6 at $5/$25 per MTok) is significant for any user processing large volumes, directly halving the `maxCostPerSession` burn rate.

## Relevant existing code
- `src/utils/modelProviders/openaiProvider.js`: `processImage()` calls `client.chat.completions.create()` synchronously (line ~125); the analogous batch call is `client.batches.create()` with a JSONL file upload.
- `src/utils/modelProviders/anthropicProvider.js`: `processImage()` calls `client.messages.create()` synchronously (line ~98); the analogous batch call is `client.beta.messages.batches.create()`.
- `src/utils/fileQueue.js`: in-memory FIFO with worker pool (`maxConcurrent=3`); processes files fire-and-forget; batch mode would need a separate submission path that bypasses this queue.
- `src/utils/fileProcessing.js`: `processFile()` is the synchronous pipeline entry point; batch mode replaces the provider call with a deferred job submission.
- `src/utils/database.js`, `burialRegisterStorage.js`, `graveCardStorage.js`: result storage layer; batch completion polling must funnel results through these same modules.
- `config.json` `costs` section: contains per-provider pricing; batch pricing would need parallel `batch_*` entries at 50% of current rates to preserve accurate cost tracking via `calculateCost()`.
- `src/utils/llmAuditLog.js`: `logEntry()` is fire-and-forget; batch completions would call this with a `response_time_ms` spanning the full poll interval — likely misleading without a note in the entry.

## Implementation sketch
- **New module `src/utils/batchSubmitter.js`**: collects pending files into a JSONL payload, uploads to OpenAI Files API or passes inline to Anthropic batches, stores returned `batch_id` with per-request `custom_id → processing_id` mapping in a new `batch_jobs` SQLite table (`batch_id TEXT, provider TEXT, custom_id TEXT, processing_id TEXT, status TEXT, submitted_at DATETIME, completed_at DATETIME`).
- **New module `src/utils/batchPoller.js`**: a setInterval-based (or cron) polling loop that checks incomplete batch IDs via `client.batches.retrieve(batchId)` / `client.beta.messages.batches.retrieve(batchId)`; on completion, downloads the result file, maps `custom_id` back to `processing_id`, and routes each result through the existing `validateAndConvert` → storage pipeline.
- **DB migration in `database.js`**: add `batch_jobs` table; add `batch_mode BOOLEAN DEFAULT 0` column to all three record tables so the cost dashboard can distinguish batch vs. real-time costs.
- **Config additions in `config.json`**: add `"batch": { "enabled": false, "providers": ["openai", "anthropic"], "pollIntervalMs": 60000 }` and shadow cost entries `costs.openai.batch["gpt-5.4"]` at 50% of standard rates.
- **Provider adapters**: add `submitBatch(requests[])` method to `openaiProvider.js` and `anthropicProvider.js` that wraps the respective SDK batch creation calls; `batchSubmitter.js` calls these rather than `processImage()`.
- **Frontend**: add a "Batch mode (50% cost, up to 24h)" toggle to the upload form; results page should show a "Pending batch results" section that polls `/api/batch/status` and renders newly completed records as they arrive.

## Risks and gotchas
- **User-experience regression**: batch results take minutes to hours; users who expect the current sub-minute turnaround will need clear in-product communication that batch mode is not real-time, and accidental batch submissions cannot be cancelled once processing starts on the provider side.
- **Failure handling complexity**: batch APIs return partial success — some requests in a batch may fail while others succeed; the polling and result-ingestion code must handle mixed-status batches, log failures to `llmAuditLog`, and either requeue failed items via the standard synchronous pipeline or surface them as errors without silently dropping records.
- **Cost tracking and session cap**: the `sessionCostUsd` cap in `IngestService.js` operates synchronously during upload; batch submissions bypass this cap because costs are only realised on completion hours later, potentially allowing cost overruns that the current guard was designed to prevent.
- **SDK version compatibility**: Anthropic Message Batches API is under `client.beta.messages.batches` in `@anthropic-ai/sdk ^0.39.0` — a major SDK version bump could move or rename this namespace; pin the SDK version and add an integration test that exercises the batch endpoint.

## Recommended next step
Prototype and evaluate on sample data first — implement the OpenAI batch path only as a standalone script, run it against a sample of 50 documents, verify cost tracking and result quality, then decide whether to integrate the full dual-provider batch pipeline.
---

### [#225] Community-driven transcription correction (FamilySearch model)
**Status**: Investigated

## Technique
Surface `needs_review`-flagged records to genealogist volunteers who can view the original image and correct AI extraction errors, with corrections written back to the database — mirroring the FamilySearch human-in-the-loop indexing model.

## Research basis
FamilySearch's volunteer indexing programme has produced over 2 billion verified transcriptions; their model pairs AI pre-extraction with human correction for uncertain records, with multiple-reviewer agreement for high-stakes fields.

## Viability assessment
TextHarvester already has ~80% of the required infrastructure: a `needs_review` flag on all three record tables, `reviewed_at` and `edited_at`/`edited_fields` columns, PATCH edit endpoints (`resultEditRoutes.js`), a `markReviewedHandler`, and a working inline-edit frontend module (`inlineEdit.js`). The missing piece is a dedicated reviewer-queue page that surfaces flagged records with their original source image, which is straightforward to build on top of the existing results UI. No GPU, external service, or new npm package is required; the only meaningful gap is optionally tracking reviewer identity, which would need a lightweight session mechanism given that the app currently has no authentication.

## Ratings
- **Effort**: 2/5 — The data model and edit/review API already exist; the work is primarily a new frontend page (review queue), an optional `reviewer_id` column, and wiring the source image into the review view.
- **Impact**: 3/5 — Human correction catches errors that AI confidence scoring cannot (unusual names, faded ink, regional spelling variants) and builds a verified ground-truth corpus useful for future model evaluation, but the benefit scales with reviewer engagement and is less immediately transformative for single-user deployments.

## Relevant existing code
- `src/routes/resultEditRoutes.js`: PATCH `/api/results/:type/:id` and POST `/:id/review` endpoints already handle field updates and `reviewed_at` stamping.
- `src/controllers/resultEditController.js`: `updateMemorialHandler`, `updateBurialEntryHandler`, `updateGraveCardHandler`, `markReviewedHandler` — all reusable without modification.
- `public/js/modules/results/inlineEdit.js`: `buildEditFormHTML`, `submitEdit`, `handleSave` — full inline-edit pipeline ready to embed in a review queue page.
- `src/utils/database.js` / `burialRegisterStorage.js` / `graveCardStorage.js`: `needs_review INTEGER DEFAULT 0`, `reviewed_at DATETIME`, `edited_at`, `edited_fields TEXT`, `confidence_scores TEXT` — review-workflow columns present on all tables.
- `src/services/QueryService.js`: `--needs-review` filter already implemented; `GET /api/results?needs_review=1` can back the queue page with zero backend changes.

## Implementation sketch
- **New page `public/review.html` + `public/js/modules/review/main.js`**: a dedicated reviewer queue that loads `needs_review=1` records via the existing query API, displays each record alongside its source image (served from `uploads/` or a signed URL), and embeds the `inlineEdit` module for corrections.
- **Image display**: expose a `GET /api/uploads/:filename` route (or reuse an existing static-file route) so the review page can render the original scan next to the extracted fields for visual comparison.
- **Optional reviewer identity**: add `reviewer_id TEXT` column to all three tables via the existing `runColumnMigration()` pattern; collect a reviewer name/initials from a simple browser-side prompt on first visit (no full auth system required for a trusted-volunteer context).
- **Optional multi-reviewer agreement**: add a `review_count INTEGER DEFAULT 0` column and a lightweight `review_log` table (`record_type, record_id, reviewer_id, corrected_fields TEXT, reviewed_at DATETIME`); only clear `needs_review` when `review_count >= config.review.requiredAgreements` (default 1, upgradeable to 2–3 for genealogy-grade accuracy).
- **Config addition**: `"review": { "requiredAgreements": 1, "showSourceImage": true }` in `config.json` to make the agreement threshold and image display tunable without code changes.
- **CLI extension**: add `query review-queue [--limit N]` sub-command to `src/cli/commands/query.js` so power users can export pending records for offline batch review.

## Risks and gotchas
- **No authentication**: TextHarvester currently has no user accounts; a public review queue could allow accidental or malicious edits — mitigate by either restricting the review page to localhost/LAN or adding a simple shared-secret token check before deploying to Fly.io.
- **Source image availability**: the review UI needs access to the original upload file; images may have been deleted after processing or stored under a non-deterministic temp path — the `file_name` column records the original name but not the storage path, so image serving may silently 404 for older records.
- **Reviewer fatigue and queue management**: if `needs_review` flags are generated liberally (low `reviewThreshold`), the queue can grow faster than volunteers clear it; without a "claimed by reviewer X" lock, two reviewers can clobber each other's in-flight edits via concurrent PATCH requests.
- **Ground-truth corpus value**: corrections are stored in the main record tables via `edited_fields TEXT`, not in a separate audit table, so building a reusable eval dataset from volunteer corrections requires a post-processing query rather than a clean export path.

## Recommended next step
Prototype and evaluate on sample data first — build the review queue page against a staging dataset with 20–30 `needs_review` records, confirm that the source image display and inline-edit round-trip work end-to-end, then assess volunteer engagement before investing in multi-reviewer agreement logic.
---

### [#209] Minimal pre-processing pipeline with CLAHE via Sharp.js
**Status**: Investigated

## Technique
Apply Contrast Limited Adaptive Histogram Equalisation (CLAHE) to uploaded images before base64-encoding them for the VLM, boosting local contrast in faded or low-light areas without over-amplifying noise, while deliberately avoiding binarisation which degrades VLM accuracy.

## Research basis
Research on VLM-based heritage OCR finds that global binarisation hurts model accuracy because VLMs benefit from greyscale gradient information; CLAHE is consistently identified as the single most impactful pre-processing step for recovering faded ink in historical documents (Dasanaike 2026; see also existing internal `docs/` notes referencing arXiv:2504.00414).

## Viability assessment
The technique is fully feasible in the existing API-only Node.js stack: Sharp (already a production dependency at ^0.32.6) can extract raw pixel buffers for a pure-JS CLAHE implementation with no GPU or native OpenCV required, and the insertion point in `optimizeImageForProvider()` is already clearly defined. Sharp's public API in 0.32.x does not expose a native `clahe()` method, so the implementation would either require a pure-JS tile-based CLAHE algorithm operating on Sharp's raw buffers, or a dependency on `@techstark/opencv-js` (WebAssembly OpenCV, no native compilation needed). The burial register branch bypasses `optimizeImageForProvider()` entirely and reads images directly to base64, so it would need a separate pre-processing hook to benefit from CLAHE.

## Ratings
- **Effort**: 2/5 — New `claheProcessor.js` module plus a single optional call inserted into the existing Sharp pipeline; config flag follows the established pattern; burial register path needs a second integration point.
- **Impact**: 3/5 — Meaningful for monument photographs with faded inscriptions (the most common failure mode in the corpus), but VLMs already apply internal contrast normalisation, so the net gain in well-exposed images will be modest; benefit is highest on the minority of genuinely degraded inputs.

## Relevant existing code
- `src/utils/imageProcessor.js`: `optimizeImageForProvider()` is the existing Sharp pipeline (EXIF rotate → resize → JPEG); CLAHE would insert after `.rotate()` at line 212 before `.resize()` at line 223.
- `src/utils/imageProcessor.js`: `saveDebugImage()` and `DEBUG_CONFIG` provide an existing debug-image infrastructure that could capture pre/post CLAHE output automatically.
- `src/utils/fileProcessing.js` lines 70–81: The burial register branch reads directly to base64 (bypassing `optimizeImageForProvider()`); this is the second integration point.
- `config.json`: Existing `monumentCropping` block shows the established pattern for a feature-flag object with `enabled: false` default.

## Implementation sketch
- **New module** `src/utils/imageProcessing/claheProcessor.js`: exports `applyClahe(inputBuffer, options)` — uses `sharp(inputBuffer).raw().toBuffer({ resolveWithObject: true })` to extract a raw pixel plane, applies a tile-based CLAHE algorithm (pure JS: divide into `tileSize × tileSize` tiles, compute clipped histograms, bilinear interpolate across tile boundaries), returns a processed `Buffer`; tile size and clip limit configurable via `options`.
- **Modified** `src/utils/imageProcessor.js` `optimizeImageForProvider()`: when `config.preProcessing.claheEnabled`, materialise the buffer after `.rotate()`, pass through `applyClahe()`, then re-initialise the Sharp pipeline from the result before the `.resize()` step; log the CLAHE step and save a debug image at stage `00b_clahe`.
- **Modified** `src/utils/fileProcessing.js` burial register branch (line 70): when `config.preProcessing.claheEnabled`, read the file into a Buffer, pass through `applyClahe()`, then base64-encode the returned Buffer rather than reading the file directly.
- **Modified** `config.json`: add `"preProcessing": { "claheEnabled": false, "claheTileSize": 64, "claheClipLimit": 3.0 }` — disabled by default to preserve existing behaviour.
- **New tests** `__tests__/utils/imageProcessing/claheProcessor.test.js`: unit tests for `applyClahe()` — verify output buffer dimensions match input, verify contrast is non-decreasing on a synthetically low-contrast grayscale image, verify clip limit truncates extreme histogram bins; 5–7 tests.
- **Alternative dependency**: if pure-JS performance is insufficient for large images, `@techstark/opencv-js` provides `cv.createCLAHE()` via WebAssembly and requires no native compilation; the `claheProcessor.js` module could wrap it with the same external interface.

## Risks and gotchas
- **Sharp raw-buffer complexity**: EXIF rotation applies before the raw extraction, but re-initialising Sharp from a raw buffer requires correct `{ raw: { width, height, channels } }` metadata threading — a mismatch silently produces a corrupt image with no error.
- **Performance on large images**: a pure-JS CLAHE on a 4096×4096 image (16M pixels) will be noticeably slower than Sharp's native C++ pipeline; tile size must be tuned to balance quality and latency, or the `@techstark/opencv-js` path taken.
- **Colour images**: CLAHE should be applied only to the luminance channel (e.g. L in Lab or Y in YCbCr) to avoid colour distortion; applying it naively to all RGB channels shifts colour balance, which may confuse VLMs interpreting ink colour as a document-type signal.
- **Burial register bypass**: the burial register path reads files directly without any Sharp pipeline; adding CLAHE there is straightforward but is a second integration point that must be maintained in sync with the main path.

## Recommended next step
Prototype and evaluate on sample data first — implement `claheProcessor.js` with the pure-JS algorithm as an opt-in flag (`preProcessing.claheEnabled: false`) and measure CER or field accuracy against a small set of known-difficult faded-inscription images before enabling by default.
---

### [#204] OCR-Agent reflection mechanisms (capability + memory reflection)
**Status**: Investigated

## Technique
Before and during extraction, the model performs two reflection passes: a capability reflection (assessing whether it can actually read the image) and a memory reflection (reasoning over why a previous attempt failed before retrying), preventing confident hallucinations on illegible images and breaking correction loops.

## Research basis
arXiv:2602.21053 reports +2.0 on OCRBench v2 by adding capability and memory reflection stages to an OCR agent, preventing the two most common failure modes: capability hallucination (confidently extracting from unreadable images) and oscillating correction loops.

## Viability assessment
Both reflection types are pure-prompt techniques requiring no local GPU or new SDK; every provider already supports multi-turn or system-prefixed reasoning. Capability reflection fits naturally as a lightweight pre-flight API call before the main extraction call, and memory reflection replaces the existing `VALIDATION_RETRY_PREAMBLE` in `processWithValidationRetry()` with a richer structured reasoning step. The main cost is that capability reflection doubles the number of API calls for every file, and the OCRBench +2.0 is measured on a general benchmark that may not transfer directly to handwritten heritage documents.

## Ratings
- **Effort**: 3/5 — Requires a new `reflectionHelper.js` module, modifications to `processWithValidationRetry()` in `processingHelpers.js`, a new config flag, and updated tests; no schema, frontend, or provider-layer changes are needed.
- **Impact**: 3/5 — Capability reflection directly targets the hardest failure mode in heritage OCR (confidently wrong extractions from faded inscriptions), but doubles input API cost per file; benchmark gains on OCRBench v2 may not fully translate to handwritten parish record accuracy.

## Relevant existing code
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` contains the current retry preamble — memory reflection replaces this with a structured reasoning turn.
- `src/utils/processingHelpers.js`: `VALIDATION_RETRY_PREAMBLE` constant is the direct predecessor to memory reflection text.
- `src/utils/retryHelper.js`: `withRetry()` / `classifyError()` — provider-level retry wrapper; reflection operates at the layer above this (validation retry), not inside it.
- `src/utils/llmAuditLog.js`: Stores raw responses per `processing_id` — the exact data a memory reflection prompt would summarise from.
- `src/utils/prompts/templates/MemorialOCRPrompt.js`: Prompt structure shows capability check questions (legibility, document type) could be extracted into a separate pre-flight prompt.

## Implementation sketch
- **New module** `src/utils/reflectionHelper.js`: exports `runCapabilityReflection(provider, base64Image, options)` — sends a minimal system+user prompt ("Is this image legible? What document type is it? Rate readability 0–1.") and returns `{ readable: boolean, readabilityScore: number, documentType: string }`; and `buildMemoryReflectionPreamble(previousError, rawResponse)` — returns a structured reasoning paragraph summarising the prior failure to prepend on retry.
- **Modified** `src/utils/processingHelpers.js`: when `config.reflection.enabled`, call `runCapabilityReflection()` before `processWithValidationRetry()`; if `readabilityScore < config.reflection.readabilityThreshold` (suggested 0.4), mark result as `needs_review = 1` and short-circuit without a main extraction call; replace `VALIDATION_RETRY_PREAMBLE` with output of `buildMemoryReflectionPreamble()` on validation retries.
- **Modified** `config.json`: add `"reflection": { "enabled": false, "readabilityThreshold": 0.4 }` feature flag section.
- **New tests** `__tests__/utils/reflectionHelper.test.js`: unit tests for `runCapabilityReflection()` (mock provider returns legible/illegible responses), `buildMemoryReflectionPreamble()` (output structure), and the short-circuit path in `processWithValidationRetry()` (6–8 tests).

## Risks and gotchas
- **Cost doubling**: Capability reflection adds one provider API call per file; at scale (200-file batch), this doubles API spend before a single record is extracted — the session cost cap of $5 will trigger earlier and the `CostEstimator` utility will undercount actual cost.
- **Benchmark transfer gap**: OCRBench v2 is a printed-text benchmark; heritage documents (faded inscriptions, 19th-century handwriting, paper foxing) are significantly harder and the +2.0 improvement may not hold or may be larger in different directions.
- **Capability reflection reliability**: The model's self-assessment of its own readability is itself subject to hallucination — a model that confidently over-reads faded text may also confidently rate that text as highly readable, defeating the purpose.
- **Interaction with existing retry logic**: Memory reflection replaces the simple `VALIDATION_RETRY_PREAMBLE` string; both mechanisms must not be concatenated or the retry prompt will grow very long, requiring careful branching in `processWithValidationRetry()`.

## Recommended next step
Prototype and evaluate on test corpus first — implement capability reflection only (not memory reflection) as an opt-in flag and measure false-positive rate (readable images incorrectly flagged as illegible) against a sample of known-good graveyard photos before enabling the memory reflection path.
---

### [#210] Region/row cropping before VLM inference
**Status**: Investigated

## Technique
Send a lightweight first VLM call to detect bounding boxes of text regions or table rows in the full image, crop to those regions with `sharp.extract()`, then send only the cropped sub-images for the main extraction pass, cutting the pixel area (and thus image token cost) by 5–10×.

## Research basis
Survey of VLM document processing literature (2024–2026) reports 5–10× token cost reduction from region-level cropping; the "two-pass layout detection" variant specifically uses the VLM itself for layout localisation, eliminating any local ML model dependency.

## Viability assessment
The architecture is fully API-only and compatible with the existing stack: `sharp` (already a production dependency at v0.32.6) provides the `extract()` primitive, and the first-pass layout call uses the same provider SDKs already wired into the codebase. The processor registry pattern (`src/utils/processors/index.js`) makes it straightforward to add an opt-in cropping stage before the existing extraction calls. The main risk is that the layout detection call costs tokens itself, so the net saving depends on the crop reducing the extraction call's image size by more than the layout call adds — this ratio needs empirical validation on real TextHarvester document types.

## Ratings
- **Effort**: 3/5 — Requires a new layout-detection helper, integration into at least two existing processors (`burialRegisterProcessor.js` and `memorialProcessor.js`), a new config section with feature flag, and updated cost tracking to account for the extra layout API call per file.
- **Impact**: 3/5 — A 5–10× reduction in image tokens is meaningful cost engineering for large batches, but the net saving depends on actual document geometry (crop ratio) and whether the layout pass can use a cheaper/smaller model than the extraction pass.

## Relevant existing code
- `src/utils/imageProcessing/monumentCropper.js`: Already uses `sharp(imagePath).greyscale().raw()` pixel-level analysis to compute bounding boxes — the exact Sharp API pattern needed for programmatic region extraction.
- `src/utils/imageProcessor.js`: Imports and orchestrates Sharp throughout; `sharp(input).extract({ left, top, width, height })` is the crop primitive already demonstrated in `monumentCropper.js`.
- `src/utils/processors/burialRegisterProcessor.js`: Sends a full-page base64 image in a single call — prime candidate for a pre-crop step that isolates the tabular data area.
- `src/utils/processors/memorialProcessor.js`: Sends full monument photos — inscription area is often a small fraction of the image.
- `src/utils/processingHelpers.js` `processWithValidationRetry()`: The existing retry wrapper would be reused for both the layout pass and the extraction pass.
- `config.json` `monumentCropping` block: Establishes the established pattern for an opt-in feature flag object with typed parameters.

## Implementation sketch
- **New module** `src/utils/imageProcessing/layoutDetector.js`: exports `detectRegions(base64Image, provider, options)` — sends a short system prompt ("Return JSON array of bounding boxes `[{left,top,width,height}]` for each distinct text region") with the full image to the provider; parses and validates the returned JSON; falls back to `[{ left:0, top:0, width: imgWidth, height: imgHeight }]` (full image) if the call fails or returns implausible boxes.
- **Modified** `src/utils/processors/burialRegisterProcessor.js`: when `config.regionCropping.enabled`, call `layoutDetector.detectRegions()` on the base64 image before the main extraction loop; crop each detected region via `sharp(buffer).extract(box).toBuffer()` and encode each crop as base64; dispatch `processWithValidationRetry` on the largest/table region rather than the full page.
- **Modified** `src/utils/processors/memorialProcessor.js`: same opt-in path — detect the inscription bounding box, crop, send the crop to extraction; preserves existing full-image path when flag is off.
- **Modified** `src/utils/processingHelpers.js`: extend `injectCostData()` or add `injectLayoutCostData()` so the token cost of the layout detection call is added to the record's `input_tokens` / `estimated_cost_usd` rather than silently discarded.
- **Modified** `config.json`: add `"regionCropping": { "enabled": false, "layoutModel": null, "minCropAreaFraction": 0.1, "maxRegions": 4 }` — `layoutModel: null` means use the same provider model as extraction; a cheaper model name (e.g. `"gemini-2.5-flash"`) can be substituted for savings.
- **New tests** `__tests__/utils/imageProcessing/layoutDetector.test.js`: mock provider responses for valid bounding-box JSON, malformed JSON (fallback to full image), out-of-bounds coordinates (clamped), and empty-array response (fallback); 6–8 tests.

## Risks and gotchas
- **Net cost may be negative**: if the layout detection call uses the same full-resolution image and a premium model, it can consume more tokens than the crop saves — especially for documents where the content already fills most of the image (e.g. dense burial register pages with narrow margins).
- **Layout call reliability**: VLMs do not reliably return pixel-accurate bounding boxes from a single short prompt; bounding boxes that clip text will degrade extraction accuracy in ways that are hard to detect without a ground-truth evaluation set.
- **Two-call audit trail**: each file now generates two `llm_audit_log` entries (layout + extraction); the `processing_id` ties them together, but `getEntriesByProcessingId()` callers and any future evaluation tooling must handle the multi-entry case.
- **Burial register multi-row interaction**: issue #203 (row-level slicing) and this issue both target the burial register pipeline; implementing both simultaneously would create competing cropping stages that need careful ordering and config flag coordination.

## Recommended next step
Prototype and evaluate on sample data first — build `layoutDetector.js` as an opt-in module behind `regionCropping.enabled: false`, measure actual crop ratios and net token delta on 10–20 representative images before enabling, to verify the cost saving is real rather than assumed.
---

### [#214] Retrieval-augmented grounding for place/person names
**Status**: Investigated

## Technique
After VLM extraction, fuzzy-match extracted place names (parish, county, abode) and person surnames against static historical gazetteer datasets to detect OCR errors that produce plausible-but-wrong toponyms or surnames, flagging mismatches for review.

## Research basis
World Historical Gazetteer, Vision of Britain, and the Irish Townlands dataset (IreAtlas) provide controlled vocabularies for historical place names; Rose's Act (1813) standardised Anglican burial register columns (name, abode, burial date, age), providing a structural constraint that limits the valid space of `abode_raw` values to known settlement names.

## Viability assessment
The technique is fully API-only and requires no GPU — fuzzy matching against pre-bundled static JSON datasets can be performed in Node.js using `fuse.js` or edit-distance functions. The existing `applyValidationWarnings()` pattern in `processingHelpers.js` and `validation_warnings` columns on all three tables provide a ready-made integration path. The principal challenge is data sourcing: World Historical Gazetteer has a public API but is not optimised for offline bundle use; the IreAtlas townlands dataset is available as a CSV download (~50 MB) and is the most directly useful for Irish records; FreeBMD does not offer a public name-lookup API and cannot be used without scraping.

## Ratings
- **Effort**: 3/5 — Requires sourcing and bundling at least one gazetteer dataset, a new `gazetterLookup.js` module with fuzzy matching, integration into the post-processing step of all three processing branches, and careful threshold calibration; no schema or API surface changes needed.
- **Impact**: 3/5 — Most valuable for burial registers where `parish_header_raw`, `county_header_raw`, and `abode_raw` are explicit structured fields; less applicable to memorial inscriptions where location data rarely appears; Irish townland names are particularly prone to OCR errors due to their unusual phonetic patterns.

## Relevant existing code
- `src/utils/prompts/templates/BurialRegisterPrompt.js`: extracts `parish_header_raw`, `county_header_raw`, and `abode_raw` — the three fields that map most directly to gazetteer lookups.
- `src/utils/nameProcessing.js`: existing prefix/suffix/normalisation pipeline for person names; a gazetteer name-lookup module could follow the same pattern.
- `src/utils/processingHelpers.js`: `applyValidationWarnings(data, warnings)` — the natural integration point; already sets `data.needs_review = 1` and stores warnings in the `validation_warnings` column on all three tables.
- `src/utils/prompts/templates/MemorialOCRPrompt.js` and `BurialRegisterPrompt.js`: cross-field validation (IDENTICAL_NAMES, IMPLAUSIBLE_AGE) establishes the pattern for post-extraction rule checks that feed `_validation_warnings`.
- `config.json` `confidence` and `retry` sections: precedent for feature-flagged threshold configuration.

## Implementation sketch
- **Source and bundle gazetteer data**: Download the IreAtlas townlands CSV (~50 MB, ~61,000 Irish townlands with parish and county mappings) and the Vision of Britain historic settlement index; convert to a compact JSON lookup keyed by normalised name. Store in `data/gazetteers/` (excluded from git via `.gitignore`; ship as a build asset or lazy-download on first run).
- **New module `src/utils/gazetterLookup.js`**: load bundled datasets on module init; export `lookupPlace(name, options)` (returns `{ matched, canonical, score, dataset }`) and `lookupSurname(name)` (checks against a common Irish/UK surname frequency list); use `fuse.js` (npm, no GPU, ~25 kB) for fuzzy matching with a configurable score threshold.
- **New `config.json` section** `"gazetterGrounding": { "enabled": true, "placeScoreThreshold": 0.75, "surnameScoreThreshold": 0.80 }` — thresholds tunable without code changes; `enabled: false` for a metric-only initial deployment.
- **Modified `src/utils/processingHelpers.js`**: add `applyGazetterGrounding(data, sourceType, config)` helper that calls `gazetterLookup.lookupPlace` on `parish_header_raw`, `county_header_raw`, and `abode_raw` (burial register) or any location tokens extracted from `inscription` (memorial), and pushes `UNRECOGNISED_PLACE:<field>` warning strings into `data._validation_warnings`.
- **Integration in `src/utils/fileProcessing.js`**: call `applyGazetterGrounding` in all three processing branches after `processWithValidationRetry` returns, before `applyValidationWarnings`.
- **New test file `__tests__/utils/gazetterLookup.test.js`**: unit tests covering exact match, close fuzzy match (within threshold), no match (score below threshold), empty/null input, and disabled-feature short-circuit (8–10 tests).

## Risks and gotchas
- **FreeBMD is unavailable as a static dataset**: the site only exposes a search UI; person-name lookups against FreeBMD would require HTTP scraping (fragile, likely against ToS) and should be excluded from scope; the technique is most viable for place-name grounding alone.
- **Irish townland name ambiguity**: many townland names are shared across counties (e.g., "Kilmore" appears in 10+ counties); lookups must be conditioned on the extracted county header to avoid cross-county false positives.
- **False positives on non-Irish records**: the dataset is Ireland-centric; English or Welsh parish records will produce near-universal mismatches if the Irish townlands dataset is the only source; the module must degrade gracefully when no dataset covers the region.
- **Gazetteer data maintenance**: historical place names that were renamed or consolidated post-1900 may not appear in modern datasets; the IreAtlas dataset uses both Irish-language and anglicised forms and requires both to be indexed for adequate recall.

## Recommended next step
Prototype and evaluate on sample data first — bundle the IreAtlas townlands dataset, run the fuzzy-match lookup against a set of 20–30 real burial register extractions, and measure the false-positive rate before wiring the `needs_review` flag.
---

### [#218] LLM-as-judge / Panel of LLM Judges (PoLL)
**Status**: Investigated

## Technique
After OCR extraction, send the original image plus the extracted JSON to one or more "judge" LLM calls that independently verify whether the transcription faithfully represents the source document; the PoLL variant aggregates verdicts from multiple models to reduce single-model evaluation bias.

## Research basis
Verga et al., "Replacing Judges with Juries: Evaluating LLM Generations with a Panel of Diverse Models" (arXiv:2404.18796, 2024) found that a PoLL of diverse smaller models correlated more strongly with human judgments and exhibited less positional and verbosity bias than a single GPT-4 judge.

## Viability assessment
The technique is fully compatible with the existing API-only Node.js stack: all three providers (OpenAI GPT-5.4, Anthropic Claude Opus 4.6, Gemini 3.1 Pro) are already integrated via `createProvider()` and their SDKs are installed, so judge calls require no new dependencies. The `llmAuditLog` already supports multiple entries per `processing_id`, so judge calls log naturally alongside extraction calls. The main constraint is cost and latency: each judge call adds roughly one extra provider round-trip per document, and a PoLL panel of three judges triples that overhead — a significant concern given the existing `$5` session cap.

## Ratings
- **Effort**: 3/5 — Requires a new `judgeProcessor.js` module, DB column additions to all three tables via the established migration pattern, integration into the three processor files, a new `applyJudgeVerdict()` helper in `processingHelpers.js`, a `config.judge` section, and a small frontend badge in the detail view.
- **Impact**: 3/5 — Catches "fluent but wrong" hallucinations that pass structural validation and still receive high per-field confidence scores (the hardest undetected error class), but adds meaningful cost per document and cannot be calibrated without the gold-standard dataset from #121.

## Relevant existing code
- `src/utils/modelProviders/index.js`: `createProvider(config)` — instantiates any provider by name; a judge call simply uses a separate provider instance created with the judge's provider name.
- `src/utils/processingHelpers.js`: `applyConfidenceMetadata()` — the exact pattern that a new `applyJudgeVerdict()` helper would follow to set `judge_score`, `judge_verdict`, and conditionally force `needs_review = 1`.
- `src/utils/processors/memorialProcessor.js` (and `burialRegisterProcessor.js`, `graveCardRecordProcessor.js`): integration point after `processWithValidationRetry()` returns and before `storeMemorial()` / storage call.
- `src/utils/llmAuditLog.js`: fire-and-forget `logEntry()` — judge calls should be logged here under the same `processing_id`, requiring no schema change to the audit table.
- `config.json`: established pattern for feature-flag sections (e.g. `"confidence"`, `"retry"`, `"audit"`); judge config follows the same shape.

## Implementation sketch
- **New module** `src/utils/judgeProcessor.js`: exports `runJudge(base64Image, extractedData, options)` — formats a verification prompt ("Does this JSON faithfully transcribe the text visible in the image? Respond with `{score: 0.0–1.0, verdict: 'pass'|'fail'|'uncertain', reasoning: string}`"), calls `provider.processImage()`, parses response, returns verdict object; PoLL mode calls all three providers and averages scores.
- **New config section** in `config.json`: `"judge": { "enabled": false, "provider": "anthropic", "poll": false, "pollProviders": ["openai","anthropic","gemini"], "failThreshold": 0.5 }`.
- **New helper** `applyJudgeVerdict(data, verdict, config)` in `processingHelpers.js`: attaches `judge_score` and `judge_verdict` fields; sets `data.needs_review = 1` when `verdict.verdict === 'fail'` or `verdict.score < config.judge.failThreshold`.
- **DB migrations** in `database.js`, `burialRegisterStorage.js`, and `graveCardStorage.js`: add `judge_score REAL DEFAULT NULL` and `judge_verdict TEXT DEFAULT NULL` columns to `memorials`, `burial_register_entries`, and `grave_cards` tables via `runColumnMigration`.
- **Processor integration**: in each of the three processor files, call `judgeProcessor.runJudge()` after the validation step if `config.judge?.enabled`; pass result to `applyJudgeVerdict()` before the storage call.
- **Frontend**: add a "Judge" badge alongside the "Needs Review" badge in `public/js/modules/results/main.js`; show `judge_verdict` and `judge_score` in the confidence panel section of the detail view.

## Risks and gotchas
- **Cost amplification**: a PoLL panel of three judges triples the per-document API cost; on a 100-image upload with the current session cap of $5, the judge budget may be exhausted before the panel finishes, and `IngestService.js` cost-cap logic would terminate processing mid-batch.
- **False positive `needs_review` flags**: judge models can also hallucinate or apply inconsistent standards to handwritten text, flagging correct transcriptions; without the gold-standard dataset from #121 there is no way to calibrate the `failThreshold` or measure judge precision/recall on real data.
- **Latency**: a sequential judge call adds 2–5 seconds per document; for a 100-image batch this extends total processing time substantially — the judge call should be made async-concurrent with storage to minimise user-visible latency.
- **Circular evaluation bias**: using Claude Opus to judge an OpenAI extraction may introduce model-family-specific biases that the PoLL mechanism is meant to reduce but cannot fully eliminate; agreement between two models of the same family should not be weighted the same as cross-family agreement.

## Recommended next step
Prototype and evaluate on sample data first — implement as a single-model judge (not PoLL) behind a `config.judge.enabled = false` flag on a development branch, run it against the first 20 records from the community group's labelled dataset (#121), and measure precision/recall before deciding whether to enable by default or extend to PoLL.
---

### [#224] Two-step extraction (free-text → structured)
**Status**: Investigated

## Technique
First call: ask the VLM to transcribe the document image to free-form plain text with no JSON or structured-output constraint; second call: send only the transcription text to a (potentially cheaper) LLM and ask it to parse that text into the structured JSON schema — separating the visual reading task from the formatting task.

## Research basis
arXiv:2411.03340 reports CER 1.8% and WER 3.5% at approximately $0.01/page on printed historical documents using this decomposition, and attributes 10–15% of that accuracy gain to the removal of the structured-output mode penalty on the transcription step.

## Viability assessment
The technique is fully compatible with the existing Node.js/API-only architecture: all three providers (OpenAI, Anthropic, Gemini) support text-only calls natively, so step 2 requires no additional dependencies and can reuse the same provider instance with a null/empty image. The main architectural change is conditional — step 1 must not set `response_format: json_object` (OpenAI) or its equivalents in the other providers, which currently hardcode structured-output mode; and step 2 needs a text-only prompt variant on each prompt template class alongside the existing combined prompt. Token costs from both steps must be summed before storage, and audit logging will produce two entries per file instead of one.

## Ratings
- **Effort**: 3/5 — Requires new `getStep1Prompt()` / `getStep2Prompt(transcription)` methods on each of the four prompt template classes, conditional `response_format` removal in all three providers, a new `processTwoStepExtraction()` wrapper in `processingHelpers.js`, cost aggregation across two calls, and updated tests; no schema, database, or frontend changes are needed.
- **Impact**: 3/5 — Removing the structured-output reasoning penalty is a well-evidenced improvement for printed text; the benefit for handwritten 19th-century inscriptions and faded burial registers (the primary TextHarvester use cases) is unproven and would need empirical testing, but the change is reversible and gated behind a feature flag.

## Relevant existing code
- `src/utils/modelProviders/openaiProvider.js:99`: `response_format: { type: 'json_object' }` is unconditionally set — this must become conditional on the processing mode (step 1 omits it; step 2 can keep it for the JSON parsing call).
- `src/utils/modelProviders/anthropicProvider.js` / `geminiProvider.js`: Both use `extractFirstJsonObject()` from `jsonExtractor.js` to recover JSON from free-form text; step 1 would return raw text handled by the same utility on step 2.
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` is the existing single-step wrapper; `processTwoStepExtraction()` would sit alongside it as a sibling function following the same usage/error contract.
- `src/utils/prompts/templates/MemorialOCRPrompt.js` (and `BurialRegisterPrompt.js`, `GraveCardPrompt.js`): `getPromptText()` returns a combined "transcribe + format as JSON" instruction — needs a two-step split into a transcription prompt and a structuring prompt.
- `src/utils/processingHelpers.js` `injectCostData()`: Handles a single `usage` object; two-step mode requires summing `usage` from both calls before injecting into the stored record.
- `src/utils/llmAuditLog.js`: Currently logs one entry per `processing_id`; both step calls should log under the same `processing_id`, generating two audit rows per file.

## Implementation sketch
- **New prompt methods** on `MemorialOCRPrompt`, `BurialRegisterPrompt`, `GraveCardPrompt`, `GraveCardPrompt`, `MonumentPhotoOCRPrompt`: add `getStep1TranscriptionPrompt()` returning a plain-text instruction ("Transcribe exactly what you see on this document. Output plain text only, preserving line breaks with |. Do not add or infer anything.") and `getStep2StructuringPrompt(transcription)` returning the existing JSON schema instructions with the transcription embedded as input.
- **Modified** `openaiProvider.js`: when `options.twoStepMode === 'transcribe'`, omit `response_format` entirely from the request payload; when `options.twoStepMode === 'structure'`, pass `base64Image` as null and the user message as text-only (no `image_url` content block); default behaviour unchanged when option is absent.
- **Modified** `anthropicProvider.js` and `geminiProvider.js`: analogous changes — step 1 suppresses any JSON mime-type or tool-use mode; step 2 constructs a text-only message body.
- **New function** `processTwoStepExtraction()` in `src/utils/processingHelpers.js`: calls `processImage` in transcription mode, then calls `processImage` again in structuring mode with `base64Image = null`, validates the JSON output via the existing `validateFn`, aggregates `usage1 + usage2` into a single usage object, and passes it through the normal `injectCostData` / `attachCommonMetadata` / `llmAuditLog` flow.
- **Modified** `config.json`: add `"twoStepExtraction": { "enabled": false, "structuringModel": null }` where `null` means use the same model as transcription; setting to `"gpt-4o-mini"` or `"claude-haiku-4-5"` enables the cost-reduction variant.
- **Modified** `__tests__/utils/fileProcessing.test.js` and provider tests: add step-mode branching tests and verify usage aggregation (≈8–12 new tests).

## Risks and gotchas
- **Transcription error propagation**: any misread word in step 1 is locked in before step 2 runs — unlike the single-step approach where the model can cross-reference the image and the field schema simultaneously; errors compound rather than cancel.
- **Cost model invalidation**: `CostEstimator` assumes one provider call per file; two-step mode doubles image-token cost (step 1 sends the image) and adds a text-only call; the displayed estimate will undercount by roughly 2× until `CostEstimator` is updated.
- **Structured output suppression per provider**: OpenAI's `response_format` is a top-level payload field; Anthropic's equivalent is in `tool_choice`; Gemini's is in `generationConfig.responseMimeType` — all three providers need separate branching, and a missing or incorrect suppression silently degrades step 1 quality.
- **Session cap interaction**: with `validationRetries: 1`, worst case is 4 provider calls per file (2 step-1 + 2 step-2 on retry) vs the current 2; on a 100-file batch the $5 cap will trigger approximately twice as early as `CostEstimator` predicts.

## Recommended next step
Prototype and evaluate on test corpus first — implement two-step mode behind `config.twoStepExtraction.enabled` for the memorial branch only, measure CER improvement on a held-out set of graveyard photos with known ground truth, and compare `needs_review` flag rates before concluding whether the gain justifies the doubled API cost.
---

### [#208] Composite confidence scoring (cross-model + logprobs + self-consistency + doc quality)
**Status**: Investigated

## Technique
Combine four independent uncertainty signals — token-level logprobs, document image quality, cross-model field disagreement, and self-consistency sampling — into a single composite confidence score per field to improve `needs_review` precision.

## Research basis
MUSE (EMNLP 2025) and an ICLR 2026 paper on calibrated VLM uncertainty distinguish epistemic uncertainty (cross-model disagreement: the model doesn't know) from aleatoric uncertainty (self-consistency sampling: the answer is inherently ambiguous), and show that combining these signals outperforms any single signal alone.

## Viability assessment
The technique decomposes naturally into four layers of increasing dependency: document quality scoring via `sharp.stats()` is standalone and costs nothing; logprobs require only a one-field addition to the OpenAI request payload (Anthropic and Gemini do not expose logprobs); cross-model disagreement depends on multi-provider parallel execution (research issue #207's ensemble infrastructure); and self-consistency depends on multiple same-model runs (research issue #205). A partial composite using only the first two signals is feasible today without any new dependencies or architecture changes, but a true four-signal composite requires both #207 and #205 as completed prerequisites.

## Ratings
- **Effort**: 4/5 — Logprobs + document quality alone is a 2/5 self-contained addition, but a full four-signal composite requires two other research issues (#205, #207) as hard prerequisites plus a new aggregation module, schema column, and frontend display update.
- **Impact**: 3/5 — Current model-reported confidence already catches obvious low-quality fields; the standalone signals (logprobs, document quality) offer marginal improvement, while cross-model disagreement (the most powerful signal) requires a 3× cost increase, making net impact moderate without benchmarking data to justify the cost.

## Relevant existing code
- `src/utils/prompts/BasePrompt.js` `_extractValueAndConfidence()`: Extracts model-reported per-field confidence from `{value, confidence}` envelopes — the composite score would augment or replace this self-reported signal.
- `src/utils/processingHelpers.js` `applyConfidenceMetadata()`: Applies confidence scores to the data object and sets `needs_review` based on `config.confidence.reviewThreshold` — the natural integration point for composite scores.
- `src/utils/modelProviders/openaiProvider.js`: Builds the `requestPayload` dict sent to `client.chat.completions.create()` — adding `logprobs: true` here is a one-line change; response parsing requires reading `choices[0].logprobs.content[].logprob`.
- `src/utils/llmAuditLog.js`: Stores raw responses per `processing_id` — a post-hoc cross-model comparison pass could read two audit rows for the same file (if both providers were run) rather than requiring synchronous parallel execution.
- `sharp` (already installed): `sharp(path).stats()` returns per-channel mean and standard deviation, a proxy for image contrast; sharpness can be estimated from Laplacian variance on the raw pixel buffer.

## Implementation sketch
- **New module** `src/utils/confidenceSignals.js`: exports `scoreDocumentQuality(imagePath)` (calls `sharp(imagePath).stats()`, returns a 0–1 quality score based on channel entropy and std), and `extractLogprobConfidence(logprobsContent)` (averages `Math.exp(token.logprob)` over a response's content tokens to produce a 0–1 model certainty estimate); both return `null` if inputs are missing, matching the existing nullable confidence contract in `_extractValueAndConfidence`.
- **Modified** `src/utils/modelProviders/openaiProvider.js`: add `logprobs: true` to `requestPayload` when `config.confidence.logprobsEnabled` is true; extract `choices[0].logprobs` from the API response and attach it to the returned `{ content, usage, logprobs }` object.
- **Modified** `src/utils/processingHelpers.js` `processWithValidationRetry()`: accept an optional `signals` object from `provider.processImage()` return value; call `confidenceSignals.extractLogprobConfidence(signals?.logprobs)` and pass the result to `applyConfidenceMetadata()` as an additional `providerConfidence` override that replaces null model-reported scores.
- **Modified** `src/utils/processingHelpers.js` `applyConfidenceMetadata()`: accept an optional `compositeOverrides` map; when present, use the composite value instead of the raw model-reported score for `needs_review` threshold evaluation — leave the stored `confidence_scores` JSON unchanged so the field-level display in the frontend is unaffected.
- **Modified** `config.json`: add `"confidence": { ..., "logprobsEnabled": false, "documentQualityEnabled": false }` flags; both default to false so existing behaviour is unchanged until opted in.
- **New tests** `__tests__/utils/confidenceSignals.test.js`: unit tests for `scoreDocumentQuality()` (mock sharp stats, test high/low contrast paths), `extractLogprobConfidence()` (average of log probs, null handling, empty array), and `applyConfidenceMetadata()` with composite overrides (6–8 tests).

## Risks and gotchas
- **Provider asymmetry**: Logprobs are only available from OpenAI; Anthropic and Gemini records will always have `null` for the logprob signal, creating an uneven quality floor across providers unless document quality fills the gap for non-OpenAI runs.
- **Full composite requires two unbuilt prerequisites**: Cross-model disagreement requires #207 (ensemble voting), and self-consistency requires #205 (multi-sample majority voting) — committing to a "composite" that only has two of four signals risks creating a misleading confidence number that users will over-trust.
- **Logprob interpretation for JSON mode**: With `response_format: { type: 'json_object' }`, logprobs cover structural JSON tokens (braces, colons) as well as value tokens — averaging across all tokens dilutes the signal; a field-level score requires isolating only the value tokens, which requires JSON-token boundary detection.
- **Sharp quality heuristic reliability**: Low mean/std can indicate either a faded historical document (genuine low quality) or a deliberately high-contrast black-and-white photograph (high quality); the heuristic will produce false positives for well-exposed B&W graveyard shots unless calibrated against the specific document corpus.

## Recommended next step
Prototype and evaluate on sample data first — implement only the document quality and logprob signals as an opt-in flag, measure the false-positive rate for `needs_review` on known-good records, and defer cross-model and self-consistency signals until #207 and #205 are built and benchmarked.
---

### [#211] Perspective correction for monument photographs
**Status**: Investigated

## Technique
Apply a projective (homographic) warp to headstone photographs shot at an angle, straightening the inscribed face before the image is sent to the VLM, so that text distortion does not degrade OCR accuracy.

## Research basis
The technique is standard computer vision prior art (OpenCV `getPerspectiveTransform` + `warpPerspective`); the issue references no specific paper, but perspective rectification is a documented pre-processing step for document digitisation workflows targeting non-flat surfaces.

## Viability assessment
The approach is technically feasible in a Node.js stack using `@techstark/opencv-js` (a WebAssembly port requiring no native compilation or GPU), which can run on Fly.io without a custom Dockerfile. However, the critical and fragile step is _corner detection_: reliably finding the four corners of the inscribed face on weathered, dark, or complex outdoor headstone backgrounds is an unsolved problem without a purpose-trained keypoint-detection model, and na approaches (edge/contour detection) produce unstable results on real monument photos. The existing VLMs (GPT-5.4, Claude Opus 4.6, Gemini 3.1 Pro) are already robust to moderate perspective distortion, so the benefit only materialises on severely angled shots that are a small fraction of typical uploads.

## Ratings
- **Effort**: 4/5 — Requires adding a WASM dependency (`@techstark/opencv-js`, ~30 MB), building a new `perspectiveCorrector.js` pre-processing module, integrating it into `fileProcessing.js` before `optimizeImageForProvider()`, and solving the corner-detection problem which likely requires a secondary prompt to the VLM to identify the text panel bounds.
- **Impact**: 2/5 — Only applies to the `monument_photo` source type; burial registers and grave record cards (flat scans) receive no benefit, and modern VLMs handle mild perspective skew well, limiting the gain to a narrow subset of pathologically angled shots.

## Relevant existing code
- `src/utils/imageProcessor.js`: Sharp-based image optimisation pipeline; perspective correction would run as a new step before `optimizeImageForProvider()`.
- `src/utils/imageProcessing/monumentCropper.js`: Existing greyscale bounding-box cropper for monuments; shares the same pre-processing niche and would need to be ordered or merged with a perspective corrector.
- `src/utils/fileProcessing.js`: Orchestrates the full pipeline; the `monument_photo` branch at line 77–82 is the integration point.
- `config.json` `monumentCropping` block: Establishes the existing pattern for an opt-in feature flag that disables a monument-specific image processing step.

## Implementation sketch
- **New module** `src/utils/imageProcessing/perspectiveCorrector.js`: accepts a file path, calls a VLM with a short structured prompt asking for the four corner coordinates of the text panel as JSON (`{topLeft, topRight, bottomRight, bottomLeft}`), then applies `cv.getPerspectiveTransform` + `cv.warpPerspective` via `@techstark/opencv-js` to produce a rectified buffer; returns `null` if corners are implausible or the call fails (no-op fallback).
- **Modified** `src/utils/fileProcessing.js`: when `config.perspectiveCorrection.enabled` and `sourceType === 'monument_photo'`, call `perspectiveCorrector.correct(filePath)` before `analyzeImageForProvider()`; substitute the returned buffer if non-null.
- **Modified** `config.json`: add `"perspectiveCorrection": { "enabled": false, "cornerDetectionModel": null, "confidenceThreshold": 0.7 }`.
- **Modified** `src/utils/llmAuditLog.js` call sites: the corner-detection call must be logged as a separate audit entry under the same `processing_id` so its token cost is not silently lost.
- **New tests** `__tests__/utils/imageProcessing/perspectiveCorrector.test.js`: mock VLM corner response (valid), malformed JSON (null fallback), out-of-bounds coordinates (null fallback), and cv module failure (null fallback); 5–7 tests.

## Risks and gotchas
- **Corner detection unreliability**: VLMs asked for pixel coordinates of headstone corners on complex outdoor photos return inconsistent results; incorrect corners produce a warp that is worse than the original, with no automatic detection of degradation.
- **WASM overhead**: `@techstark/opencv-js` adds ~30 MB to the bundle and incurs 200–500 ms initialisation overhead per Node.js process restart, which matters on Fly.io's ephemeral compute.
- **Extra API call cost**: using a VLM to detect corners adds one provider call per image (and its associated token cost and latency) before the main extraction call; for a $0.015 average call cost this doubles per-image spend on the monument_photo path.
- **Ordering conflict with monumentCropper**: `monumentCropper.js` also crops monument images (bounding-box approach); running both in sequence requires a defined ordering and risks double-transformation artifacts if both are enabled.

## Recommended next step
Prototype and evaluate on sample data first — build corner detection as a standalone script against 20–30 real monument photographs and measure how often VLM-returned corners produce a visually correct warp before investing in full pipeline integration.

---

#### Closed — Deferred — detail entries

---

### [#217] LangGraph.js agentic pipeline
**Status**: Investigated

## Technique
LangGraph.js restructures the sequential `processFile()` pipeline into a directed state-machine graph where each processing stage (document classification, image extraction, validation, conditional correction) is an explicit node with typed state, conditional edges, and built-in checkpointing.

## Research basis
PLANET AI 2025 IDP benchmarks report 66–77% → 93–98% accuracy improvement attributed primarily to agentic pipeline architecture (multi-step reasoning, conditional routing, structured state passing between stages).

## Viability assessment
`@langchain/langgraph` is published on npm with no local GPU or external infrastructure requirement, so the technique is architecturally compatible with the existing API-only Node.js stack. However, adopting it would require wholesale restructuring of `fileProcessing.js`, `processingHelpers.js`, and all three processor files — the entire inner pipeline. The PLANET AI accuracy claim is for structured business IDP documents, not handwritten heritage records, and much of the claimed "agentic" benefit (pre-classification, validation routing, conditional retry) is already implemented in TextHarvester's two-layer retry system, confidence scoring, and cross-field validation.

## Ratings
- **Effort**: 4/5 — Restructuring `processFile()` and the three processor branches as LangGraph state machines requires replacing the current linear pipeline across 5–6 files with graph nodes, typed state schemas, and conditional edges; `processWithValidationRetry()` must be re-expressed as graph transitions, and session cost tracking and audit logging must be threaded through node state.
- **Impact**: 2/5 — The benchmark improvement cited is on structured business IDP documents; the main accuracy challenges for heritage handwritten records are model capability and image quality, not pipeline coordination, and TextHarvester already implements the key agentic patterns (validation retry, reflection, cross-field checks) via dedicated modules.

## Relevant existing code
- `src/utils/fileProcessing.js`: The linear `processFile()` function that would become the root graph definition — source-type routing, UUID generation, and branch dispatch all live here.
- `src/utils/processingHelpers.js`: `processWithValidationRetry()` — the current validation-retry orchestrator that LangGraph conditional edges would supersede.
- `src/utils/retryHelper.js`: `withRetry()` — provider-level retry that would remain intact within individual extract nodes.
- `src/utils/processors/` directory: The three processor modules (memorial, burial register, grave card) that would become named graph nodes.
- `src/services/IngestService.js`: Session cost tracking (`sessionCostUsd`) that must remain coherent across async graph node execution.

## Implementation sketch
- Install `@langchain/langgraph` and define a `DocumentProcessingState` shape carrying `filePath`, `base64Image`, `sourceType`, `attempts`, `extractedData`, `validationErrors`, `processingId`, `usage`, and `sessionCostUsd`.
- Convert each processing stage to a named node: `classifyDocument`, `loadImage`, `extractData`, `validateData`, `handleValidationFailure`, `applyMetadata`, `storeResult`; wire them with `addNode` / `addEdge` / `addConditionalEdges`.
- Replace the `if/else` source-type routing in `processFile()` with a conditional edge from `classifyDocument` that routes to the appropriate extract node (`memorialExtract`, `burialRegisterExtract`, `graveCardExtract`).
- Replace `processWithValidationRetry()` with an explicit back-edge from `validateData` → `extractData` (limited to `config.retry.validationRetries` via attempt counter in state) carrying the validation error for preamble injection.
- Thread `processingId` and cumulative token cost through graph state rather than local closures, and update `IngestService.js` to consume the graph's terminal state rather than `processFile()`'s return value.
- Update audit logging: each node invocation that calls a provider must call `llmAuditLog.logEntry()` using `processingId` from graph state; no schema change needed.

## Risks and gotchas
- **LangChain ecosystem churn**: `@langchain/langgraph` has a history of rapid API-breaking changes; binding the core processing pipeline to it creates a maintenance liability that could require non-trivial updates on every minor release.
- **Benchmark applicability gap**: the PLANET AI 66–77% → 93–98% improvement cannot be attributed to LangGraph specifically — it may come from better models, richer prompts, or pre-classification logic, all of which can be added without LangGraph; no heritage handwritten OCR benchmark evidence is cited.
- **Checkpointing complexity for no benefit**: LangGraph's primary differentiator is resumable checkpointing across long-running graphs, but TextHarvester's per-file processing is a synchronous sub-second operation; checkpointing adds serialisation overhead without delivering the recovery benefit.
- **Session cost cap interaction**: the sequential `sessionCostUsd` accumulation in `IngestService.js` must remain strictly ordered even if LangGraph enables parallel node execution; parallel extraction nodes would race on cost-cap enforcement and could overspend the session budget.

## Recommended next step
Defer — effort exceeds expected impact; the benchmark evidence does not apply to heritage handwritten records, the key agentic patterns are already implemented, and the LangGraph dependency introduces maintenance risk without delivering checkpointing or parallelism benefits for this use case.
---

### [#220] CHURRO open-source OCR model (Stanford, EMNLP 2025)
**Status**: Investigated

## Technique
Use CHURRO — a Stanford open-source OCR model trained on 155 heritage corpora — as a first-pass transcription step, feeding its raw text output into a cheaper LLM for JSON structuring rather than sending the raw image to a premium VLM for combined OCR + extraction.

## Research basis
CHURRO (EMNLP 2025, Stanford) reports 82.3% printed and 70.1% handwritten normalised Levenshtein distance on heritage document benchmarks, with an inferred inference cost 15.5× below Gemini Pro — measured against self-hosted deployment, not a managed API.

## Viability assessment
CHURRO is an OCR-only model (not a VLM) that returns raw transcribed text rather than structured JSON, which breaks the existing single-call provider contract; integration requires a two-pass architecture where CHURRO transcribes and a second cheap LLM (e.g. Gemini Flash or Claude Haiku) structures the output. Running CHURRO without a local GPU requires a managed GPU endpoint — HuggingFace Inference Endpoints ($0.40–1/hour), Replicate, or Modal — which introduces new paid external infrastructure; the headline 15.5× cost saving is for self-hosted deployment and will not materialise at the low request volumes TextHarvester currently handles via serverless GPU. The `@huggingface/inference` npm package can call a deployed endpoint without local GPU, so there is no hard incompatibility, but the economics and architectural complexity make this a poor fit for the existing API-only stack.

## Ratings
- **Effort**: 4/5 — Requires a new `churroProvider.js` extending `BaseVisionProvider` with an internal two-pass flow, HuggingFace or Replicate endpoint provisioning and secrets management, aggregated cost tracking across two API calls, `apiKeyValidator.js` update, and provider selection UI update.
- **Impact**: 2/5 — The heritage-trained OCR may improve accuracy on the worst-quality handwritten records, but GPT-5.4 and Claude Opus 4.6 already perform strongly; the two-pass latency overhead and serverless GPU pricing at low volume are likely to increase rather than reduce per-record cost until very high batch volumes.

## Relevant existing code
- `src/utils/modelProviders/baseProvider.js`: defines `processImage(base64Image, prompt, options)` returning `{ content, usage }` — the two-pass CHURRO flow must conform to this contract while internally making two HTTP calls.
- `src/utils/modelProviders/index.js`: `createProvider()` switch statement needs a `'churro'` case added.
- `src/utils/retryHelper.js`: `withRetry()` and `classifyError()` are reusable inside the new provider for both the CHURRO call and the structuring call.
- `src/utils/llmAuditLog.js`: audit entries are keyed by `processing_id`; the two-pass flow would need two `logEntry()` calls (CHURRO OCR + structuring LLM) with the same `processing_id` — already supported by `getEntriesByProcessingId()`.
- `src/utils/apiKeyValidator.js`: `validateApiKeys()` would need a CHURRO endpoint/key entry; established pattern for new providers.
- `config.json` `costs` section: aggregated token cost across two calls must be summed before `injectCostData()` receives it; structuring-LLM token rates are already in the config for Haiku/Flash.

## Implementation sketch
- **New module** `src/utils/modelProviders/churroProvider.js`: extends `BaseVisionProvider`; constructor reads `config.churro.endpoint` (HuggingFace Inference Endpoint URL) and `config.churro.apiKey`; `processImage()` makes two sequential `axios.post()` calls — first to the CHURRO endpoint with the base64 image, receiving raw transcribed text; second to a configurable cheap structuring LLM (defaulting to `gemini-2.5-flash`) with the transcribed text and the existing JSON schema prompt; returns `{ content: parsedJSON, usage: { input_tokens: combined, output_tokens: combined } }`.
- **Register in `index.js`**: add `case 'churro': return new ChuRROProvider(mergedConfig)` and export the class.
- **Config addition** in `config.json`: add `"churro": { "endpoint": "", "structuringProvider": "gemini", "structuringModel": "gemini-2.5-flash" }` with an entry in `costs.churro` mapping to a per-image rate from the HuggingFace Endpoint pricing.
- **Audit logging**: call `llmAuditLog.logEntry()` twice per file within `churroProvider.processImage()` — once for the CHURRO OCR call (provider: `churro`) and once for the structuring call (provider: `gemini` or `anthropic`); both entries share the same `processing_id` passed via `options`.
- **`apiKeyValidator.js`**: add a CHURRO section to `validateApiKeys()` that checks `CHURRO_ENDPOINT` and `CHURRO_API_KEY` env vars, following the same pattern as existing providers.
- **Infrastructure**: provision a HuggingFace Inference Endpoint (or Replicate deployment) for the CHURRO model weights; store the endpoint URL and API key in Fly.io secrets; document the setup in `docs/providers/churro.md`.

## Risks and gotchas
- **OCR-only output breaks single-call contract**: CHURRO returns raw text, not structured JSON; the two-pass design couples the provider to a specific structuring LLM, creating a hidden multi-provider dependency inside what appears to be a single provider to the rest of the codebase — a structuring call failure surfaces as a CHURRO provider failure.
- **Cost economics invert at low volume**: HuggingFace Inference Endpoints charge by uptime, not per request; at the volumes TextHarvester currently processes, the endpoint idle cost may exceed the API savings compared to calling Gemini Pro directly; the 15.5× figure requires sustained high-throughput batch processing to break even.
- **GPU endpoint availability and cold start**: serverless GPU providers (Replicate, Modal) have cold-start latencies of 10–30 seconds on first request; at low concurrency, this will dominate per-file processing time and degrade user-perceived performance.
- **Heritage OCR accuracy is unverified against TextHarvester corpus**: the reported 82.3%/70.1% metrics are on CHURRO's own benchmark splits; Irish graveyard memorials, handwritten burial register pages, and grave record cards may have different characteristics than the 155 corpora CHURRO was trained on, and accuracy must be validated before any claims about improvement over the existing VLM pipeline.

## Recommended next step
Defer — effort exceeds expected impact; the cost advantage applies only to self-hosted or high-volume deployments that require external GPU infrastructure incompatible with the current API-only Fly.io stack, and accuracy improvement on TextHarvester's specific document types is unconfirmed.

---

## Completed Issues

_24 issues resolved. Click issue number for full details on GitHub._

### P1 Completed (5)

| # | Title | PR | Status |
|---|-------|----|----|
| #119 | Confidence score silently defaults to 1.0 | [#128](https://github.com/donalotiarnaigh/textharvester-web/pull/128) | ✅ |
| #120 | BurialRegisterPrompt confidence envelopes | [#129](https://github.com/donalotiarnaigh/textharvester-web/pull/129) | ✅ |
| #116 | Per-field confidence scoring with review queue | [#117](https://github.com/donalotiarnaigh/textharvester-web/pull/117) | ✅ |
| #130 | Token and cost tracking | [#140](https://github.com/donalotiarnaigh/textharvester-web/pull/140) | ✅ |
| #132 | Retry on validation or parse failure | [#145](https://github.com/donalotiarnaigh/textharvester-web/pull/145) | ✅ |

### P2 Completed (14)

| # | Title | PR | Status |
|---|-------|----|----|
| #183 | Inline edit forms for all record types | — | ✅ |
| #136 | Anthropic JSON extraction regex fix | [#146](https://github.com/donalotiarnaigh/textharvester-web/pull/146) | ✅ |
| #123 | Cross-field validation (impossible dates/ages) | [#138](https://github.com/donalotiarnaigh/textharvester-web/pull/138) | ✅ |
| #124 | JSON parse failure → needs_review | [#139](https://github.com/donalotiarnaigh/textharvester-web/pull/139) | ✅ |
| #125 | Database migrations in transactions | [manual merge] | ✅ |
| #135 | Review workflow (CSV export approach) | [#147](https://github.com/donalotiarnaigh/textharvester-web/pull/147) | ✅ |
| #134 | Confidence coverage tracking | [#148](https://github.com/donalotiarnaigh/textharvester-web/pull/148) | ✅ |
| #126 | `_confidence_scores` API cleanup | [#149](https://github.com/donalotiarnaigh/textharvester-web/pull/149) | ✅ |
| #127 | Request correlation ID (processing_id) | [#150](https://github.com/donalotiarnaigh/textharvester-web/pull/150) | ✅ |
| #133 | LLM audit logging for debugging | [#152](https://github.com/donalotiarnaigh/textharvester-web/pull/152) | ✅ |
| #142 | DEBS monument classification pipeline | [#153](https://github.com/donalotiarnaigh/textharvester-web/pull/153) | ✅ |
| #105 | Enforce filename-based identity | [#156](https://github.com/donalotiarnaigh/textharvester-web/pull/156) | ✅ |
| #38 | Respond immediately on upload and offload PDF conversion | [#157](https://github.com/donalotiarnaigh/textharvester-web/pull/157) | ✅ |
| #37 | Add controlled concurrency to file processing queue | [#141](https://github.com/donalotiarnaigh/textharvester-web/pull/141) | ✅ |

### P1 — Recently Completed

| # | Title | PR | Status |
|---|-------|----|----|
| #163 | Startup API key validation with guidance | — | ✅ |

### Also Completed

| # | Title | PR | Status |
|---|-------|----|----|
| #171 | Schema versioning with column migration on edit | — | ✅ |
| #168 | Custom schemas — integrate with confidence scoring and retry pipeline | — | ✅ |
| #187 | Cost data (tokens, USD) missing from CSV export and web results UI | [#192](https://github.com/donalotiarnaigh/textharvester-web/pull/192) | ✅ |
| #143 | Add Gemini as a provider | [#144](https://github.com/donalotiarnaigh/textharvester-web/pull/144) | ✅ |
| #121 | Evaluation metrics infrastructure | [#137](https://github.com/donalotiarnaigh/textharvester-web/pull/137) | ⏳ Data pending |
