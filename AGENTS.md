# AGENTS.md

**Guidance for AI coding agents working on textharvester-web**

* * *

## Current Status

There is **no active feature branch**. Work from the issue or task you have been given — do not go looking for preset feature work.

**Completed (do not redo):** Typographic Analysis is shipped and merged on `main`. All 34 tasks in `docs/typographic-analysis/tasks.md` are done and the `feature/typographic-analysis` branch is a stale leftover, not pending work. Its documentation under `docs/typographic-analysis/` is retained as a reference for the shipped implementation.

**System context:** Before starting, read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system overview, module map, and data flow.

* * *

## Agent Persona & Role

You are an **autonomous coding agent**, acting as a _junior developer_ under human supervision.  

Your job: implement the task you have been given **strictly according to its specification and implementation plan.**

-   You must follow the existing architecture, style, and coding conventions.
-   You must **not** refactor, generalise, or re-architect unrelated parts of the system.
-   You may extend the codebase **only** within the scope of the task you were given (see "What Agents Must Ask for Permission" below).

* * *

## What Agents Are Allowed (Autonomous)

-   Read all existing source code, documentation (`docs/`), config, and test files.
-   Create new files when the task requires them.
-   Modify or extend code within the task's scope.
-   Add new tests (unit, integration) under `__tests__/` or appropriate test directories.
-   Run file-scoped commands for validation & local checks (lint, test, build) — see "Preferred Commands".
-   Update the documentation covering the code you changed.

* * *

## What Agents Must Ask for Permission (Human Oversight Required)

-   Modifying or removing `server.js`, core Express setup, or route structure (unless implementing approved API routes).
-   Changing database schema except via an approved migration script.
-   Altering dependencies (adding/removing packages in `package.json`) — including `allowScripts` entries.
-   Rearranging project structure (renaming/moving files).
-   Changing configuration that affects deployment, secrets, environment variables, `.gitignore`, or production settings.

* * *

## What Agents Must Never Do (Hard Prohibitions)

-   Delete or rewrite existing functionality unrelated to the task you were given.
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
│   │   ├── uploadHandler.js      # Request intake and source-type routing
│   │   └── resultsManager.js     # API response shaping
│   ├── utils/
│   │   ├── database.js           # DB access and JSON field serialization
│   │   ├── fileProcessing.js     # Per-source-type processing dispatch
│   │   └── prompts/
│   │       └── templates/
│   │           ├── TypographicAnalysisPrompt.js  # Typographic Analysis template
│   │           └── providerTemplates.js          # Template registry
│   └── ...
├── bin/textharvester             # CLI entry point
├── scripts/                      # Migration and maintenance scripts
├── __tests__/                    # Unit and integration tests
├── docs/
│   ├── ARCHITECTURE.md           # System overview — read this first
│   └── typographic-analysis/     # Shipped feature reference (requirements, design, tasks)
├── public/
│   └── index.html                # Web UI, including the source-type dropdown
└── data/                         # Uploaded files & generated outputs
```

### Scope Rule

Work within the files the task calls for. Do **not** create modules outside the task's scope, or alter existing files outside the parts the task covers. Anything in the permission categories above needs a human first.

* * *

## Preferred Commands & File-Scoped Workflow

To avoid expensive full builds or unnecessary CI runs, use **file-scoped commands** when possible.

```bash
# Lint / test
npm run lint
npm test

# Run a single test file (much faster than the full suite)
npm test __tests__/utils/database.test.js
npm test __tests__/controllers/resultsManager.test.js

# Run a migration or maintenance script
node scripts/<script-name>.js
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

The issue or task description you were given is your primary guide. Do **not** go looking for work in `docs/typographic-analysis/tasks.md` — that plan is fully complete.

1.  **Read the task description** and any linked specification or design notes.
2.  **Read the relevant code before changing it.** Follow the existing patterns.
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

**Branch Naming:**
- Feature branch: `feature/{short-description}`; bug fix: `fix/{issue-number}-{short-description}`
- Commit: Conventional Commits — `feat: …`, `fix: …`, `docs: …`, `chore: …`
- `main` requires the `lint` and `test` checks to pass; PRs are squash-merged.

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

**Last Updated:** 2026-09-20

**Purpose:** Provide a robust, clear, and minimal-risk instruction set for AI coding agents working on this repository.

## Testing Guidelines

When implementing backend features:
- Run full test suite: `npm test`
- For database-backed features, review patterns in existing tests under `src/**/__tests__/` and `__tests__/`
- Check that your changes don't break existing tests before committing
