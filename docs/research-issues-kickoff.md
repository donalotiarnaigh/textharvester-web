# AI Agent Kickoff Prompt: Research Issues Implementation

Use this prompt to start a new unit of work for any of the 6 research issues in the implementation roadmap.

Reference: **IMPLEMENTATION_ROADMAP.md**, **AGENTS.md**, and **issues.md**.

---

## 1. Identify the Next Issue

- Read **IMPLEMENTATION_ROADMAP.md** to understand the 6 issues, dependencies, and recommended sequencing.
- Pick the **next issue** in the current phase (consult the roadmap's "Recommended Implementation Order").
- Look up the **full issue details** in **issues.md** (search for `# Issue #NNN` or the issue number).
- Restate the issue in one sentence: what are we building and why?
- Ensure you are on the **feature branch** for that issue (e.g., `fix/issue-206-schema-constraints`).

---

## 2. Create a Plan Artifact

For each issue, draft a plan covering:

### Goal & Scope
- What exactly are we building/testing?
- Which issue(s) does this unblock or depend on?
- Any breaking changes or API surface changes?

### Files to Change
- List specific files (absolute paths, existing or new modules).
- Distinguish between core code, tests, config, and CLI changes.

### Assumptions / Risks / Dependencies
- External dependencies (e.g., Langfuse SDK, historical date parsers)?
- Breaking changes (e.g., provider API restructuring for #206)?
- Provider conflicts (e.g., #206 vs #222 sequencing)?
- Integration points with existing validation/audit pipeline?

### Acceptance Criteria
- Reference the specific issue number and roadmap phase.
- What does "done" look like? (e.g., "all tests pass", "cost reduction measured", "integration with validation_warnings pipeline").
- Define measurable outcomes (e.g., "CCR detection catches 95% of hallucinations in test set").

### Test Specification
- Exact command(s) to run: `npm test <test-file>`.
- Include both happy-path and edge cases.
- For cost/caching issues: define cost measurement strategy (e.g., capture token counts before/after).

### Step-by-Step Approach
- Detailed micro-steps: Write Test → Fail → Implement → Pass → Refactor.
- For infrastructure issues (#206, #222): identify which provider(s) to tackle first, then replicate.

---

## 3. Implement (TDD Workflow)

### RED: Write Tests First
- Unit tests for core logic (validation rules, parser, degenerate detection, etc.).
- Integration tests for pipeline insertion (e.g., validation_warnings threaded through fileProcessing.js).
- For multi-provider issues (#206, #222): test all three providers (OpenAI, Anthropic, Gemini).
- Validate tests fail before writing code.

### GREEN: Write Minimal Code
- Implement the feature to make tests pass.
- Plug into existing infrastructure (e.g., validation_warnings, applyValidationWarnings(), confidence scores).
- For database changes: add migrations inline (see memory: "DB migrations" pattern).

### REFACTOR: Clean Up
- Remove duplication.
- Add clarifying comments where logic is non-obvious.
- Lint and type-check.

### Commits
- Small, logical commits with issue reference: `fix: add date arithmetic validation (#216)`.
- Test first, then implementation, then integration.

---

## 4. Verify

- **Run tests**: `npm test <test-file>` for your new tests.
- **Full test suite**: `npm test` (all 1256+ tests should pass).
- **Linting**: `npm run lint`.
- **Cost measurement** (if applicable): Compare token counts / API calls before and after.
- **Integration check**: Ensure validation_warnings / needs_review / confidence_scores flow through the full pipeline.
- **Add a "Test Results" section** to your Plan Artifact documenting coverage and findings.

---

## 5. Update Documentation

- Mark the issue as **completed** in **IMPLEMENTATION_ROADMAP.md** — update the status column in the issues table and note the PR number and merge date.
- Update **issues.md** entry for the issue — change `**Status**: Investigated` to `**Status**: ✅ Implemented — PR #NNN, merged YYYY-MM-DD` and add a `**Branch**:` line. Also update the summary table row if one exists.
- Update any relevant **AGENTS.md** sections (provider patterns, validation pipeline, etc.).
- Update **MEMORY.md** with new patterns or patterns that deviate from earlier issues.

---

## 6. Finalize

- **Push the branch**: `git push origin fix/issue-NNN-<description>`.
- **Create a PR**: Title format: `fix: <short description> (#NNN)`. Reference the roadmap phase in the PR body.
- **Notify the user** of completion and next steps.

---

## Constraints

- Do **not** implement out of order (check dependencies in IMPLEMENTATION_ROADMAP.md).
- Do **not** run destructive commands without asking.
- Do **not** touch files unrelated to the specific issue.
- Always use **absolute paths** for file operations.
- Use **mechanical/botanical terminology** per the Domain Terminology table in AGENTS.md.
- For **breaking changes** (especially #206 provider restructuring): confirm scope with user before implementing.

---

## Issue-Specific Guidance

### Phase 1: Validation & Data Quality (#215, #216, #213)

**Common pattern**: Deterministic post-extraction checks that feed `validation_warnings` and `needs_review`.

- **#215 (Historical date parsing)**: Standalone `historicalDateParser.js` module. No provider changes.
- **#216 (Cross-field validation)**: Reuses #215's parser. Adds rules to `MemorialOCRPrompt` and `BurialRegisterPrompt` `validateAndConvert()`.
- **#213 (Degenerate detection)**: Threads `rawResponse` from providers. Checks CCR, entropy, length ratio. Plugs into `applyValidationWarnings()`.

### Phase 2: Provider Optimization (#206, #222)

**Common pattern**: Modify all three providers (OpenAI, Anthropic, Gemini).

- **#206 (Schema constraints)**: Restructures Anthropic to use tool-use (tools + tool_choice). OpenAI and Gemini use native JSON schema. **Highest impact, implement first.**
- **#222 (Prompt caching)**: Adds cache_control to system prompt blocks (OpenAI) and content block in tool definition (Anthropic post-#206). Requires config section for cache TTL.

### Phase 3: Evaluation & Learning (#219)

**Common pattern**: Consumes signals from Phases 1 & 2.

- **#219 (Active learning loop)**: Disagreement score from `confidenceScores` + `validationWarnings`. Export annotations. Optional Langfuse integration.

---

## Template: Issue Task Summary

```
## Issue #NNN: [Short Title]

**Phase**: [1/2/3]
**Status**: In Progress
**Branch**: `fix/issue-NNN-<description>`

### Goal
[One-sentence description of the issue]

### Files to Change
- [ ] src/utils/...
- [ ] src/providers/...
- [ ] __tests__/...

### Dependencies
- Blocks: [other issues, if any]
- Blocked by: [#NNN, #NNN, etc.]

### Test Results
- Unit tests: ✅ X passed
- Integration: ✅ All 1256+ tests passing
- Linting: ✅ Clean

### Next Steps
[After this issue, implement...]
```
