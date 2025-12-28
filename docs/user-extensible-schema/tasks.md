# Implementation Plan: User-Extensible Schema

- [x] 1. Phase 1: Foundation (Schema Management & Storage)
  - _Goal: Enable storage and retrieval of custom schema definitions and manage dynamic tables._
  - [x] 1.1a Write tests for `SchemaDDLGenerator` (Utility) (TDD: Red)
    - **Happy path**: Input valid JSON schema -> Output correct SQL CREATE TABLE string. Includes standard columns.
    - **Unhappy path**: Invalid types, reserved SQL keywords in names (test sanitization logic).
    - _Requirements: 1.3, 3.4, 4.1_

  - [x] 1.1b Write tests for `SchemaManager` (Service) (TDD: Red)
    - **Happy path**: Create valid schema (calls DDL generator), retrieve by ID, support for versioning.
    - **Unhappy path**: Duplicate name handling, database transaction rollback on DDL failure.
    - _Requirements: 1.1, 1.3_
  
  - [x] 1.2 Implement `SchemaManager` & Database Updates
    - Create `custom_schemas` table in `src/utils/database.js`.
    - Implement `createSchema(def)`, `getSchema(id)`, and `listSchemas()` in `src/services/SchemaManager.js`.
    - Implement DDL execution logic to create dynamic tables (e.g., `CREATE TABLE custom_xyz...`).
    - _Requirements: 1.3, 3.4_
  
  - [x] 1.3 Refactor & Verify
    - Ensure tests pass (Green).
    - Ensure database connection safety (transactions where possible).
    - _Requirements: 3.6_

- [ ] 2. Phase 2: Schema Generator (LLM Integration)
  - _Goal: Analyze example files and generate valid JSON schemas._
  - [x] 2.1 Write tests for `SchemaGenerator` (TDD: Red)
    - **Happy path**: Mock LLM response -> returns structured `SchemaDefinition`.
    - **Security**: Test "malicious" field names (e.g., `drop_table`, `User--`) are sanitized safely to prevent injection.
    - **Unhappy path**: Malformed LLM response -> retry logic/error; Ambiguous structure -> error.
    - _Requirements: 1.1, 1.2, 4.2_
  
  - [x] 2.2 Implement `SchemaGenerator`
    - Implement `src/services/SchemaGenerator.js`.
    - Add methods to construct the "Analysis Prompt" (sending image to LLM).
    - Implement parsing logic to convert LLM JSON to standard JSON Schema.
    - Implement field name sanitization (SQL safe names).
    - _Requirements: 1.2, 1.3_

  - [x] 2.3 Refactor & Verify
    - Ensure tests pass (Green).
    - Optimize system prompt for token usage (Cost Management consideration).
    - _Requirements: 4.1_

- [ ] 3. Phase 3: Dynamic Ingestion Pipeline
  - _Goal: Update ingestion to support "Dynamic Mode" routing._
  - [ ] 3.1 Write tests for `DynamicProcessor` + Observability (TDD: Red)
    - **Happy path**: Valid `schemaId` + file -> correct Prompt construction -> Valid SQL Insert.
    - **Observability**: Verify logs contain `SchemaID`, `FieldCausingError`, `RawValue` when validation fails.
    - **Unhappy path**: Invalid `schemaId` -> Error; LLM output mismatch -> Validation Error flag; SQL insertion failure (type mismatch).
    - _Requirements: 2.1, 2.2, 3.1, 3.5, 4.3_

  - [ ] 3.2 Implement `DynamicProcessor`
    - Create `src/utils/dynamicProcessing.js`.
    - Implement `processFileWithSchema(file, schemaId)`.
    - Implement validation logic using `ajv` or similar against the stored JSON schema.
    - Implement dynamic INSERT query builder.
    - _Requirements: 2.1, 3.1_
    
  - [ ] 3.3 Integrate with `IngestService`
    - Modify `src/services/IngestService.js` to check for `options.schemaId`.
    - If present, route to `DynamicProcessor` instead of hardcoded flows.
    - _Requirements: 2.1_

- [ ] 4. Phase 4: CLI Integration
  - _Goal: Expose new functionality via command line._
  - [ ] 4.1 Write tests for CLI commands (TDD: Red)
    - Test `th schema propose` args parsing.
    - Test `th ingest --schema` flag handling.
    - _Requirements: 1.1, 2.1_

  - [ ] 4.2 Implement `src/cli/schema.js`
    - Implement `propose` command (calls Generator).
    - Implement `list` command (calls Manager).
    - Register new commands in `bin/textharvester`.
    - _Requirements: 1.1, 2.1_

- [ ] 5. Phase 5: API Layer (for future GUI)
  - _Goal: Expose endpoints for the frontend wizard._
  - [ ] 5.1 Write tests for API Endpoints (TDD: Red)
    - **Happy path**: `POST /api/schemas/propose` returns analysis; `POST /api/schemas` persists it.
    - **Unhappy path**: Invalid payloads, missing files.
    - _Requirements: 1.1, 1.2_
  
  - [ ] 5.2 Implement Routes in `src/routes/api.js`
    - Add schema management endpoints.
    - Wire up to `SchemaManager` and `SchemaGenerator`.
    - _Requirements: 1.1_

- [ ] 7. Phase 7: Frontend Implementation (React GUI)
  - _Goal: Implement the "Schema Builder" wizard and management UI._
  - [ ] 7.1 Implement Schema Management Pages
    - Create `src/pages/SchemaList.jsx`: Table listing custom schemas (ID, Name, Date).
    - Add "Schemas" link to main navigation.
    - _Requirements: 1.1_
    
  - [ ] 7.2 Implement "New Schema" Wizard
    - Create `src/components/SchemaWizard/`:
      - **Step 1**: Multi-file upload component (Dropzone).
      - **Step 2**: Progress indicator (polling/streaming analysis status).
      - **Step 3**: Schema Editor (Form to rename fields, change types, add/remove fields).
    - _Requirements: 1.1, 1.2_
    
  - [ ] 7.3 Integrate Frontend with API
    - Connect Wizard Config (Step 3) to `POST /api/schemas`.
    - Handle success/error states (toasts).
    - _Requirements: 1.2_

  - [ ] 7.4 Update "Harvest" Page
    - Update `SourceTypeSelector` to fetch dynamic schemas from `GET /api/schemas`.
    - When a custom schema is selected, pass `schemaId` to the ingest payload.
    - _Requirements: 2.1_

- [ ] 8. Phase 8: Verification & Cleanup
  - [ ] 8.1 End-to-End Integration Test
    - Create a "Mock Document" (e.g., a simple test image).
    - Run `th schema propose` -> save schema.
    - Run `th ingest` with that schema.
    - Verify data exists in the new SQLite table.
    - _Requirements: 1.1, 2.1, 3.1_
  
  - [ ] 8.2 Documentation & Cleanup
    - Update `README.md` with new commands.
    - Ensure all temp files are cleaned up.
    - _Requirements: Non-functional_
