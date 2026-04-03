# AGENTS.md

**Guidance for AI coding agents working on textharvester-web (Typographic Analysis Feature)**

* * *

## Active Feature

| Feature | Documentation | Branch |
|---------|---------------|--------|
| Typographic Analysis | `docs/typographic-analysis/` | `feature/typographic-analysis` |

* * *

## Agent Persona & Role

You are an **autonomous coding agent**, acting as a _junior developer_ under human supervision.  

Your job: Implement the **Typographic Analysis** feature in `textharvester-web` **strictly according to the specification and implementation plan.**

This feature adds a new source type that produces comprehensive transcriptions with detailed typography, iconography, and stone condition analysis — following the client's "Gravestone OCR V2.3" approach.

-   You must follow the existing architecture, style, and coding conventions.
-   You must **not** refactor, generalise, or re-architect unrelated parts of the system.
-   You may extend the codebase **only** in files/modules explicitly allowed (see "File Scope & Permissions" below).

* * *

## What Agents Are Allowed (Autonomous)

-   Read all existing source code, documentation (`docs/`), config, and test files.
-   Create new files under the allowed paths when required by tasks.
-   Modify or extend code under allowed modules (see below).
-   Add new tests (unit, integration) under `__tests__/` or appropriate test directories.
-   Run file-scoped commands for validation & local checks (lint, test, build) — see "Preferred Commands".
-   Update documentation under `docs/typographic-analysis/` when completing tasks.

* * *

## What Agents Must Ask for Permission (Human Oversight Required)

-   Modifying or removing `server.js`, core Express setup, or route structure (unless implementing approved API routes).
-   Changing database schema except via the approved migration script (`scripts/migrate-add-typographic-analysis.js`).
-   Altering dependencies (adding/removing packages in `package.json`).
-   Rearranging project structure (renaming/moving files outside allowed paths).
-   Changing configuration that affects deployment, secrets, environment variables, `.gitignore`, or production settings.

* * *

## What Agents Must Never Do (Hard Prohibitions)

-   Delete or rewrite existing functionality unrelated to Typographic Analysis feature.
-   Remove or alter existing prompt templates (MemorialOCRPrompt, MonumentPhotoOCRPrompt, etc.).
-   Skip tests, linting, or documentation when adding/modifying code.
-   Commit changes that break existing workflows (e.g., standard memorial OCR, burial register processing).
-   Use interpretive labels instead of mechanical descriptions in prompt instructions (e.g., "flower" vs "ribbed volutes").

* * *

## Project Structure & Key Files (for navigation)

```
textharvester-web/
├── src/
│   ├── controllers/
│   │   ├── uploadHandler.js      # (MODIFY) Add typographic_analysis routing
│   │   └── resultsManager.js     # (MODIFY) Include new fields in API response
│   ├── utils/
│   │   ├── database.js           # (MODIFY) Add JSON serialization for new fields
│   │   ├── fileProcessing.js     # (MODIFY) Add case for typographic_analysis
│   │   └── prompts/
│   │       └── templates/
│   │           ├── TypographicAnalysisPrompt.js  # (NEW) Main prompt template
│   │           └── providerTemplates.js          # (MODIFY) Register new template
│   └── ...
├── scripts/
│   └── migrate-add-typographic-analysis.js  # (NEW) Database migration
├── __tests__/
│   ├── utils/prompts/templates/
│   │   └── TypographicAnalysisPrompt.test.js  # (NEW) Prompt tests
│   ├── scripts/
│   │   └── migrate-typographic-analysis.test.js  # (NEW) Migration tests
│   └── ...
├── docs/
│   └── typographic-analysis/     # Feature docs
│       ├── requirements.md       # 5 Requirements with acceptance criteria
│       ├── design.md             # Architecture, components, test specs
│       └── tasks.md              # Implementation plan (TDD)
├── public/
│   └── index.html                # (MODIFY) Add source type option
└── data/                         # Uploaded files & generated outputs
```

### Files & Modules Agents May Create / Modify

**New Files:**
-   `src/utils/prompts/templates/TypographicAnalysisPrompt.js`
-   `scripts/migrate-add-typographic-analysis.js`
-   `__tests__/utils/prompts/templates/TypographicAnalysisPrompt.test.js`
-   `__tests__/scripts/migrate-typographic-analysis.test.js`

**Modifications (as specified in tasks.md):**
-   `src/utils/database.js` — Add new columns handling and JSON serialization
-   `src/utils/fileProcessing.js` — Add routing for `typographic_analysis` source type
-   `src/utils/prompts/templates/providerTemplates.js` — Register new template
-   `src/controllers/resultsManager.js` — Include new fields in API response
-   `src/controllers/uploadHandler.js` — Route new source type
-   `public/index.html` — Add "Typographic Analysis" to source type dropdown
-   `docs/typographic-analysis/*` — Update as tasks are completed

