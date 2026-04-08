# Issue #213: Degenerate Output Detection

**Phase**: 1
**Status**: Completed locally
**Branch**: `fix/issue-213-degenerate-output-detection`

### Goal
Implement deterministic post-extraction degenerate-output detection so fluent hallucinations that pass schema validation are surfaced through `validation_warnings` and `needs_review` without adding API calls.

### Goal & Scope
- Build a new detector module for Character Confusion Rate (CCR), Shannon entropy, and output-length ratio.
- Integrate the detector into the existing validation-warning pipeline used by extracted records.
- Thread `rawResponse` through the processing path so detection runs on the provider's unparsed output.
- Keep the scope limited to the shared processing helpers and the existing record processors that already attach `validation_warnings`.
- This issue depends on no open blockers and does not change the external API surface.
- This issue unblocks stronger disagreement signals for roadmap Phase 3 issue `#219`.

### Files To Change
- Core code
- `/Users/danieltierney/projects/textharvester-web/src/utils/degenerateOutputDetector.js` (new)
- `/Users/danieltierney/projects/textharvester-web/src/utils/processingHelpers.js`
- `/Users/danieltierney/projects/textharvester-web/src/utils/processors/memorialProcessor.js`
- `/Users/danieltierney/projects/textharvester-web/src/utils/processors/burialRegisterProcessor.js`
- `/Users/danieltierney/projects/textharvester-web/src/utils/processors/graveCardRecordProcessor.js`
- Tests
- `/Users/danieltierney/projects/textharvester-web/__tests__/utils/degenerateOutputDetector.test.js` (new)
- `/Users/danieltierney/projects/textharvester-web/__tests__/utils/processingHelpers.test.js`
- `/Users/danieltierney/projects/textharvester-web/__tests__/utils/fileProcessing.test.js`
- Docs
- `/Users/danieltierney/projects/textharvester-web/IMPLEMENTATION_ROADMAP.md`
- `/Users/danieltierney/projects/textharvester-web/issues.md`
- `/Users/danieltierney/projects/textharvester-web/AGENTS.md` only if a reusable provider or validation pattern needs to be documented
- `/Users/danieltierney/projects/textharvester-web/MEMORY.md` only if the repo already contains it and the implementation introduces a reusable pattern

### Assumptions, Risks, Dependencies
- `processWithValidationRetry()` is the cleanest place to expose `rawResponse`; no audit-log lookup should be required.
- Threshold calibration is the main risk. Short, valid inscriptions must not be flagged aggressively.
- Irish fada characters and historical glyphs may require expansion of the CCR allowlist later.
- I will avoid changing `/Users/danieltierney/projects/textharvester-web/config.json` unless the implementation proves a persisted feature flag is necessary, because deployment-impacting config changes require tighter scope control.
- Existing user changes in the worktree (`.DS_Store`, `scripts/ralph/`) are unrelated and will be left untouched.

### Acceptance Criteria
- Roadmap issue `#213` from Phase 1 is implemented in code and documented as completed.
- Degenerate outputs are flagged by deterministic checks and flow through `validation_warnings` and `needs_review`.
- `processWithValidationRetry()` returns `rawResponse` alongside validated data and usage.
- Valid short outputs are not flagged by default-unit-test thresholds.
- Targeted tests pass for the detector and helper integration.
- `npm test` and `npm run lint` are run if the environment allows; any gaps are documented.

### Test Specification
- Unit tests
- `npm test __tests__/utils/degenerateOutputDetector.test.js`
- `npm test __tests__/utils/processingHelpers.test.js`
- Integration-oriented regression test
- `npm test __tests__/utils/fileProcessing.test.js`
- Full verification
- `npm test`
- `npm run lint`
- Test cases include:
- happy-path normal prose does not trigger detection
- high-symbol / high-CCR output triggers detection
- repetitive low-entropy output triggers detection
- very short valid output is ignored by entropy/length thresholds
- processing helper appends warning strings and forces `needs_review`
- `rawResponse` is returned from retry helper and propagated without changing validation behavior

### Step-By-Step Approach
1. Write detector unit tests for `computeEntropy()`, `computeCCR()`, `computeLengthRatio()`, and `detectDegenerate()`.
2. Extend helper tests to assert `processWithValidationRetry()` returns `rawResponse` and a new degenerate-detection helper appends validation warnings correctly.
3. Run the targeted tests and confirm they fail.
4. Implement `/Users/danieltierney/projects/textharvester-web/src/utils/degenerateOutputDetector.js` with conservative defaults and minimum-length guards.
5. Extend `/Users/danieltierney/projects/textharvester-web/src/utils/processingHelpers.js` with `applyDegenerateDetection()` and `rawResponse` pass-through from `processWithValidationRetry()`.
6. Wire `rawResponse` into the memorial, burial-register, and grave-card processors before `applyValidationWarnings()`.
7. Re-run targeted tests, then `npm test` and `npm run lint`.
8. Update roadmap and issue tracker statuses, then record results below.

### Test Results
- Unit tests: `npm test __tests__/utils/degenerateOutputDetector.test.js` ✅ 12 passed
- Helper tests: `npm test __tests__/utils/processingHelpers.test.js` ✅ 24 passed
- Integration-oriented regression: `npm test __tests__/utils/fileProcessing.test.js` ✅ 39 passed
- Full suite: `npm test` ✅ 162 suites passed, 1702 tests passed, 6 skipped
- Linting: `npm run lint` ⚠️ repo already has unrelated pre-existing lint failures outside this issue scope; no new issue-specific lint failures were introduced

### Next Steps
- After `#213`, Phase 2 starts with `#206` schema-constrained generation, then `#222` prompt caching.
