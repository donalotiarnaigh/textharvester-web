# Issue Tracker — TextHarvester Web

_Last updated: 2026-04-07 · 49 open issues · [24 completed](#completed-issues)_

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

_23 issues opened 2026-04-07. Based on VLM digitisation techniques survey covering 30+ papers (2024–2026). No implementation plan — findings and supposed benefits only._

### Prompting & Extraction

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#203](https://github.com/donalotiarnaigh/textharvester-web/issues/203) | Row-level image slicing with two-shot prompting | 8.8× field-level accuracy improvement; two examples optimal for tabular heritage records (arXiv:2510.23066, arXiv:2501.11623) | **Status: Investigated** — see full entry below table |
| [#204](https://github.com/donalotiarnaigh/textharvester-web/issues/204) | OCR-Agent reflection mechanisms (capability + memory reflection) | Prevents capability hallucination and correction loops; +2.0 on OCRBench v2 (arXiv:2602.21053) | **Status: Investigated** — see full entry below table |
| [#205](https://github.com/donalotiarnaigh/textharvester-web/issues/205) | Self-consistency sampling with majority voting | Highest-accuracy single technique; Universal Self-Consistency variant reduces to one adjudication call | **Status: Investigated** — see full entry below table |
| [#206](https://github.com/donalotiarnaigh/textharvester-web/issues/206) | Schema-constrained generation across all providers | 92% error reduction on first retry via PARSE framework; schema field ordering recovers lost reasoning quality (arXiv:2510.08623) | **Status: Investigated** — see full entry below table |
| [#224](https://github.com/donalotiarnaigh/textharvester-web/issues/224) | Two-step extraction (free-text → structured) | CER 1.8%, WER 3.5% at ~$0.01/page; avoids 10–15% reasoning quality penalty from structured output mode (arXiv:2411.03340) | **Status: Investigated** — see full entry below table |

### Multi-Model Ensemble & Confidence

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#207](https://github.com/donalotiarnaigh/textharvester-web/issues/207) | Field-level multi-model ensemble voting (RAGsemble / Guardian Pipeline) | Outperforms every single-model baseline; field-level voting more powerful than document-level (arXiv:2601.05266, arXiv:2603.08954) |
| [#208](https://github.com/donalotiarnaigh/textharvester-web/issues/208) | Composite confidence scoring (cross-model + logprobs + self-consistency + doc quality) | Cross-model disagreement = epistemic uncertainty; self-consistency = aleatoric uncertainty (MUSE, EMNLP 2025; ICLR 2026) |

### Image Pre-processing

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#209](https://github.com/donalotiarnaigh/textharvester-web/issues/209) | Minimal pre-processing pipeline with CLAHE via Sharp.js | Binarisation hurts VLM performance; CLAHE most impactful single enhancement for faded historical ink |
| [#210](https://github.com/donalotiarnaigh/textharvester-web/issues/210) | Region/row cropping before VLM inference | 5–10× token cost reduction; two-pass layout detection eliminates need for separate ML model |
| [#211](https://github.com/donalotiarnaigh/textharvester-web/issues/211) | Perspective correction for monument photographs | Addresses angled headstone shots via OpenCV.js `getPerspectiveTransform` + `warpPerspective` |

### Post-processing & Validation

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#212](https://github.com/donalotiarnaigh/textharvester-web/issues/212) | Multimodal correction pass (image + OCR → second VLM) | <1% CER on printed historical documents without fine-tuning; >60% CER reduction with socio-cultural context (arXiv:2504.00414, arXiv:2408.17428) |
| [#213](https://github.com/donalotiarnaigh/textharvester-web/issues/213) | Degenerate output detection (CCR metric, length ratio, entropy) | VLM hallucinations are fluent and undetectable without algorithmic checks; CCR threshold ~40% (FedCSIS 2025) |
| [#214](https://github.com/donalotiarnaigh/textharvester-web/issues/214) | Retrieval-augmented grounding for place/person names | World Historical Gazetteer, Vision of Britain, FreeBMD; Rose's Act (post-1813) structure as hallucination constraint |
| [#215](https://github.com/donalotiarnaigh/textharvester-web/issues/215) | Historical date format parsing (Latin months, Old Style/New Style) | "7ber"–"Xber" for Sep–Dec; dual dating "1723/4"; silent errors on all pre-1752 English parish records |
| [#216](https://github.com/donalotiarnaigh/textharvester-web/issues/216) | Extended cross-field validation rules (date arithmetic, age plausibility, ordering) | Deterministic; no additional API calls; integrates directly with existing `needs_review` flag |

### Agentic Orchestration

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#217](https://github.com/donalotiarnaigh/textharvester-web/issues/217) | LangGraph.js agentic pipeline | Architecture alone accounts for 66–77% → 93–98% accuracy improvement in PLANET AI 2025 IDP benchmarks |
| [#218](https://github.com/donalotiarnaigh/textharvester-web/issues/218) | LLM-as-judge / Panel of LLM Judges (PoLL) | Scales automated review beyond human capacity; PoLL reduces single-model evaluation bias |
| [#219](https://github.com/donalotiarnaigh/textharvester-web/issues/219) | Active learning loop with Langfuse trace logging | <1% error rate achievable with 1,000 training lines; disagreement score identifies highest-value annotation targets (arXiv:1802.10038) |

### Alternative Models

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#220](https://github.com/donalotiarnaigh/textharvester-web/issues/220) | CHURRO open-source OCR model (Stanford, EMNLP 2025) | 82.3% printed / 70.1% handwritten normalised Levenshtein; 15.5× cheaper than Gemini Pro; trained on 155 heritage corpora |

### Cost Engineering

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#221](https://github.com/donalotiarnaigh/textharvester-web/issues/221) | Batch API usage (OpenAI + Anthropic, 50% flat discount) | Flat 50% cost reduction; up to 50,000 requests/batch; compatible with existing async pipeline |
| [#222](https://github.com/donalotiarnaigh/textharvester-web/issues/222) | Prompt caching for repeated system prompts and schemas | Up to 90% reduction on non-image prompt tokens; automatic in Claude since Feb 2026 |
| [#223](https://github.com/donalotiarnaigh/textharvester-web/issues/223) | Cascading model strategy (cheap first-pass → confident escalation) | <20% of full ensemble cost; ≤2–10% accuracy gap (C3PO framework, arXiv:2511.07396) |

### Community & Feedback

| # | Technique | Key Finding |
|---|-----------|-------------|
| [#225](https://github.com/donalotiarnaigh/textharvester-web/issues/225) | Community-driven transcription correction (FamilySearch model) | Genealogist volunteers correct uncertain AI transcriptions; proven at 2 billion records scale |

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

### [#206] Schema-constrained generation across all providers
**Status**: Investigated

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

