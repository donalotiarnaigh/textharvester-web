# AGENTS.md

**Guidance for AI coding agents working on textharvester-web (CLI Feature)**

* * *

## Active Feature

| Feature | Documentation | Branch | Status |
|---------|---------------|--------|--------|
| CLI (Command Line Interface) | `docs/cli/` | `feature/cli` | Planning Complete |

* * *

## Agent Persona & Role

You are an **autonomous coding agent**, acting as a _junior developer_ under human supervision.  

Your job: Implement the CLI feature in `textharvester-web` **strictly according to the specification and implementation plan.**

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
-   Update documentation under `docs/cli/` when completing tasks.

* * *

## What Agents Must Ask for Permission (Human Oversight Required)

-   Modifying or removing `server.js`, core Express setup, or route structure.
-   Changing database schema except via specific storage utilities.
-   Altering dependencies (adding/removing packages in `package.json`).
-   Rearranging project structure (renaming/moving files outside allowed paths).
-   Changing configuration that affects deployment, secrets, environment variables, `.gitignore`, or production settings.

* * *

## What Agents Must Never Do (Hard Prohibitions)

-   Delete or rewrite existing functionality unrelated to CLI feature.
-   Remove or alter existing migrations, schemata, or DB tables.
-   Skip tests, linting, or documentation when adding/modifying code.
-   Commit changes that break existing workflows.

* * *

## Project Structure & Key Files (for navigation)

```
textharvester-web/
├── bin/
│   └── textharvester           # CLI entry point (NEW)
├── src/
│   ├── cli/                    # CLI-specific code (NEW)
│   │   ├── commands/           # Subcommand modules
│   │   ├── config.js           # Config loading
│   │   ├── output.js           # Output formatting
│   │   └── errors.js           # CLI error classes
│   ├── services/               # Shared service layer (NEW)
│   │   ├── IngestService.js
│   │   ├── QueryService.js
│   │   ├── ExportService.js
│   │   └── SystemService.js
│   ├── controllers/            # Existing (refactor to use services)
│   ├── routes/                 # Existing
│   └── utils/                  # Existing core utilities
├── docs/
│   └── cli/                    # CLI feature docs
│       ├── requirements.md     # 8 requirements, 56 acceptance criteria
│       ├── design.md           # Architecture, components, test specs
│       └── tasks.md            # Implementation plan (37 tasks)
├── data/                       # Uploaded files & generated outputs
└── config.json
```

### Files & Modules Agents May Create / Modify

-   `bin/textharvester` — CLI entry point
-   `src/cli/*` — all CLI-specific modules
-   `src/services/*` — shared service layer
-   `src/controllers/*.js` — refactor to use services (with care)
-   `docs/cli/*` — CLI documentation

Do **not** create modules outside these, or alter existing files outside their CLI-specific parts.

* * *

## Preferred Commands & File-Scoped Workflow

To avoid expensive full builds or unnecessary CI runs, use **file-scoped commands** when possible.

```bash
# Lint / test
npm run lint
npm test

# CLI-specific testing (once implemented)
./bin/textharvester --help
./bin/textharvester --version
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

Tasks in `docs/cli/tasks.md` are your primary guide.

1.  **Read the task description** in `docs/cli/tasks.md`.
2.  **Read relevant part of Design** in `docs/cli/design.md`.
3.  **Test-Driven Development (TDD)**:
    -   Write tests first (RED).
    -   Implement strict minimum to pass (GREEN).
    -   Refactor (REFACTOR).
4.  **Run local checks:**
    ```bash
    npm run lint
    npm test
    ```
5.  **Run a quick manual verification** if possible.
6.  **Update `tasks.md`** to mark task as completed.

**Branch Naming:**
- Feature Branch: `feature/cli`
- Commit: `feat: {brief description} (task X.Y)`

* * *

## Example Output & Good Patterns

```javascript
// Example: Service layer pattern
class IngestService {
  async ingest(pattern, options) {
    const files = await this.expandPattern(pattern);
    if (files.length === 0) {
      throw new CLIError('NO_FILES_MATCHED', `No files matched: ${pattern}`);
    }
    // ... process files
  }
}
```

```javascript
// Example: CLI error handling
class CLIError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
  toJSON() {
    return { success: false, error_code: this.code, message: this.message };
  }
}
```

* * *

## Safety & Security Considerations

-   **All schema changes must go through the storage utility**
-   **Full test suite must pass before merging**
-   **Human review required before deployment or production usage**
-   **Do not store sensitive data** — environment variables, secrets, credentials are off-limits

* * *

**Last Updated:** 2025-12-15  

**Purpose:** Provide a robust, clear, and minimal-risk instruction set for AI coding agents working on the TextHarvester CLI feature.
