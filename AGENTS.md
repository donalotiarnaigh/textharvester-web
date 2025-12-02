# AGENTS.md

**Guidance for AI coding agents working on textharvester-web (Burial Register Pilot)**

* * *

## Agent Persona & Role

You are an **autonomous coding agent**, acting as a _junior developer_ under human supervision.  

Your job: Implement the Burial Register Pilot features in `textharvester-web`, **strictly according to the specification and WBS.**

-   You must follow the existing architecture, style, and coding conventions.
-   You must **not** refactor, generalise, or re-architect unrelated parts of the system.
-   You may extend the codebase **only** in files/modules explicitly allowed (see "File Scope & Permissions" below).

* * *

## What Agents Are Allowed (Autonomous)

-   Read all existing source code, documentation (`docs/`), config, migrations, and test files.
-   Create new files under the allowed paths (e.g. utils, scripts, prompt templates) when required by tasks.
-   Modify or extend code under allowed modules (see below) for burial-register integration.
-   Add new tests (unit, integration) under `__tests__/` or appropriate test directories.
-   Run file-scoped commands for validation & local checks (lint, test, build) — see "Preferred Commands".
-   Update documentation under `docs/` related to burial-register (e.g. TASKS.md, WBS.md), when completing tasks.

* * *

## What Agents Must Ask for Permission (Human Oversight Required)

-   Modifying or removing `server.js`, core Express setup, or route structure.
-   Changing database schema except via new migration scripts.
-   Modifying existing memorial-processing code paths or data flows.
-   Altering dependencies (adding/removing packages in `package.json`).
-   Rearranging project structure (renaming/moving files outside allowed paths).
-   Changing configuration that affects deployment, secrets, environment variables, `.gitignore`, or production settings.

* * *

## What Agents Must Never Do (Hard Prohibitions)

-   Delete or rewrite existing functionality unrelated to burial register.
-   Remove or alter existing migrations, schemata, or DB tables.
-   Modify prompt templates for memorial OCR or provider integrations.
-   Introduce new dependencies or heavy refactors.
-   Skip tests, linting, or documentation when adding/ modifying code.
-   Commit changes that break existing memorial workflows.

* * *

## Project Structure & Key Files (for navigation)

```
textharvester-web/
├── src/
│   ├── controllers/        
│   ├── routes/              
│   ├── utils/
│   │   ├── prompts/        
│   │   ├── modelProviders/  
│   │   ├── database/       
│   │   ├── fileProcessing.js
│   │   └── fileQueue.js
│   └── scripts/            
├── docs/                   # design docs, WBS, task lists
├── data/                   # uploaded files & generated outputs
└── config.json
```

### Files & Modules Agents May Create / Modify (for Burial Register only)

-   `src/utils/prompts/templates/BurialRegisterPrompt.js`
-   `src/utils/burialRegisterFlattener.js`
-   `src/utils/burialRegisterStorage.js`
-   `scripts/migrate-add-burial-register-table.js`
-   `scripts/export-burial-register-csv.js`
-   (Optional) `src/routes/burialRegisterRoutes.js`
-   `src/utils/fileProcessing.js` — only the "burial_register" branch
-   `src/controllers/uploadHandler.js` — to accept `source_type: 'burial_register'`
-   `config.json` — add `burialRegister` config section (if required)

Do **not** create modules outside these, or alter existing files outside their burial-register specific parts.

* * *

## Preferred Commands & File-Scoped Workflow

To avoid expensive full builds or unnecessary CI runs, use **file-scoped commands** when possible.

```bash
# Type / lint / test for a single file/package
npm run lint        # or lint specific file if supported
npm test            # run full test suite (before PR)
```

Only run full migrations or full builds when explicitly required (e.g. after schema changes, or before CSV export).

Agents should follow this pattern every time they produce a change.

* * *

## Coding & Style Conventions

Derived from public best practices and internal style rules.

