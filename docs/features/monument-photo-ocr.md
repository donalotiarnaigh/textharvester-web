### Monument Photo OCR — Phase 0 Plan and Current State

#### Context
Community groups currently photograph monuments and complete paper record sheets. The app ingests PDFs or images of these record sheets and extracts structured text for upload to the Historic Graves website. We now want to support extracting inscriptions directly from photos of the monuments themselves, using record sheets as supplementary context.

---

## 1) Current State Summary

- **Purpose**: Extract structured data from record-sheet images using AI vision models and store results in SQLite for export (CSV/JSON) and review.
- **Key flows**:
  - Upload (JPEG/PDF) → Queue → Provider prompt → AI response → Validation/Conversion → DB store → Results UI → Export.
- **Endpoints** (`server.js`):
  - `POST /upload` (file ingestion)
  - `GET /results-data`, `GET /download-json`, `GET /download-csv`
  - `GET /processing-status`, `GET /progress`, `POST /cancel-processing`
  - `app.use('/api/performance', performanceRoutes)`
- **Processing**:
  - PDFs are converted to JPEGs (`utils/pdfConverter`).
  - Files are queued (`utils/fileQueue`), then processed (`utils/fileProcessing` → provider in `utils/modelProviders/*`).
  - Prompts/templates are modular and provider-specific (`utils/prompts/templates`).
  - Providers supported: OpenAI GPT‑5, Anthropic Claude 4 Sonnet.
  - Logging, sampling and payload truncation via `utils/logger` with performance tracking.
- **Data model** (SQLite): single `memorials` table (see README):
  - `memorial_number, first_name, last_name, year_of_death, inscription, file_name, ai_provider, model_version, prompt_template, prompt_version, processed_date`.
  - Optimized indexes on number, name, year.
- **UI**:
  - Upload page optimized for record sheets (drag/drop, folder support, replace vs append).
  - Results page with downloads (CSV/JSON) and a model info panel.

### Current Limitations (relative to Monument Photo OCR)
- Prompts are tuned for record sheets; stone inscriptions differ (lighting, weathering, background clutter, layout).
- No dedicated pre-processing for photos (orientation, dewarp, contrast normalization, denoise, thresholding).
- No explicit text-region detection/segmentation or bounding box overlays in the UI.
- Single-image assumptions per record; limited support for multi-photo fusion for a single monument.
- Schema does not track image regions, multiple source images per memorial, or per-region extraction metadata.
- No human-in-the-loop verification workflow (field-level acceptance, alternative candidates, uncertainty flags).

---

## 2) Goal (Phase 0): OCR Directly from Monument Photos

Enable users to upload monument photos and extract structured memorial data (names, inscription, death dates, etc.) without relying on record-sheet images. Record sheets remain optional supplementary inputs.

### Scope (Phase 0 Only)
- Single-call LLM OCR on the full image with a monument-specific prompt.
- Minimal UI additions: mode selector and instructions for “Monument Photos”.
- Add `source_type=monument_photo` through the pipeline and DB for attribution.
- Maintain current CSV/JSON export format and results display.

### Explicit Non-goals (Deferred)
- No image pre-processing (deskew/denoise/contrast), no text-region detection, no overlays.
- No multi-image fusion for a single monument.
- No new tables for images/segments; keep schema changes to a single optional field.

---

## 3) Implementation (Phase 0 Only)

### 3.1 Frontend (UI/UX)
- Add a mode selector on the upload page: "Record Sheet" (default) and "Monument Photos".
- Persist selection in `localStorage` and include it in upload requests.
- Update copy to set expectations: best results with high-contrast, front-facing photos.
- Results page: keep current layout; enhance Model Info panel to display `source_type`.

### 3.2 Backend Pipeline
- Accept `source_type` on `POST /upload` and pass through the queue and processing pipeline.
- Use new monument-specific prompt templates in the provider layer when `source_type=monument_photo`.
- No image pre-processing; pass the original image to the provider.
- Store results in `memorials` with an added optional `source_type` field defaulting to `record_sheet` when absent.

### 3.3 Prompting and Providers
- Add monument-focused prompt templates per provider (OpenAI, Anthropic):
  - Guidance for weathered stone, mixed casing, ligatures, abbreviations, and Roman numerals.
  - Strict JSON schema matching current DB fields; normalize dates to YYYY or NULL; treat unreadable fields as NULL.
  - Instruct model to avoid hallucinating memorial numbers or names not clearly present.
- Wire selection logic: when `source_type=monument_photo`, use monument prompts; otherwise, keep existing record-sheet prompts.

### 3.4 Data Model (SQLite)
- Backward-compatible change: add nullable `source_type TEXT` to `memorials`.
- Migration script: adds the column if missing and sets default value `record_sheet` for legacy rows.
- Exports unchanged; results include the new field when present.

### 3.5 Configuration and Flags
- Environment flag `FEATURE_MONUMENT_OCR_PHASE0=true|false` (default false).
- When disabled, the UI hides the mode selector and backend ignores `source_type=monument_photo`.

---

## 4) Acceptance Criteria (Phase 0)
- Upload 10–20 representative monument photos; app returns valid JSON mapped to DB fields in ≥70% of cases.
- No regressions on the record-sheet workflow; all tests pass.
- `source_type` is persisted and visible in the Model Info panel and `/results-data`.
- Feature flag off: behavior matches current app; flag on: monument mode available and functional.

---

## 5) Testing Strategy (Phase 0)
- Unit tests: prompt selection logic, monument prompt formatting/validation, DB column presence and persistence.
- Integration tests: upload with `source_type=monument_photo` → queue → mocked provider response → DB → `/results-data`.
- UI tests: mode selector visibility (flag on/off), selected mode persisted, Model Info shows `source_type`.
- Golden-sample fixtures: representative monument photos with mocked provider outputs.

---

## 6) Risks and Mitigations (Phase 0)
- Variability in lighting/weathering → communicate best practices in UI; rely on robust prompts; defer preprocessing.
- Provider non-determinism → use strict JSON response format and mocks for tests.
- Schema risk → single nullable column; migration scripts reversible; defaults preserve legacy behavior.

---

## 7) Work Items (Phase 0 Only)
- Prompts: Add monument templates for OpenAI/Anthropic; plug into provider selection.
- Backend: Thread `source_type` through `/upload` → queue → processing; set prompt based on mode.
- Database: Migration to add `memorials.source_type` (nullable, default `record_sheet`).
- Frontend: Mode selector and instructions; Model Info shows `source_type`.
- Config: `FEATURE_MONUMENT_OCR_PHASE0` env flag; UI/BE gating.

---

### Notes
- Avoid reintroducing a single numeric confidence field; prefer per-segment provenance and optional quality flags.
- Ship features behind flags where possible to stage rollouts.


