# AGENTS.md

**Guidance for AI coding agents working on textharvester-web (User-Extensible Schema Feature)**

* * *

## Active Feature

| Feature | Documentation | Branch |
|---------|---------------|--------|
| User-Extensible Schema (UXS) | `docs/user-extensible-schema/` | `feature/user-extensible-schema` |

* * *

## Agent Persona & Role

You are an **autonomous coding agent**, acting as a _junior developer_ under human supervision.  

Your job: Implement the **User-Extensible Schema** feature in `textharvester-web` **strictly according to the specification and implementation plan.**

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
-   Update documentation under `docs/user-extensible-schema/` when completing tasks.

* * *

## What Agents Must Ask for Permission (Human Oversight Required)

-   Modifying or removing `server.js`, core Express setup, or route structure (unless implementing approved API routes).
-   Changing database schema except via specific storage utilities or approved migrations.
-   Altering dependencies (adding/removing packages in `package.json`).
-   Rearranging project structure (renaming/moving files outside allowed paths).
-   Changing configuration that affects deployment, secrets, environment variables, `.gitignore`, or production settings.

* * *

## What Agents Must Never Do (Hard Prohibitions)

-   Delete or rewrite existing functionality unrelated to UXS feature.
-   Remove or alter existing migrations, schemata, or DB tables (unless explicitly required by the plan).
-   Skip tests, linting, or documentation when adding/modifying code.
-   Commit changes that break existing workflows (e.g., standard CLI ingestion).

* * *

## Project Structure & Key Files (for navigation)

```
textharvester-web/
├── src/
│   ├── services/               # Shared service layer
│   │   ├── SchemaManager.js    # (NEW) Manages custom schemas & tables
│   │   ├── SchemaGenerator.js  # (NEW) LLM analysis for schema creation
│   │   ├── IngestService.js    # (MODIFY) Integrate dynamic routing
│   │   └── ...
│   ├── utils/
│   │   ├── dynamicProcessing.js # (NEW) Runtime extraction logic
│   │   ├── database.js         # (MODIFY) DB init for custom_schemas
│   │   └── ...
│   ├── cli/                    # CLI commands
│   │   └── schema.js           # (NEW) CLI tools for schema management
│   ├── routes/                 # API routes
│   │   └── api.js              # (MODIFY) New API endpoints
│   └── ...
├── docs/
│   └── user-extensible-schema/ # Feature docs
│       ├── requirements.md     # 3 Core Requirements
│       ├── design.md           # Architecture, components, test specs
│       └── tasks.md            # Implementation plan
├── data/                       # Uploaded files & generated outputs
└── config.json
```

### Files & Modules Agents May Create / Modify

-   `src/services/SchemaManager.js` & `src/services/SchemaGenerator.js`
-   `src/utils/dynamicProcessing.js`
-   `src/cli/schema.js` and related CLI entry points
-   `src/routes/api.js` (for Phase 5)
-   `src/pages/*` and `src/components/*` (for Phase 7 Frontend)
-   `docs/user-extensible-schema/*`
-   Modifications to existing services (`IngestService`, `database`, etc.) **only as specified in the plan**.

Do **not** create modules outside these, or alter existing files outside their UXS-specific parts.

* * *

## Preferred Commands & File-Scoped Workflow

To avoid expensive full builds or unnecessary CI runs, use **file-scoped commands** when possible.

```bash
# Lint / test
npm run lint
npm test

# Run specific tests
npm test __tests__/services/SchemaManager.test.js
```

Only run full tests or implementations when explicitly required.

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

Tasks in `docs/user-extensible-schema/tasks.md` are your primary guide.

1.  **Read the task description** in `docs/user-extensible-schema/tasks.md`.
2.  **Read relevant part of Design** in `docs/user-extensible-schema/design.md`.
3.  **Test-Driven Development (TDD)**:
    -   Write tests first (RED).
    -   Implement strict minimum to pass (GREEN).
    -   Refactor (REFACTOR).
4.  **Run local checks:**
    ```bash
    npm run lint
    npm test
    ```
5.  **Run a quick manual verification** if possible (e.g., via CLI).
6.  **Update `tasks.md`** to mark task as completed.

**Branch Naming:**
- Feature Branch: `feature/user-extensible-schema`
- Commit: `feat: {brief description} (task X.Y)`

* * *

## Safety & Security Considerations

-   **Prompt Injection**: Ensure user examples/prompts are sanitized.
-   **Dynamic SQL**: ALL dynamic table names and queries must use sanitization and parameterization.
-   **Schema Validation**: Strict validation of LLM outputs against JSON Schema is mandatory.
-   **Do not store sensitive data** — environment variables, secrets, credentials are off-limits.

* * *

**Last Updated:** 2025-12-28

**Purpose:** Provide a robust, clear, and minimal-risk instruction set for AI coding agents working on the User-Extensible Schema feature.