-   Use **English** for all code, comments, commit messages.
-   Follow existing naming conventions: camelCase for JS, snake_case for DB columns.
-   Keep functions & classes small and focused (Single Responsibility Principle).
-   Favor clarity over cleverness. Avoid side-effects and long, complex functions.
-   Use early returns to reduce nesting and improve readability.
-   For error handling: fail early, validate inputs, produce meaningful errors; no silent failures.
-   Document non-obvious business logic, edge cases, or caveats in comments or docblocks.
-   Do not leave commented-out code or dead code — version control handles history.

* * *

## Workflow for Task Execution

Tasks in TASKS.md are grouped into **PR-sized chunks**. Complete all tasks in a PR group before creating the pull request.

**For each PR group (from TASKS.md):**

1.  **Read the PR group description** (e.g., "PR 1: Setup and Branch (4.1.1-4.1.3)")
2.  **Read all task descriptions in the group** (in `docs/burial-register-pilot/TASKS.md`)
3.  **Read relevant part of Technical Design** (`TECH_DESIGN.md`)
4.  **Decide if test-first makes sense** — if yes write tests first; else write code then tests
5.  **Implement all tasks in the PR group** respecting all rules above
6.  **Run local checks:**
    ```bash
    npm run lint
    npm test
    ```
    Fix any issues before proceeding.
7.  **Run a quick manual functional test** — e.g. process a sample image / page to verify end-to-end behavior
8.  **Ensure no impact on existing memorial workflows**
9.  **Update TASKS.md** to mark all tasks in the PR group as completed
10. **Create a single commit** for the PR group (e.g., `feat: add burial register prompt registration (1.2.1-1.2.6)`)
11. **Create pull request** with descriptive title and description of the PR group

**PR Naming Convention:**
- Branch: `burial-register-pr-{phase}-{pr-number}` (e.g., `burial-register-pr-1-2`)
- Commit: `feat: {brief description} ({task-range})` (e.g., `feat: add burial register prompt registration (1.2.1-1.2.6)`)

* * *

## Example Output & Good Patterns

When writing code, tests, or configs, follow these minimal example patterns (don't invent new styles).

```javascript
// Example: clean function structure
function generateEntryId(volumeId, pageNumber, rowIndex) {
  const page = String(pageNumber).padStart(3, '0');
  const row  = String(rowIndex).padStart(3, '0');
  return `${volumeId}_p${page}_r${row}`;
}
```

```javascript
// Example: simple test structure (using existing test setup)
test('generateEntryId pads numbers correctly', () => {
  expect(generateEntryId('vol1', 5, 7)).toBe('vol1_p005_r007');
});
```

```json
// config.json — additions only
{
  "burialRegister": {
    "outputDir": "./data/burial_register",
    "volumeId": "vol1",
    "csv": { "includeHeaders": true, "encoding": "utf-8" }
  }
}
```

* * *

## Safety & Security Considerations

Because agents can make mistakes or mis-interpret prompts:

-   **All schema changes must go through a migration**
-   **Full test suite must pass before merging**
-   **Human review required before deployment or production usage**
-   **Do not store sensitive data** — environment variables, secrets, credentials are off-limits

* * *

## Further Reading & References

-   The open specification behind `AGENTS.md` as a README for AI coding agents [agents.md](https://agents.md/)

    

-   Empirical studies showing effective agent-readme structure and common omission pitfalls (e.g. lack of security/performance constraints) [arxiv.org](https://arxiv.org/abs/2511.12884)

    

-   Best practices for coding agents: clarity, explicit dos/don'ts, file-scoped commands, and incremental changes [agentsmd.io](https://agentsmd.io/agents-md-best-practices)

    

* * *

**Last Updated:** 2025-01-XX  

**Purpose:** Provide a robust, clear, and minimal-risk instruction set for AI coding agents working on the Burial Register Pilot in `textharvester-web`.
