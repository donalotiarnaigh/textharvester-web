### WBS — Monument Photo OCR (Phase 0)

#### Scope
Baseline support for OCR from monument photos using single-call LLM prompts, minimal UI changes, `source_type` threading, nullable DB column, and feature-flag gating. No preprocessing, region detection, overlays, or multi-image fusion.

---

## A) Current State Analysis (References)

- Entry point and static serving: `server.js`
  - Routes: `POST /upload` → `src/controllers/uploadHandler.js`
  - Static UI: `public/` (upload in `public/index.html`)

- Frontend upload flow
  - Dropzone setup: `public/js/modules/index/dropzone.js` (configures `Dropzone.options.uploadForm`)
  - Upload handlers: `public/js/modules/index/fileUpload.js`
    - Appends `replaceExisting`, `aiProvider` in `sending` event
    - Redirects to `/processing.html` after queue complete

- Results UI
  - Results modules: `public/js/modules/results/*`
  - Model info panel: `public/js/modules/results/modelInfoPanel.js` (displays ai_provider, model_version, prompt_template, prompt_version, processed_date)

- Backend upload and queue
  - Upload handling: `src/controllers/uploadHandler.js`
    - Multer config, PDF conversion (`utils/pdfConverter`)
    - Enqueues files via `utils/fileQueue.enqueueFiles`
    - Validates prompts via `utils/prompts/templates/providerTemplates`
  - Processing: `src/utils/fileProcessing.js`
    - Reads image → selects provider via `utils/modelProviders` → prompts via `providerTemplates.getPrompt`
    - Validates/normalizes response → `utils/database.storeMemorial`

- Provider abstraction
  - Factory: `src/utils/modelProviders/index.js` → OpenAI/Anthropic providers
  - Prompt system: `src/utils/prompts/*` (PromptFactory/Manager/Templates/Types)

- Data model
  - SQLite: single table `memorials` with fields: memorial_number, first_name, last_name, year_of_death, inscription, file_name, ai_provider, model_version, prompt_template, prompt_version, processed_date

---

## B) Phase 0 Work Breakdown Structure

### 1) Feature Flag and Config
- Add env/config flag `FEATURE_MONUMENT_OCR_PHASE0` (default false)
  - Surface to frontend (bootstrap JSON or inline script in `index.html`)
  - Backend guard in `uploadHandler` to coerce `source_type` to `record_sheet` when disabled
- README/docs: add instructions to enable flag locally and in staging

### 2) Frontend: Upload Mode Selector
- Files: `public/index.html`, `public/js/modules/index/dropzone.js`, `public/js/modules/index/fileUpload.js`
- Add radio/select control: Record Sheet (default), Monument Photos
- Persist selection in `localStorage.uploadMode`
- Include `source_type` in `FormData` (fileUpload.js `sending` handler)
- Update on-page guidance for monument photos (angle, contrast, glare)

### 3) Backend: Upload Handling
- File: `src/controllers/uploadHandler.js`
- Accept optional `source_type` from form body; validate ∈ {record_sheet, monument_photo}
- Attach `source_type` to items queued via `enqueueFiles`
- Ensure PDFs still convert; for images, pass through unchanged

### 4) Processing Pipeline Wiring
- File: `src/utils/fileProcessing.js`
- Accept `options.source_type`; propagate to prompt selection
- Select monument prompt when `source_type=monument_photo`, else existing memorial sheet prompt
- Keep existing validation/convert/store flow unchanged

### 5) Provider Prompt Templates
- Files: `src/utils/prompts/templates/*`
- Create monument prompt templates for OpenAI and Anthropic
  - Strict JSON schema mapping to current DB fields
  - Guidance: weathered stone, abbreviations, ligatures, Roman numerals
  - Explicit: do not hallucinate memorial numbers; allow nulls
- Register in PromptManager; extend tests

### 6) Database Migration and Exports
- Add idempotent migration script `scripts/migrate-add-source-type.js`
  - ALTER TABLE memorials ADD COLUMN source_type TEXT NULL (skip if exists)
  - Backfill optional default display: treat NULL as `record_sheet`
- Ensure `/results-data`, CSV, JSON include `source_type` when present

### 7) Results UI Update
- File: `public/js/modules/results/modelInfoPanel.js`
- Display `source_type` (fallback to `record_sheet` when absent)
- No results table changes required

### 8) Observability
- Log `source_type` at upload acceptance, queueing, processing start, and DB store points
- Retain payload truncation and sampling; no additional metrics required

### 9) Testing Plan
- Unit tests
  - Prompt selection logic keyed by `source_type`
  - Monument prompt template formatting/validation
  - Migration script: column exists/created and values persist
- Integration tests
  - Upload with `monument_photo` → queue → mocked provider → DB → `/results-data`
  - Feature flag off: UI hides mode; backend coerces to `record_sheet`
- UI tests
  - Mode selector visibility (flag on/off), selection persistence, `FormData` contains `source_type`
  - Model Info shows `source_type`

### 10) Deliverables
- Code: FE selector + BE handling + prompt templates + migration script
- Docs: updated tech design, README env flag section
- Tests: unit, integration, and UI passing

---

## C) Detailed Checklist
- [ ] Flag `FEATURE_MONUMENT_OCR_PHASE0` plumbed FE/BE
- [ ] UI selector added and persisted
- [ ] `FormData` includes `source_type`
- [ ] `/upload` validates and threads `source_type`
- [ ] Queue items carry `source_type`
- [ ] Process pipeline selects monument prompt on `monument_photo`
- [ ] Monument prompts implemented (OpenAI, Anthropic)
- [ ] Migration adds `memorials.source_type`
- [ ] Results Model Info shows `source_type`
- [ ] Exports include `source_type` when present
- [ ] Unit tests for prompts, migration, selection
- [ ] Integration/UI tests
- [ ] Docs updated

