# Issue Tracker — TextHarvester Web

_Last updated: 2026-04-04 · 27 open issues · [23 completed](#completed-issues)_

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

**#171** — Schema versioning with column migration on edit
No migration path when a schema is edited after processing documents. `version` column exists but is never incremented. Users who missed a field after processing 500 documents need direct support.

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

## Completed Issues

_23 issues resolved. Click issue number for full details on GitHub._

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
| #168 | Custom schemas — integrate with confidence scoring and retry pipeline | — | ✅ |
| #187 | Cost data (tokens, USD) missing from CSV export and web results UI | [#192](https://github.com/donalotiarnaigh/textharvester-web/pull/192) | ✅ |
| #143 | Add Gemini as a provider | [#144](https://github.com/donalotiarnaigh/textharvester-web/pull/144) | ✅ |
| #121 | Evaluation metrics infrastructure | [#137](https://github.com/donalotiarnaigh/textharvester-web/pull/137) | ⏳ Data pending |

