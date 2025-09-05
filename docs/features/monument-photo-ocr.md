### Monument Photo OCR — Current State Analysis and Implementation Plan

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

## 2) Goal: OCR Directly from Monument Photos

Enable users to upload monument photos and extract structured memorial data (names, inscription, death dates, etc.) without relying on record-sheet images. Record sheets remain optional supplementary inputs.

### Key Requirements
- Accept raw monument photos (mixed orientations, lighting, partial occlusions, weathered stone).
- Pre-process images for OCR robustness (auto-rotate, enhance contrast, denoise, deblur, deskew).
- Optionally detect text regions and run targeted OCR on those regions.
- Extract structured fields consistently with current schema and exports.
- Support multiple photos per monument with field merging/fusion.
- Provide visual QA (overlays) and simple verification/editing workflow.
- Keep provider abstraction (OpenAI/Anthropic), with monument-focused prompts.

---

## 3) Proposed Architecture Changes

### 3.1 Frontend (UI/UX)
- Upload mode selector: "Record Sheet" (existing) vs "Monument Photos" (new). Persist choice in local storage.
- Preview pane for monument mode:
  - Show auto-detected text regions as optional overlays (if available).
  - Allow manual crop to hint the model (optional P2).
- Results page enhancements:
  - Show original image with optional overlays/bounding boxes for extracted text regions.
  - Display alternative candidates for ambiguous fields (P2) and indicate extraction source (full image vs region).
  - Keep Model Info Panel; add `source_type` (record_sheet | monument_photo).

### 3.2 Backend Processing Pipeline
- Pre-processing (P1) using `sharp` and, optionally, OpenCV bindings:
  - Auto-rotate using EXIF; deskew heuristics; contrast (CLAHE-like), adaptive thresholding, denoise.
  - Generate downscaled preview and, optionally, region crops.
- Text-region detection (P2):
  - Option A: Lightweight detector (EAST/CRAFT via `opencv4nodejs` or external service), produce bounding boxes.
  - Option B: Prompt the LLM to suggest regions (coarse) then refine locally.
- OCR strategy:
  - P0 Baseline: Single-call LLM on full image with monument-specific prompt; return JSON.
  - P1: Hybrid — run LLM on cropped regions and fuse field candidates.
- Aggregation and fusion (P2):
  - When multiple images or regions are available, prefer highest-quality candidates per field.
  - Simple heuristics first (e.g., date consistency, string similarity), extensible to learned ranking later.

### 3.3 Prompting and Providers
- New monument-focused prompt templates per provider:
  - Guidance on reading weathered stone, serif/sans, mixed scripts, abbreviations, Roman numerals, Gaelic/diacritics.
  - Strict JSON schema with field validations and normalization rules.
- Provider options remain swappable (OpenAI/Anthropic). Reuse existing provider abstraction.

### 3.4 Data Model Extensions (SQLite)
Keep backward compatibility; avoid reintroducing a single global confidence score. Instead, add structured provenance.

- New table: `images`
  - `id INTEGER PK`, `file_name TEXT NOT NULL`, `width INTEGER`, `height INTEGER`, `exif_lat REAL`, `exif_lng REAL`, `processed_date DATETIME`.

- New table: `memorial_images` (many-to-many)
  - `memorial_id INTEGER`, `image_id INTEGER`.

- New table: `ocr_segments`
  - `id INTEGER PK`, `image_id INTEGER`, `bbox TEXT` (JSON: `[x,y,w,h]`), `field TEXT` (e.g., `first_name`, `last_name`, `inscription`, `death_date`), `text TEXT`, `provenance TEXT` (JSON blob: `{ provider, model_version, prompt_version }`), `created_at DATETIME`.

- Extend `memorials` with:
  - `source_type TEXT` (`record_sheet` | `monument_photo`).
  - (Optional) `source_notes TEXT` for operator notes.

- Exports: keep current CSV/JSON; optionally ship an annex JSON with image/segment overlays.

### 3.5 APIs and Jobs
- Extend `/upload` to accept `source_type` and mode-specific options (e.g., enable_preprocessing, enable_region_detection).
- Add `/images/:id/segments` to fetch overlays for the UI.
- Use existing queue; add concurrency limit and memory guardrails for region crops.

### 3.6 Observability and QA
- Log pre-processing transforms and detected regions.
- Track provider latency and token usage for cost monitoring.
- Add a simple verification UI state: pending → verified → exported.

---

## 4) Phased Implementation Plan

### Phase 0 — Baseline Monument OCR (LLM-only)
- Add monument-specific prompt template(s) for OpenAI/Anthropic.
- Add `source_type=monument_photo` through the pipeline and DB.
- Minimal UI change: mode selector and instructions.
- Acceptance:
  - Upload 10–20 sample monument images; achieve parseable JSON with fields populated in ≥70% cases.
  - No regressions on record-sheet flow; tests green.

### Phase 1 — Pre-processing Enhancements
- Implement auto-rotate, contrast boost, denoise, and scale normalization in a pre-processing step.
- Feature flag to toggle pre-processing on/off.
- Acceptance:
  - Measurable improvement on a fixed sample set vs Phase 0.

### Phase 2 — Region Detection and Overlay UI
- Integrate lightweight text-region detection to produce bounding boxes.
- Call providers on region crops where beneficial; add overlay rendering in results page.
- Add `ocr_segments` persistence.
- Acceptance:
  - Overlay accuracy subjectively useful in ≥70% images; improved extraction fidelity on targeted fields.

### Phase 3 — Multi-Image Fusion and Verification
- Allow multiple photos per monument; implement simple field-level fusion and a verify/edit step.
- Add `images`, `memorial_images` relations and update exports.
- Acceptance:
  - Fusion reduces missing/incorrect fields on multi-image sets; verification flow usable end-to-end.

### Phase 4 — Integration and Hardening
- Document API/CLI for batch ingestion; optional push to Historic Graves site.
- Robust error handling, rate limiting, retries, and back-pressure in queue.
- Performance/cost dashboards.

---

## 5) Testing Strategy
- Unit tests: pre-processing functions, prompt formatters, validators, DB mappers.
- Integration tests: upload → queue → provider mock → DB → results APIs.
- Provider tests use deterministic fixtures and mocks (existing `__mocks__` pattern) to avoid live API variability.
- Golden-sample regression suite with representative monument photos.

---

## 6) Risks and Mitigations
- Variability in lighting/weathering → mitigate with robust pre-processing and optional region detection.
- Provider non-determinism → use mocks for tests; sample multiple runs for QA.
- Cost and latency → region cropping, batching, and caching; configurable providers.
- Schema complexity → keep BC with current exports; introduce new tables incrementally.

---

## 7) Work Items (Initial Backlog)
- Add monument prompt templates for OpenAI/Anthropic and wire through `fileProcessing`.
- Add `source_type` support end-to-end; DB migration for new column.
- Frontend: mode selector, updated copy for monument mode.
- Pre-processing module (P1): rotate/deskew, contrast, denoise; feature flag.
- Region detection (P2): integrate detector; overlay rendering; `ocr_segments` table.
- Multi-image support (P3): `images`, `memorial_images`, fusion logic; verification view.

---

### Notes
- Avoid reintroducing a single numeric confidence field; prefer per-segment provenance and optional quality flags.
- Ship features behind flags where possible to stage rollouts.