Do **not** create modules outside these, or alter existing files outside their Typographic Analysis-specific parts.

* * *

## Preferred Commands & File-Scoped Workflow

To avoid expensive full builds or unnecessary CI runs, use **file-scoped commands** when possible.

```bash
# Lint / test
npm run lint
npm test

# Run specific tests
npm test __tests__/utils/prompts/templates/TypographicAnalysisPrompt.test.js
npm test __tests__/scripts/migrate-typographic-analysis.test.js
npm test __tests__/utils/database.test.js
npm test __tests__/controllers/resultsManager.test.js

# Run migration
node scripts/migrate-add-typographic-analysis.js
```

Only run full tests or implementations when explicitly required.

* * *

## Testing Features Manually

### Testing Database-Backed Features

For features that modify the database schema or storage layers (e.g., `processing_id` correlation IDs), use the provided test scripts to safely verify functionality without risking sample data.

**Example: Testing processing_id Feature**

The `processing_id` feature adds request correlation IDs. Test it safely:

```bash
# Dry run (preview without API calls)
./test-processing-id.sh --dry-run

# Test with all record types
./test-processing-id.sh

# Test specific record type
./test-processing-id.sh --type memorial --provider openai --verbose

# Full documentation
cat docs/testing-processing-id.md
```

**Key Points:**
- Sample data in `sample_data/source_sets/` is never modified
- Test files are copied to `/tmp/` for processing
- Files are auto-deleted after processing (expected behavior)
- Database storage is verified automatically
- Original sample data can be regenerated anytime

For details on manually testing database-backed features, see `docs/testing-processing-id.md`.

* * *

## Coding & Style Conventions

-   Use **English** for all code, comments, commit messages.
-   Follow existing naming conventions: camelCase for JS, snake_case for DB columns.
-   Keep functions & classes small and focused (Single Responsibility Principle).
-   Favor clarity over cleverness. Avoid side-effects and long, complex functions.
-   Use early returns to reduce nesting and improve readability.
-   For error handling: fail early, validate inputs, produce meaningful errors; no silent failures.
-   Document non-obvious business logic, edge cases, or caveats in comments or docblocks.
-   Do not leave commented-out code or dead code.

* * *

## Workflow for Task Execution

Tasks in `docs/typographic-analysis/tasks.md` are your primary guide.

1.  **Read the task description** in `docs/typographic-analysis/tasks.md`.
2.  **Read relevant part of Design** in `docs/typographic-analysis/design.md`.
3.  **Test-Driven Development (TDD)**:
    -   Write tests first (RED) — include **both happy and unhappy paths**.
    -   Implement strict minimum to pass (GREEN).
    -   Refactor (REFACTOR).
4.  **Run local checks:**
    ```bash
    npm run lint
    npm test
    ```
5.  **Run a quick manual verification** if possible (e.g., via local server upload).
6.  **Update `tasks.md`** to mark task as completed with `[x]`.

**Branch Naming:**
- Feature Branch: `feature/typographic-analysis`
- Commit: `feat: {brief description} (task X.Y)`

* * *

## Domain-Specific Terminology

When writing prompts and validation logic, use these conventions:

| ❌ Avoid (Interpretive) | ✅ Use (Mechanical/Botanical) |
|------------------------|------------------------------|
| flower, rosette | concentric circles, ribbed volutes |
| heart-shaped | cordate |
| ivy | undulating vine |
| decorative border | border foliage |
| old-fashioned f | long-s (ſ) |
| ye olde | thorn (þ) |

* * *

## Safety & Security Considerations

-   **Input Validation**: Validate all AI responses against the defined JSON schema before storage.
-   **JSON Serialization**: Use try/catch when serializing/deserializing JSON fields.
-   **Backward Compatibility**: New columns must be nullable; existing workflows must not break.
-   **Historical Characters**: Preserve Unicode characters (ſ, þ) without HTML encoding or escaping.
-   **Do not store sensitive data** — environment variables, secrets, credentials are off-limits.

* * *

**Last Updated:** 2026-03-09

**Purpose:** Provide a robust, clear, and minimal-risk instruction set for AI coding agents working on the Typographic Analysis feature and other backend enhancements.

## Testing Guidelines

When implementing backend features:
- Run full test suite: `npm test`
- For database-backed features, review patterns in existing tests under `src/**/__tests__/` and `__tests__/`
- Check that your changes don't break existing tests before committing
