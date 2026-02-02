# AI Agent Kickoff Prompt: Typographic Analysis Feature

Use this prompt to start a new unit of work for the Typographic Analysis feature.

Reference: **AGENTS.md** and **docs/typographic-analysis/tasks.md**.

1. **Identify the Next Task**:
   - Read **docs/typographic-analysis/tasks.md**.
   - Pick the **first unchecked task** (e.g., `[ ] 1.1 ...`) and restate it in one sentence.
   - Ensure you are on the feature branch: `feature/typographic-analysis`.

2. **Create a Plan Artifact** for that task:
   - **Goal & Scope**: What exactly are we building/testing?
   - **Files to Change**: List specific files.
   - **Assumptions/Risks**: Any dependencies or edge cases?
   - **Acceptance Criteria**: Reference the specific requirement IDs from `docs/typographic-analysis/requirements.md`.
   - **Test Specification**: Exact command(s) to run (e.g., `npm test __tests__/utils/prompts/templates/TypographicAnalysisPrompt.test.js`).
   - **Step-by-Step Approach**: Detailed micro-steps (Write Test → Fail → Implement → Pass → Refactor).

3. **Implement (TDD Workflow)**:
   - **RED**: Write the test first (both happy and unhappy paths). Validate it fails.
   - **GREEN**: Write the minimal code to pass the test.
   - **REFACTOR**: Clean up code and add comments.
   - Make small, logical commits (e.g., `feat: add migration tests for typographic analysis (Task 1.1)`).

4. **Verify**:
   - Run the specific test suite: `npm test <test-file>`.
   - Run linting: `npm run lint`.
   - If user-facing, validate in runtime environment (Local Server upload).
   - Add a short **Test Results** section to your Plan Artifact (or a separate note).

5. **Update Documentation**:
   - Mark the task as `[x]` in **docs/typographic-analysis/tasks.md**.
   - Update `task.md` (active brain memory) to reflect progress.

6. **Finalize**:
   - Push the branch: `git push origin feature/typographic-analysis`.
   - Notify the user of completion.

**Constraints**:
- Do not run destructive commands (rm -rf) without asking.
- Do not touch files unrelated to the specific task (see `AGENTS.md` scope).
- Always use absolute paths for file operations.
- Use mechanical/botanical terminology per the Domain Terminology table in AGENTS.md.
