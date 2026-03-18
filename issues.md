# Issue Tracker — TextHarvester Web

_Last updated: 2026-03-18 · 16 open issues · [18 completed](#completed-issues)_

---

## Open & Blocked Issues

### [#121](https://github.com/donalotiarnaigh/textharvester-web/issues/121) No extraction accuracy measurement — impossible to detect quality regression

**Labels:** enhancement, data, high-priority
**Status:** Infrastructure complete — **blocked on real dataset** from community group

**Completed infrastructure:**
- `scripts/eval.js` — evaluation CLI with `computeCER`, `computeFieldAccuracy`, `evaluateNeedsReview`, `runEvaluation`
- `eval/gold-standard/` and `eval/fixtures/` skeleton with documented schema
- `__tests__/scripts/eval.test.js` — 36 passing unit tests; 5 data-dependent tests auto-skip when empty
- `docs/evaluation.md` — full documentation with `reviewThreshold = 0.70` rationale
- `npm run eval` / `npm run eval:check` scripts in `package.json`

**Remaining:**
1. Receive hand-labelled records (≥20 memorials) from local community group
2. Populate `eval/gold-standard/memorials.json` with real records
3. Generate CI baseline fixture from model outputs
4. Re-enable CI gate in `.github/workflows/ci.yml`
5. Verify field-level accuracy ≥ 0.85

---

## Backlog — Open Issues by Impact

**19 unstarted issues. Ordered by impact (highest first):**

### High Impact — Data Quality & Accuracy

Direct improvements to correctness and trustworthiness of extracted data.

**#114** — Implement evaluation metrics (IFR, field-level F1) with Historic Graves ground truth
Without measurement there is no way to know if changes improve or regress quality. Prerequisite for #115.

**#112** — Integrate Logainm API for placename validation (RAG enhancement)
Post-processing validation of placenames against an authoritative source; catches a class of error no prompt tuning can fix.

**#113** — Implement RimAG (Retrieval-in-the-Middle) two-pass processing strategy
Two-pass extraction has shown significant accuracy gains in VLM literature; highest-leverage prompt-level improvement available.

**#115** — Fine-tune GPT-4o on Historic Graves verified data for domain-specific accuracy
Domain fine-tuning, but blocked on #114 (need metrics first) and on obtaining a labelled dataset.

### Medium Impact — Throughput & Scalability

Affects batch processing capacity and result delivery speed.

**#39** — Paginate results and stream exports (CSV/JSONL)
Large result sets cause memory pressure and slow UI; pagination is essential as data grows.

**#96** — Enable simultaneous GPT and Claude processing for burial registers
Run two providers in parallel and compare/merge; improves throughput and enables consensus quality checks.

**#10** — Implement Parallel Model Processing & Automated Comparison
Broader version of #96 across all record types; enables provider benchmarking.

### Medium Impact — Code Health & Maintainability

Reduces defect risk and makes future feature work cheaper.

**#99** — Refactor: Implement Strategy Pattern for Record Processors
`fileProcessing.js` has three near-identical branches; a strategy pattern would cut duplication and simplify adding new types.

**#102** — Refactor: Abstract StorageService for Record Types
Four storage modules share boilerplate; a base class would reduce maintenance surface.

**#101** — Feat: Implement Strict Validation Middleware
Input validation is scattered; centralised middleware prevents malformed data from reaching processing logic.

**#100** — Refactor: Decouple Type-Specific UI Config from main.js
Frontend `main.js` has type-specific rendering logic interleaved; extracting config improves readability and testability.

### Lower Impact — Polish & Optimisation

Valuable but not blocking other work or affecting correctness.

**#98** — Enhancement: Dynamic CSV Flattening for All Types
Current CSV export is hard-coded per type; dynamic flattening would auto-adapt to schema changes.

**#40** — Optimize image pipeline and retry caching
Performance improvement; current pipeline works but wastes bandwidth on retries of already-converted images.

**#41** — Reduce logging verbosity and sample performance metrics
Operational polish; noisy logs make debugging harder but don't affect functionality.

**#26** — Enhancement: Provider-Specific Name Handling Configuration
Edge-case name formatting differences between providers; low frequency in practice.

**#23** — UI Inconsistency: Copy Button Visible But Only Works When Modal Expanded
Minor UX bug; button is visible but non-functional in collapsed state.

---

## Completed Issues

_18 issues resolved. Click issue number for full details on GitHub._

### P1 Completed (5)

| # | Title | PR | Status |
|---|-------|----|----|
| #119 | Confidence score silently defaults to 1.0 | [#128](https://github.com/donalotiarnaigh/textharvester-web/pull/128) | ✅ |
| #120 | BurialRegisterPrompt confidence envelopes | [#129](https://github.com/donalotiarnaigh/textharvester-web/pull/129) | ✅ |
| #116 | Per-field confidence scoring with review queue | [#117](https://github.com/donalotiarnaigh/textharvester-web/pull/117) | ✅ |
| #130 | Token and cost tracking | [#140](https://github.com/donalotiarnaigh/textharvester-web/pull/140) | ✅ |
| #132 | Retry on validation or parse failure | [#145](https://github.com/donalotiarnaigh/textharvester-web/pull/145) | ✅ |

### P2 Completed (13)

| # | Title | PR | Status |
|---|-------|----|----|
| #136 | Anthropic JSON extraction regex fix | [#146](https://github.com/donalotiarnaigh/textharvester-web/pull/146) | ✅ |
| #123 | Cross-field validation (impossible dates/ages) | [#138](https://github.com/donalotiarnaigh/textharvester-web/pull/138) | ✅ |
| #124 | JSON parse failure → needs_review | [#139](https://github.com/donalotiarnaigh/textharvester-web/pull/139) | ✅ |
| #125 | Database migrations in transactions | [manual merge] | ✅ |
| #135 | Review workflow (CSV export approach) | [#147](https://github.com/donalotiarnaigh/textharvester-web/pull/147) | ✅ |
| #134 | Confidence coverage tracking | [#148](https://github.com/donalotiarnaigh/textharvester-web/pull/148) | ✅ |
| #126 | `_confidence_scores` API cleanup | [#149](https://github.com/donalotiarnaigh/textharvester-web/pull/149) | ✅ |
| #127 | Request correlation ID (processing_id) | [#150](https://github.com/donalotiarnaigh/textharvester-web/pull/150) | ✅ |
| #133 | LLM audit logging for debugging | [#152](https://github.com/donalotiarnaigh/textharvester-web/pull/152) | ✅ |
| #142 | DEBS monument classification pipeline | [#153](https://github.com/donalotiarnaigh/textharvester-web/pull/153) | ✅ |
| #105 | Enforce filename-based identity | [#156](https://github.com/donalotiarnaigh/textharvester-web/pull/156) | ✅ |
| #38 | Respond immediately on upload and offload PDF conversion | [#157](https://github.com/donalotiarnaigh/textharvester-web/pull/157) | ✅ |
| #37 | Add controlled concurrency to file processing queue | [#141](https://github.com/donalotiarnaigh/textharvester-web/pull/141) | ✅ |

### Also Completed

| # | Title | PR | Status |
|---|-------|----|----|
| #143 | Add Gemini as a provider | [#144](https://github.com/donalotiarnaigh/textharvester-web/pull/144) | ✅ |
| #121 | Evaluation metrics infrastructure | [#137](https://github.com/donalotiarnaigh/textharvester-web/pull/137) | ⏳ Data pending |

