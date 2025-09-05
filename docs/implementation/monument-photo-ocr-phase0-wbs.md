### WBS — Monument Photo OCR (Phase 0)

#### Scope
Baseline support for OCR from monument photos using single-call LLM prompts, minimal UI changes, `source_type` threading, nullable DB column, and feature-flag gating. No preprocessing, region detection, overlays, or multi-image fusion.

---

## 1) Foundations
- Verify feature flag plumbing
  - Add `FEATURE_MONUMENT_OCR_PHASE0` to config/.env handling
  - Expose flag to frontend (bootstrap or config endpoint)
- Add product copy for monument mode (upload page)

## 2) Frontend — Upload Mode
- Add mode selector (Record Sheet | Monument Photos)
  - Default to Record Sheet
  - Persist selection in `localStorage.uploadMode`
- Include `source_type` in upload `FormData`
- Update help text (best practices for monument photos)

## 3) Backend — Upload Handling
- Extend `POST /upload` to accept optional `source_type`
  - Validate ∈ {`record_sheet`, `monument_photo`} (fallback to `record_sheet`)
  - Attach `source_type` to queued file items
- Ensure feature flag off → ignore `monument_photo`

## 4) Processing Pipeline
- Thread `source_type` through queue → processing options
- Prompt selection in provider layer
  - If `source_type=monument_photo`, use monument prompt template
  - Else use existing record-sheet prompt
- Maintain existing validation/convert/store flow

## 5) Provider Prompts
- Create monument prompt templates per provider
  - Strict JSON schema mapping to existing DB fields
  - Guidance for weathered stone, abbreviations, Roman numerals
  - No hallucination of memorial numbers; allow nulls
- Integrate with prompt manager/provider template registry

## 6) Database and Exports
- Migration utility to add `memorials.source_type TEXT NULL`
  - Idempotent (skip if exists)
  - Default handling: treat NULL as `record_sheet`
- Ensure `/results-data`, CSV, JSON include `source_type` when present

## 7) Results UI
- Extend Model Info panel to display `source_type`
- No table layout changes required

## 8) Config & Rollout
- Flag default `false`; enable on staging first
- Document enabling instructions in README/docs

## 9) Testing
- Unit tests
  - Prompt selection logic for `source_type`
  - Monument prompt formatting/validation
  - Migration: column creation and persistence
- Integration tests
  - Upload with `monument_photo` → queue → mocked provider → DB → `/results-data`
  - Feature-flag off/on behavior
- UI tests
  - Mode selector visibility (flag), persistence, request payload
  - Model Info shows `source_type`

## 10) Observability & Error Handling
- Log `source_type` at upload and processing start
- Ensure JSON parse/validation errors propagate as current error results

## 11) Deliverables
- Code changes (FE/BE, prompts, migration)
- Updated docs (tech design updated, README changes for flag)
- Test suites green

---

## 12) Checklist
- [ ] Feature flag wired (FE/BE)
- [ ] Upload mode selector added
- [ ] `source_type` threaded to upload API
- [ ] Queue and processing carry `source_type`
- [ ] Monument prompts implemented and registered (OpenAI, Anthropic)
- [ ] Migration adds `memorials.source_type`
- [ ] Results Model Info shows `source_type`
- [ ] Exports include `source_type` when present
- [ ] Unit tests written and passing
- [ ] Integration/UI tests written and passing
- [ ] Docs updated (README + design)

