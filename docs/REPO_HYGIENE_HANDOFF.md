# Repo Hygiene Handoff — Remaining Tiers

**Status:** Tier 1 complete. Tiers 2–4 not started.
**Baseline commit:** `7cd3d7b` on `main` (PR #258), mirrored to GitLab at the same commit.
**Written:** 2026-09-20. Every number and path below was verified against the live repos at this commit — re-verify before acting if `main` has moved.

---

## How to use this document

Work the tiers in order. Tier 2 is the highest value per unit of effort. Tier 3 is mechanical but touches branch state on two remotes, so back up first (see [Backups](#backups)). Tier 4 is cosmetic cleanup and safe to batch.

Two permissions matter before you start:

- `AGENTS.md` requires **human approval** for dependency, `.gitignore`, secrets/deployment, and config changes. Tier 2 items 2.1–2.3 are all in that category.
- Branch deletion on GitLab is **not** reversible from the UI for long. Tag or bundle before deleting anything (see [Backups](#backups)).

---

## Tier 1 — DONE (for context, do not redo)

| Change | Where |
|---|---|
| Secret scanning + push protection **enabled** | repo settings (API) |
| Leaked OpenAI key alert resolved as `revoked` | alert #1 |
| `FLY_API_TOKEN` secret **deleted** | repo secrets |
| Lint gate added: `lint` job (GH) + `npm run lint` step (GitLab) | `.github/workflows/ci.yml`, `.gitlab-ci.yml` |
| `lint` added to required status checks on `main` | alongside `test` |
| Lint errors **76 → 0**, no rules downgraded | 4 test files + `public/js/` |
| `ReferenceError` fixed: bare `sanitizeAttribute` → `SanitizeUtils.sanitizeAttribute` | `public/js/modules/results/main.js:1033` |
| Dependabot version updates configured (grouped, weekly) | `.github/dependabot.yml` |
| PR #258 squash-merged; GitHub + GitLab in sync | `7cd3d7b` |

Still outstanding from Tier 1 (needs a human click, not code):

- `secret_scanning_validity_checks` and `secret_scanning_non_provider_patterns` remain **disabled**.
  The repo-level GitHub API **silently accepts and ignores** these two fields (returns 200, changes nothing). They are configured through **organization-level** code-security configurations, and this repo is owned by a **user account**, not an org. Try the UI at
  `https://github.com/donalotiarnaigh/textharvester-web/settings/security_analysis` — if your plan exposes them, tick them there.
- Dependabot PRs **#259**, **#260**, **#261** are open and awaiting review. #261 is a **20-package major-version sweep** and deserves commit-by-commit review; #259/#260 are routine.

---

## Tier 2 — Reproducibility

This is the highest-value remaining work: it is the root cause of the npm 10 (CI) vs npm 12 (local) divergence that let a broken fresh install go unnoticed.

### 2.1 `sqlite3` has no native binding after a fresh `npm ci` (npm 12)

**Symptom:** `Error: Could not locate the bindings file. Tried: ...`

**Cause:** npm 12 blocks all dependency install scripts by default. `sqlite3` needs its install script to fetch or build the native binding. `sharp` is *not* affected — 0.33+ ships platform binaries as optional deps (`@img/sharp-*`), so it has no install script.

**Why CI is unaffected:**
- GitHub Actions uses the npm bundled with the runner (npm 10), where install scripts still run.
- GitLab CI runs `npm ci --ignore-scripts` and then explicitly rebuilds: `npm_config_build_from_source=true npm rebuild sqlite3`.

**Fix:** add an `allowScripts` entry to `package.json`:

```bash
npm install-scripts approve sqlite3          # writes package.json -> allowScripts
# add --no-allow-scripts-pin to approve by name instead of pinned pkg@version
```

Verify afterwards with a throwaway install:

```bash
mkdir /tmp/probe && cd /tmp/probe && cp /path/to/{package.json,package-lock.json} . && npm ci
node -e "require('sqlite3'); console.log('sqlite3 OK')"
```

`allowScripts` is currently **absent** (`package.json` has no such key). Overrides currently contain `prebuild-install: { tar-fs: 2.1.4 }`, which `sqlite3` still needs — do not remove it.

### 2.2 No version pinning anywhere

All of the following are **absent**: `.nvmrc`, `.node-version`, `.tool-versions`, `.npmrc`, `packageManager`.

`engines.node` is `">=22.0.0"` and is **advisory only** — npm prints a warning and proceeds, because `engine-strict` is not set. Local environment is Node `v22.23.2` with npm `12.0.2` (globally installed, newer than the npm bundled with Node 22).

**Fix (suggested):**
- Add `.nvmrc` containing `22`.
- Add `packageManager` only if you want Corepack to enforce it — be aware Corepack interception can surprise other contributors. A lower-risk alternative is to document the npm major in `CONTRIBUTING.md` and add `engines.npm`.

**Acceptance check:** a fresh clone on a machine with no global npm override should install the pinned toolchain and produce a working `sqlite3`.

### 2.3 Husky hooks are dead config

`package.json` contains a **legacy husky v4-style** key:

```json
"husky": { "hooks": { "pre-commit": "lint-staged", "pre-push": "npm test" } }
```

But the installed dependency is **`husky@^9.0.11`**, which ignores that key entirely. In addition:

- there is **no `.husky/` directory**
- there is **no `prepare` script** (husky v9 installs hooks from `prepare`)
- `git config core.hooksPath` is **empty**

**Net effect: neither hook ever runs.** This was confirmed empirically — a commit and push during Tier 1 triggered neither `lint-staged` nor `npm test`.

Both `husky@^9.0.11` and `lint-staged@^15.2.2` *are* present in `devDependencies`, so the intent was real; the wiring just never happened.

**Fix — pick one:**
- **Remove the dead config** and rely on CI gates (simplest; CI now enforces lint + tests anyway).
- **Migrate to husky v9**: run `npx husky init`, add `"prepare": "husky"`, add a `lint-staged` config block, and create `.husky/pre-commit` / `.husky/pre-push`.

Decide deliberately: with lint + full tests now gating `main`, the marginal value of local hooks is mostly *faster feedback*, not correctness.

---

## Tier 3 — Branch hygiene

All counts verified at `7cd3d7b`.

### 3.0 Method — read this before writing any deletion script

> **Two traps that will make you delete the wrong things, or keep the wrong things:**

1. **`git branch --merged` and `git cherry` give false negatives on squash-merged branches.** This repo squash-merges every PR, so a branch whose work is fully in `main` will *not* look merged. Never trust them here.
2. **`git rev-list --left-right --count A B` does not compute a symmetric difference.** You must write `A...B` (three dots). Without the dots it prints `<0> <total commits in B>`, which misleadingly reported `0 880` for two *identical* refs.

**The safe test for deletion is ancestry:** `git merge-base --is-ancestor <branch> <base>`. If it returns true, the branch is provably contained in the base and deleting it loses nothing. If it returns false, the branch needs a human content check — it may still be fully landed via squash-merge.

To check whether a "diverged" branch's content is actually already in `main`:

```bash
git log --oneline origin/main..<branch>       # what is it claiming to add?
git diff origin/main...<branch> --stat        # the content it would introduce
```

Then confirm by searching `main` for the change (e.g. the added function, the fixed lines, or the closed issue number). Beware: comparing `git diff origin/main <branch>` (the *tree*) is **not** a reliable squash detector for old branches — an old branch's tree differs from `main` simply because `main` has moved on. Use it only to detect "branch tree is byte-identical to current main", which is rare.

### 3.1 GitLab — 36 of 46 non-main branches are provably safe to delete

GitLab has **47 branches total / 46 non-main**. Of those, **36 are true ancestors of `gitlab/main`** and can be deleted with no content check:

```
backup/progress-system-redesign          fix/issue-104-global-error-taxonomy
chore/organisational-cleanup             fix/issue-105-filename-based-identity
chore/root-dir-cleanup                   fix/issue-113-two-pass-rimag-processing
chore/security-pin-tar-fs-3.1.1-2.1.4    fix/issue-125-migration-transactions
claude/zealous-elgamal                   fix/issue-127-correlation-id
cursor/backend-unused-code-cleanup-7260  fix/issue-134-confidence-coverage
cursor/fetch-repository-issues-04c9      fix/issue-135-review-csv-columns
docs/improve-documentation               fix/issue-163-startup-api-key-validation
feat/cli                                 fix/issue-164-schema-wizard-all-images
feature/grave-card-pipeline              fix/issue-169-cost-estimate-before-batch
feature/issue-143-gemini-provider        fix/issue-170-volume-id-autocomplete
feature/model-selection                  fix/issue-216-extended-cross-field-validation
feature/monument-photo-ocr               fix/issue-234-mistral-ocr-provider
feature/progress-system-redesign         fix/issue-8-pattern-based-initials
feature/prompt-modularization            fix/model-display-unknown
feature/user-extensible-schema           fix/model-selection-persistence
fix/cancel-button-processing             fix/remove-subjective-model-claims
fix/ci-integration-test-schema
fix/ci-workflow-cleanup
```

### 3.2 GitLab — the 10 that need a content check

These are exactly the branches not contained in `gitlab/main`:

| Branch | Also on GitHub? |
|---|---|
| `claude/optimize-cicd-workflow-n93r6` | yes |
| `feat/ground-truth-eval-framework` | yes (open PR #255) |
| `feature/progress-bar-redesign` | **GitLab only** |
| `feature/typographic-analysis` | yes |
| `fix/244-json-serialization` | yes (open PR #256) |
| `fix/issue-136-json-extraction` | yes |
| `fix/issue-142-debs-classification` | yes |
| `fix/issue-167-project-collection-model` | **GitLab only** |
| `fix/issue-184-cli-source-type-validation` | yes |
| `fix/issue-184-source-types` | yes |

Notable: **`feature/typographic-analysis` is a leftover.** `docs/typographic-analysis/tasks.md` is **34 done / 0 open**, and the feature is in `main` — the branch is stale, not pending work.

### 3.3 GitHub — 20 non-main branches, none provably merged

**Zero** GitHub branches are ancestors of `main`, and none has a tree identical to `main`. So every one needs an individual check. Breakdown:

- **3 are Dependabot PR branches** — `dependabot/npm_and_yarn/{development-minor-patch-e00c4a0d1d, major-updates-52354dbb34, production-minor-patch-dae15daf17}`. They delete themselves when #259/#260/#261 merge (and always if you enable `delete_branch_on_merge`).
- **2 have open PRs** — `feat/ground-truth-eval-framework` (#255), `fix/244-json-serialization` (#256). Leave them.
- **15 stale candidates**, oldest first. The commit count is what the branch claims over `main`:

| Branch | Last commit | Commits |
|---|---|---|
| `feature/improved-error-handling` | 2024-03-11 | 1 |
| `cursor/update-textharvester-with-gpt-5-for-ocr-c0f4` | 2025-08-08 | 1 |
| `cursor/integrate-gpt-5-vision-capabilities-fe8b` | 2025-08-09 | 2 |
| `cursor/retrieve-open-repository-issues-dddf` | 2025-08-22 | 2 |
| `codex/draft-parallel_processing.md-for-ocr-improvements` | 2025-09-28 | 1 |
| `feature/typographic-analysis` | 2026-02-25 | 1 |
| `fix/issue-136-json-extraction` | 2026-03-08 | 2 |
| `copilot/add-request-correlation-id` | 2026-03-09 | 1 |
| `fix/issue-142-debs-classification` | 2026-03-10 | 2 |
| `claude/next-issue-qoTF5` | 2026-04-03 | 2 |
| `fix/issue-184-cli-source-type-validation` | 2026-04-03 | 1 |
| `claude/plan-issue-187-PHRBk` | 2026-04-04 | 1 |
| `claude/review-next-issue-2CPME` | 2026-04-04 | 4 |
| `fix/issue-184-source-types` | 2026-04-04 | 1 |
| `claude/optimize-cicd-workflow-n93r6` | 2026-04-06 | 1 |

Two things to resolve here specifically:

- **A duplicate pair.** `fix/issue-184-cli-source-type-validation` and `fix/issue-184-source-types` have the **same commit message** ("fix: Add monument_photo and record_sheet to CLI source type validation (issue #184)") but different SHAs. This is the same competing-branch pattern as the `#244` pair resolved earlier. Compare their diffs, keep one, delete both if the fix is already in `main`.
- **Likely-landed branches.** `fix/issue-136-json-extraction` and `fix/issue-142-debs-classification` both end with a "docs: mark issue as Fixed" commit, so the underlying fix is probably in `main` and only the doc commit is unique.

### 3.4 Local branches

10 non-main local branches:

- **`fix/issue-167-project-collection-model`** tracks `[origin/…: gone]` — the remote branch is deleted. Safe to drop locally.
- **`feature/progress-bar-redesign`** tracks `gitlab/feature/progress-bar-redesign` — the only branch whose upstream is GitLab, not GitHub.
- The other 8 track live `origin/*` branches and should be pruned only after the corresponding remote branch is resolved.

### 3.5 Consider enabling `delete_branch_on_merge`

Currently `false`, alongside `allow_update_branch: false`. Turning on `delete_branch_on_merge` prevents this exact backlog from re-accumulating — merged PR branches will clean themselves up. Low risk, one API call (or a settings toggle).

---

## Tier 4 — Orphans and docs drift

### 4.1 Fly.io deploy artifacts (deploy target is gone)

All still present:

| Path | Detail |
|---|---|
| `fly.toml` | 24 lines |
| `fly.staging.toml` | 24 lines |
| `Dockerfile` | 41 lines; retains `LABEL fly_launch_runtime="Node.js"` (line 7) |
| `.dockerignore` | 73 lines |
| `docs/operations/RUNBOOK.md` | `## Production Deployment (Fly.io)` section, lines ~45–64 (`fly deploy`, `fly status`, `fly logs`, `fly ssh console`; app `hg-textharvest-v2`, region `ams`) |

`FLY_API_TOKEN` is already deleted (Tier 1).

**Judgement call:** decide per file. `fly.toml`/`fly.staging.toml` and the RUNBOOK section are unambiguously orphaned. The **`Dockerfile` is less clear** — a container build may still be useful independently of Fly, in which case keep it and just strip the `fly_launch_runtime` label. Don't delete it reflexively.

### 4.2 `IMPLEMENTATION_ROADMAP.md` is duplicated byte-for-byte

Root copy and `docs/IMPLEMENTATION_ROADMAP.md` are **identical** (`md5 42a135275c2665520b29cdea156dfcc3`). Keep one, delete the other, and fix any inbound links.

### 4.3 `AGENTS.md` is stale in the way that matters most

This is the file agents actually read, so staleness here actively misdirects:

- Line 237: `**Last Updated:** 2026-03-09`
- Line 11: declares `feature/typographic-analysis` as the **active feature branch**
- Line 207: names the same branch as the feature branch to work on

Meanwhile `docs/typographic-analysis/tasks.md` is **34 done / 0 open**, and that branch is a stale leftover (see 3.2). Any agent following `AGENTS.md` today will look for work that does not exist and scope its permissions to a finished feature. **Refresh or retire the "Active Feature" section.**

### 4.4 Divergent duplicate handover docs

`docs/handover.md` and `docs/operations/handover.md` are both 115 lines and differ by **one line**:

```
docs/handover.md:            jest.config.js
docs/operations/handover.md: jest.config.cjs   <- correct
```

`docs/handover.md` is the stale copy. Reconcile to the `.cjs` version and remove the duplicate.

(Note: other duplicate basenames exist under `docs/` — `design.md`, `issues.md`, `requirements.md`, `tasks.md`, `README.md`, `performance-monitoring.md` — but those live in **different feature subdirectories** and are legitimately distinct. Only `handover.md` and `IMPLEMENTATION_ROADMAP.md` are true duplicates.)

### 4.5 Stale Node version references

Two live references need updating:

- `docs/test-data-setup.md:272` — `node-version: '18'`
- `docs/cli/design.md:716` — "Node.js 18+, 20+"

**Leave alone:** `docs/burial-register-pilot/pilot_run_preparation.md:15` (`Node 20.13.1`) — this is a historical run record, and rewriting it would falsify the record.

---

## Accepted / known — deliberately not doing

These were assessed and consciously deferred. Do not treat them as oversights.

| Item | Decision |
|---|---|
| **`.git` is 127 MB** | Contains `TextHarvesterBackup.tar.gz` (56.4 MB), `temp_register.pdf` (48.9 MB), `debug_claude_compressed.jpg` (~3.9 MB ×2) in `main`'s history. A rewrite would reclaim most of it but would **invalidate every SHA**, break the GitLab mirror parity just re-established, and invalidate the existing backup bundle. Not worth it. |
| **47 lint warnings** | Non-blocking by design (gate is errors-only). Mostly `no-unused-vars` in tests. Burn down opportunistically. |
| **58 open issues** | Untriaged. Separate workstream. |
| **0 git tags** | No releases have ever been cut. Not urgent. |
| **`delete_branch_on_merge: false`** | Revisit — see 3.5. |
| **`allow_update_branch: false`** | Fine for a solo maintainer. |
| **No `CODE_OF_CONDUCT.md`** | Irrelevant for a single-maintainer repo. |
| **No `.github/ISSUE_TEMPLATE/config.yml`** | Cosmetic; existing templates work. |
| **`has_projects: true`, `has_wiki: false`** | Leave as-is. |

---

## Traps and gotchas (all verified the hard way)

- **`git rev-list --left-right --count A B` is wrong.** Use `A...B`. Without dots it returns `<0> <commits in B>`, which reported `0 880` for two identical refs. The correct parity check is `git rev-list --left-right --count origin/main...gitlab/main` → expect `0 0`.
- **Squash-merge false negatives.** `git branch --merged` and `git cherry` both fail on this repo's history. Use `git merge-base --is-ancestor` for the safe direction, content inspection for the other.
- **The GitLab mirror is manual.** GitLab pull-mirroring is Premium/Ultimate only and this group is on Free. Sync with `git push gitlab main:main`. `push.default=simple` will reject mismatched-upstream pushes, so always spell out the refspec.
- **npm 12 blocks dependency install scripts.** Approvals live in `package.json` → `allowScripts`. See 2.1.
- **The GitHub repo-level API silently ignores two secret-scanning fields.** `secret_scanning_validity_checks` and `secret_scanning_non_provider_patterns` return 200 OK and change nothing. Always re-read settings after a PATCH and treat "200 without state change" as failure.
- **Deleting a GitHub secret does not revoke the credential.** `FLY_API_TOKEN` is gone from the repo, but the token itself must be revoked at Fly.io if that account still exists.
- **macOS has no `timeout`; there is no Docker daemon here.** `docker build --check` fails — use `docker manifest inspect` for image checks.
- **The `edit` tool requires a prior `read`.** Reading a file via `cat` does not satisfy it.
- **Test runs leave transient artifacts** (`__tests__/integration/typo_test_image.png`, `temp_cli_test/`). They are created and cleaned up by the suite; a `git status` during a run will show them mid-flight. Don't commit them, and don't panic.

---

## Backups

A full backup from the earlier rescue work lives outside the repo:

```
/Users/danieltierney/projects/textharvester-web-backups/20260920-084403/
├── all-refs.bundle            # 116 MB, 260 refs
├── pre-state.txt
├── deleted-branches-recovery.txt
└── stashes/
    ├── stashes.bundle         # 71 KB
    └── stash-0..4.patch
```

`stash@{3}` held 12,427 lines of real WIP and `stash@{4}` 454 lines — both archived rather than dropped.

**Before any Tier 3 branch deletion, confirm this backup still exists**, and consider a fresh bundle for any branch you are about to delete that is *not* provably an ancestor.

---

## Command reference

```bash
# --- Parity between GitHub and GitLab (expect: 0	0 and identical tree hashes)
git fetch origin -q && git fetch gitlab -q
git rev-list --left-right --count origin/main...gitlab/main
git rev-parse origin/main^{tree} gitlab/main^{tree}

# --- Sync the GitLab mirror
git push gitlab main:main

# --- Safe-to-delete test (true => provably contained, delete freely)
git merge-base --is-ancestor <branch> origin/main && echo SAFE

# --- Classify every branch on a remote
for b in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep -v '/HEAD$' | grep -v '^origin/main$'); do
  if git merge-base --is-ancestor "$b" origin/main 2>/dev/null; then echo "SAFE     $b"
  else echo "CHECK    $b  ($(git rev-list --count origin/main.."$b") commits)"; fi
done

# --- Inspect a diverged branch before deciding
git log --oneline origin/main..<branch>
git diff origin/main...<branch> --stat

# --- Fresh-install probe for the sqlite3 issue (Tier 2.1)
mkdir -p /tmp/probe && cd /tmp/probe && cp <repo>/{package.json,package-lock.json} . && npm ci
node -e "require('sqlite3'); console.log('sqlite3 OK')"

# --- Lint / tests (both now gate CI)
npm run lint          # 0 errors, 47 warnings expected
npm test              # 163 suites, 1728 passed, 1 skipped expected

# --- Verify security settings really applied (they can silently no-op)
gh api repos/donalotiarnaigh/textharvester-web --jq '.security_and_analysis'
gh api "repos/donalotiarnaigh/textharvester-web/secret-scanning/alerts?state=open&per_page=100" --jq 'length'
gh api "repos/donalotiarnaigh/textharvester-web/dependabot/alerts?state=open&per_page=100" --paginate --jq 'length'
```

> Note the `--paginate` and explicit `state=open` on the Dependabot call. The bare endpoint defaults to a 30-item page across **all** states, so `--jq 'length'` on it returns `30` and looks like 30 open alerts. It is not. The real open count is 0.
