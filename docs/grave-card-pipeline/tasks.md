# Implementation Plan - Grave Record Card Processing Pipeline

This plan follows a TDD approach. Tests are written first to define behavior (Red), then implementation follows to pass tests (Green), followed by refactoring.

- [x] 1. Core Data Structures & Database Migration (Foundation)
  - [x] 1.1 Create test database schema and migration script
    - Use `src/utils/graveCardStorage.js` as the target file.
    - Define SQLite schema as per design (columns: id, file_name, section, grave_number, data_json, processed_date, ai_provider).
    - _Requirements: 3.1, 4.2_
  - [x] 1.2 Write tests for GraveCardStorage (TDD)
    - **Happy Path**: Test `storeGraveCard` with valid full JSON object. Verify `data_json` stores full object and columns extract metadata correctly.
    - **Happy Path**: Test `exportCardsToCsv` with nested interments (confirm flattening to `interment_1_name`, etc.).
    - **Unhappy Path**: Test `storeGraveCard` with missing required fields (throw error).
    - _Requirements: 3.2, 4.4, 4.5_
  - [x] 1.3 Implement GraveCardStorage
    - Implement `initialize` table logic.
    - Implement `storeGraveCard` with hybrid column/JSON approach.
    - Implement `exportCardsToCsv` with logic to flatten nested `interments` array into wide-format columns.
    - _Requirements: 3.1, 3.2, 4.5_

- [x] 2. GraveCardProcessor Component (Image Processing)
  - [x] 2.1 Write tests for PDF Stitching (TDD)
    - Target: `src/utils/imageProcessing/graveCardProcessor.test.js`.
    - **Happy Path**: Mock `pdftocairo` returning 2 images -> Verify `stitch` calls `sharp` to vertically join them.
    - **Unhappy Path**: Input PDF has 1 page -> Throw "InvalidPageCount".
    - **Unhappy Path**: Input PDF has 3 pages -> Throw "InvalidPageCount".
    - _Requirements: 1.1, 1.2, 4.1_
  - [x] 2.2 Implement GraveCardProcessor
    - Create `src/utils/imageProcessing/graveCardProcessor.js`.
    - Implement `processPdf` to call `pdftocairo`.
    - Implement validation logic for page count (strictly 2).
    - Implement stitching logic using `sharp` (vertical join + padding).
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. GraveCardPrompt Template (AI Interaction)
  - [x] 3.1 Write tests for Grave Record Schema Validation (TDD)
    - Target: `src/utils/prompts/templates/GraveCardPrompt.test.js`.
    - **Happy Path**: Validate full JSON payload matches `GraveRecord` schema.
    - **Happy Path**: Test transcription conventions (verify `-` and `|` are accepted).
    - **Unhappy Path**: Missing `card_metadata`.
    - **Unhappy Path**: `interments` is not an array.
    - _Requirements: 2.1, 2.2, 2.3, 4.3_
  - [x] 3.2 Implement GraveCardPrompt Class
    - Create `src/utils/prompts/templates/GraveCardPrompt.js` extending `BasePrompt`.
    - Implement `getPromptText` with strict transcription rules.
    - Implement `validateAndConvert` with strict schema validation.
    - Register in `PromptFactory`.
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. File Processing Integration (Pipeline Wiring)
  - [ ] 4.1 Write integration tests for fileProcessing.js
    - Target: `src/utils/fileProcessing.test.js`.
    - **Happy Path**: Mock `GraveCardProcessor` and `Provider`. Call `processFile` with `source_type='grave_record_card'`. Verify flow: Processor -> Provider -> Storage.
    - **Unhappy Path**: Processor fails -> Error logged/rethrown.
    - _Requirements: 1.1, 1.2, 3.1_
  - [ ] 4.2 Update fileProcessing.js
    - Add logic to check `source_type`.
    - If `grave_record_card`, bypass standard image read.
    - Call `GraveCardProcessor.processPdf`.
    - Instantiate `GraveCardPrompt`.
    - Call `GraveCardStorage.storeGraveCard`.
    - _Requirements: 1.3, 4.4_

- [ ] 5. Configuration & Verification
  - [ ] 5.1 Update Config
    - Add `graveCard` settings (stitch padding, resolution) to `config.json`.
    - _Requirements: Non-functional_
  - [ ] 5.2 End-to-End Verification
    - Manual Run: Process sample PDF from `/Users/danieltierney/projects/historic-graves/11_Douglas`.
    - Verify database entry.
    - Verify CSV export format (Widened columns).
    - _Requirements: All_
