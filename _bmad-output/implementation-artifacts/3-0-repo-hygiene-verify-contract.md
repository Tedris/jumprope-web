---
baseline_commit: 259b42f
---
# Story 3.0: Repo hygiene — VERIFY-CONTRACT in force (chore, lands before 3.2)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an unattended agent,
I want the repo to obey `VERIFY-CONTRACT.md` as written,
so that the gate, CI, and file map are trustworthy without a human in the loop. (Added by the 2026-11-07 readiness audit, decision D-003 — `docs/kickoff/readiness-audit-2026-11-07/decisions.md:21-26`.)

This is a **chore story**: zero product/game behavior changes. It touches exactly one contract: how the repo proves itself. Land it before Story 3.2 (order constraint only — no code coupling).

## Acceptance Criteria

1. (AC1, rule 1+2) `./run_tests.sh` exists at the repo root, executable in git (mode 100755), and:
   a. runs `node --test tests/` as its oracle;
   b. exits non-zero on any test failure, zero when green (node's exit code, not grep's);
   c. prints a parseable PASS line `N/M passed` (N = passed, M = total) after the run, in both green and red cases;
   d. the command names in `AGENTS.md` and `VERIFY-CONTRACT.md` rule 1 point at this one existing script — no second gate name anywhere (package.json gains NO `scripts` entry; it stays `{name, private, type}` byte-identical).
   **Verify:** `./run_tests.sh; echo rc=$?` → `304/304 passed`, `rc=0`; `grep -c run_tests.sh AGENTS.md VERIFY-CONTRACT.md` → ≥1 each; `git ls-files -s run_tests.sh` → `100755`.
2. (AC2, rule 8) A GitHub Actions workflow (`.github/workflows/*.yml`) runs **the same gate** (`./run_tests.sh`) from a clean checkout on `ubuntu-latest` — never on the dev box. The repo currently has no CI config at all. Trigger: `push` + `pull_request`. No npm install step (zero dependencies).
   **Verify:** `grep -l run_tests.sh .github/workflows/*.yml` → match; workflow references no package manager.
3. (AC3, audit finding 4) The night-loop era files `NIGHT.md`, `JOURNAL.md`, `BLOCKED.md`, `tools/night/` are moved (retired, not deleted — `git mv`, content byte-identical inside) to `docs/archive/night/`, mirroring the repo-root layout (see Task 3 for exact destinations), and `AGENTS.md` carries a pointer line — same voice as the existing GSD legacy line (`AGENTS.md:64`).
   **Verify:** `ls NIGHT.md JOURNAL.md BLOCKED.md tools/night 2>&1` → all "No such file"; `ls docs/archive/night/` → present; `git log --follow --oneline -1 docs/archive/night/NIGHT.md` → history preserved.
4. (AC4, reconciliation) `VERIFY-CONTRACT.md` describes the repo as it now is: the rule-3 `NIGHT_PROTECT` reference is re-pointed (the variable's only definition, `tools/night/night.conf`, is archived); the "Morning flow consequence" section loses its night-agent framing while keeping its meaning (unattended runs write at most `review`; a fresh-context reviewer/human promotes to `done` — which is the BMAD flow already in use). `AGENTS.md` gains the rule-4 surface: a named Commands block (build: none / test+verify: `./run_tests.sh` / serve: static server / probe-state: Node import of `js/*.js`) and the do-not-touch list (rule 3's sacred paths + the near-frozen pair).
   **Verify:** `grep -n "NIGHT_PROTECT" VERIFY-CONTRACT.md` → only an archive pointer, not a live requirement; the doc-fence legs in `tests/hygiene.test.js` are green.

## Tasks / Subtasks

- [x] Task 1: `./run_tests.sh` gate script (AC: 1)
  - [x] Create `run_tests.sh` at repo root: `#!/usr/bin/env bash`, `set -u`; run node's test runner through `tee` or capture so BOTH the human-readable log and the `N/M passed` summary survive; print node's own output unmodified first, then the `N/M passed` line; `exit` with node's exit code (capture `${PIPESTATUS[0]}` / `$?` before anything else — the classic gate bug is grepping the pipeline and exiting on grep's status).
  - [x] Parse counts from the **TAP reporter** (`node --test --test-reporter=tap tests/`): summary lines `# pass 304` / `# tests 304` / `# fail 0` are ASCII and locale-stable. The default spec reporter's `ℹ` lines are unicode-prefixed — do not grep those. `M` = `# tests`; `N` = `# pass`. If `# fail` > 0 the script still prints the line, then exits non-zero.
  - [x] `chmod +x run_tests.sh`; stage so git records mode 100755 (`git ls-files -s` shows it; a `644` gate is red in CI on the first `./run_tests.sh` invocation).
  - [x] No npm script, no Makefile, no second wrapper — one gate name (rule 1). Keep `package.json` byte-identical.
- [x] Task 2: CI workflow (AC: 2)
  - [x] New `.github/workflows/test.yml`: `on: {push: ..., pull_request: ...}`; job on `ubuntu-latest`; `permissions: {contents: read}`; steps: checkout, `actions/setup-node` with `node-version: 26`, then `run: ./run_tests.sh`. **No** `npm install`/`npm ci` (zero deps — a lockfile-less `npm ci` fails the build) and **no** `cache: 'npm'` in setup-node (no lockfile to hash; omit the input).
  - [x] Action versions (researched 2026-11-07): `actions/checkout` — v5.1.0 is the confirmed-good July-2026 major (a v6/v7 line exists by now; either newer major also works, but v5 is the boring pin); `actions/setup-node` v5.x (v5.0.0+, breaking change was cache handling — irrelevant without `cache:`). Node 26: dev box runs v26.8.1 and Node 26 became Active LTS 2026-10-28; the suite's floor is Node ≥ 18 (`AGENTS.md:25`).
  - [x] Do not rely on branch-filtering (`master` is the current branch; plain `on: push` avoids a wrong-branch silent-skip trap).
- [x] Task 3: Retire the night-loop files (AC: 3)
  - [x] `git mv NIGHT.md JOURNAL.md BLOCKED.md docs/archive/night/` and `git mkdir + git mv tools/night docs/archive/night/tools/night` — mirror the root layout so cross-references inside the archived files (`tools/night/briefs/...` cited from NIGHT.md:5) stay repairable by prefixing `docs/archive/night/`. `docs/archive/` already hosts `gsd/` the same way (read-only legacy).
  - [x] Contents stay byte-identical — these are historical records (GSD-04-xx results, 2026-10-22). No edits inside them, no timestamp fixes, no path rewrites.
  - [x] After the move `tools/` is empty and disappears from git; the root has no `NIGHT.md`/`JOURNAL.md`/`BLOCKED.md`.
  - [x] Do NOT touch `.night/` — untracked, already gitignored (`.gitignore` `.night/` line), local scratch logs only. Keep the ignore line.
  - [x] `AGENTS.md` Workflow section: add one legacy-pointer bullet under the GSD one (`:64`): night-loop kit archived read-only under `docs/archive/night/`, superseded by the BMAD workflow.
- [x] Task 4: Doc reconciliation (AC: 1, 4)
  - [x] `VERIFY-CONTRACT.md` rule 3: replace the `NIGHT_PROTECT`-variable sentence with the requirement itself — "`tests/`, the gate script, and CI config are protected paths; a worker touching them is instant red" — plus one clause noting the night-era path list survives in `docs/archive/night/tools/night/night.conf`.
  - [x] `VERIFY-CONTRACT.md` "Morning flow consequence": rewrite the heading/first clause to match today's flow (BMAD `dev-story` → `code-review`; unattended work ships at most `review`/`verification: pending`; promotion to `done` is human or fresh-context-reviewer). Meaning unchanged, night vocabulary removed.
  - [x] `VERIFY-CONTRACT.md` rule 9: the GSD half is historical — mark it `(GSD retired; BMAD ACs carry the command line)` so the rule stays checkable. Every AC in this story carries a `Verify:` command — follow that pattern.
  - [x] `AGENTS.md` Housekeeping: replace the `node --test tests/` bullet (`:68`) with the gate (`./run_tests.sh` — runs `node --test tests/`, prints `N/M passed`, non-zero on failure); amend the near-frozen bullet (`:70`) — its parenthetical claims "the boundary fence tests grep for regressions around them", which is **false as written**: no test reads `package.json`, and only `tests/ropehud.test.js:167`/`tests/ceilingmarker.test.js:64` read `index.html` (to seed the HUD DOM, not to fence it). `tests/boundary.test.js` fences the sim import graph, not these files. Restate it as a convention (near-frozen by rule, not by test) unless this story's Task 5 legs make it true.
  - [x] `AGENTS.md`: add the rule-4 Commands block + do-not-touch list (keep it 6 lines, not a manual). Suggested sacred list: `tests/`, `run_tests.sh`, `.github/`, plus the near-frozen `package.json`, `index.html`.
- [x] Task 5: Doc/oracle fence legs — `tests/hygiene.test.js` (new file) (AC: all)
  - [x] The drift this story exists for was doc-vs-reality rot. Pin it mechanically so it cannot silently recur (rule 9's "if you can't write the command, it isn't formed"; fence-test precedent: `tests/boundary.test.js`). Static file reads only, ~0 ms. Derive `projectRoot` by copying the existing pattern (`tests/ropehud.test.js:165-167`, `new URL('..', import.meta.url)` style) — check the actual idiom there and mirror it.
  - [x] Legs: (a) `run_tests.sh` exists, exec bit set, references `node --test` and `tests/`; (b) a `.github/workflows/*.yml` exists and names `run_tests.sh`; (c) `AGENTS.md` and `VERIFY-CONTRACT.md` each name `run_tests.sh` (single-gate-name parity); (d) no night-era paths at repo root (`NIGHT.md`, `JOURNAL.md`, `BLOCKED.md`, `tools/`) and `docs/archive/night/NIGHT.md` exists.
  - [x] Red-green: land the legs FIRST, observe all RED for the right reasons; then Tasks 1–4 turn them green. Mutation-check each leg once (Epic-1 retro A3: e.g. point (c) at a nonexistent script name → must kill).
  - [x] New file ONLY — existing `tests/*.test.js` stay byte-identical (frozen-test discipline, `AGENTS.md:52`; the gate itself is sacred, rule 3). Prove with `git diff 259b42f -- tests/` → the sole diff is the untracked-to-tracked `tests/hygiene.test.js`.
- [x] Task 6: Verification and bookkeeping
  - [x] `./run_tests.sh` fully green: `304/304 passed` (baseline 304 @ 8.4 s + ~4 static fence legs; budget < 10 s, report if over, NEVER trim a frozen leg).
  - [x] Red-case evidence: run once with a deliberately failing scratch copy (e.g. `bash -c 'sed s/pass/failx/ ...'` is forbidden — instead: `node --test --test-reporter=tap tests/nonexistent-dir-tmp/ ; echo` through the script's parse path, or temporarily point the script at a fixture dir via an env override if you added one). Simplest sanctioned route: assert parse logic in the Debug Log by feeding the parser a captured TAP summary containing `# fail 1` and showing the printed line + non-zero branch. Paste output.
  - [x] CI is not self-verifiable locally (no `act` — dependency forbidden; arm64 host has no Chromium for driven checks either, `3-1` precedent). Evidence = workflow YAML + the identical gate command proven green locally + confirmation `git ls-files -s run_tests.sh` = 100755 (clean checkout runs it). If the remote accepts pushes, the first Actions run after landing is the acceptance witness — record its URL in the Debug Log if reachable.
  - [x] Static smoke: `python3 -m http.server`, load `index.html`, run starts (nothing moved that `index.html` references — expected zero-diff; run it anyway as the standing chore check).
  - [x] File List includes `sprint-status.yaml` (Epic 1 retro Lesson 4).

## Dev Notes

### Current state (verified 2026-11-07, all cites re-checked)

- Root: `AGENTS.md  index.html  package.json  VERIFY-CONTRACT.md  NIGHT.md  JOURNAL.md  BLOCKED.md  css/ js/ tests/ tools/ docs/ _bmad/ _bmad-output/ .night/(ignored)`. **No `run_tests.sh`, no `.github/`** — both ACs are greenfield.
- Baseline: `node --test tests/` → **304/304 green, 8.4 s**, Node **v26.8.1** on linux/arm64. TAP reporter emits `# tests/# pass/# fail/# cancelled/# skipped` summary lines (parse targets).
- `package.json` = `{"name":"jumprope-web","private":true,"type":"module"}` — near-frozen (`AGENTS.md:70`); no test reads it (grep-verified 2026-11-07). VERIFY-CONTRACT rule 1 allows an npm-script gate, but adding one splits the gate into two names; the shell script is the single oracle.
- `tools/night/` = `night.conf` (21 l) + `night_loop.sh` (139 l) + `worker.sh` (17 l) + `briefs/` (6 files). It is the only live definition of `NIGHT_PROTECT` (`night.conf:12-13`), cited by VERIFY-CONTRACT rule 3 — that reference is the reconciliation seam in Task 4.
- Night-file content is a 2026-10-22 GSD-era record (tranche 1: 2 shipped, 3 blocked). `JOURNAL.md`/`BLOCKED.md` reference `.night/loop_*.log` paths that only ever existed locally. Zero live references from `js/`, `tests/`, or BMAD output into these files (grep-verified — only `.gitignore`'s `.night/` stays).
- `tests/boundary.test.js` walks the sim/test import graph for `three`/browser-IO (`:52`, `:84`); it does **not** grep `package.json`/`index.html` — AGENTS.md:70's parenthetical is the one doc claim that is provably false, and Task 4 fixes the wording.
- `docs/archive/` today contains only `gsd/` — mirror its "archived read-only, consult for history" pointer style (`AGENTS.md:64`).
- Frozen suite: 304 legs — do not touch any existing `tests/*.test.js`.

### Landmines (DO-NOT list)

1. Do NOT touch `package.json`, `index.html`, or any existing `tests/*.test.js` / `js/*` — this story's blast radius is root docs, the new script, `.github/`, the archive moves, and one new test file.
2. Do NOT let `run_tests.sh` exit on a pipeline member's status — node's rc is the oracle (`PIPESTATUS[0]`). A gate that greps green while tests are red is exactly the "green-gate-but-wrong-design" false pass VERIFY-CONTRACT warns about.
3. Do NOT grep the default spec reporter (`ℹ` unicode lines); use `--test-reporter=tap`.
4. Do NOT commit `run_tests.sh` at mode 644 — CI fails before the first test runs.
5. Do NOT add `npm install`/`npm ci`/`cache:` to CI — there is no lockfile and no dependency; `npm ci` with no lockfile exits non-zero.
6. Do NOT edit inside the archived night files, and do NOT delete `.night/`'s gitignore line.
7. Do NOT resurrect night-loop machinery or reference `night.conf` as live config — archive pointer only.
8. Story 3.1's forward interlocks (3.2 ADR-2 migration, 3.3 charge data) are unaffected by anything here — do not "tidy" anything in `js/` while you are in the neighborhood.

### Previous story intelligence

- Story 3.1 (done, 304/304 @ 8.42 s): fence-proof discipline — `git diff <baseline> -- tests/` pasted in the Debug Log showing ONLY the new file; red-green + mutation check on every new leg (retro A3); File List with role tags; arm64/no-Chromium smoke limitation → static checks + frozen shell-harness legs are the accepted evidence standard.
- Story 2.4/2.5: value-exact verification (no loosened regex/values), throwaway gate-evidence scripts run once and deleted.
- Epic 1 retro: deferrals need named landing stories — this story CONSUMES the audit's finding list; anything noticed but out of scope (see Scope notes) goes to `deferred-work.md` with a named owner, not into this diff.
- Land-pending note from the audit (`decisions.md:41-44`) is CLOSED: the planning write-back landed as its own commit `259b42f` before this story file; the Story 3.1 review round landed at `23756d0`. Tree is clean at baseline.

### Scope guards (explicit non-goals)

- Rule 4's "run-headless/probe-state" commands are documented as they already exist (Node import + static server) — no new tooling scripts.
- No test-runner config file, no `--test-reporter` config in package.json (script flag only), no husky/pre-commit hooks.
- No attempt to make `.planning/` (stale `NIGHT_PROTECT` entry in the archived night.conf) meaningful.
- Rules 5, 6, 7, 10 already hold (pure sim, seeded rng, events-as-data, pure-FS tests) — verification only, no changes.

### Project Structure Notes

- One new root-level file (`run_tests.sh`) — justified: rule 1 names it literally; `AGENTS.md`/`VERIFY-CONTRACT.md` name it. Nothing else at root changes.
- `.github/workflows/test.yml` is the standard location (rule 8, GitHub remote `Tedris/jumprope-web`).
- Archive destination: `docs/archive/night/` per epics AC ("retired not deleted"); `docs/archive/night/tools/night/**` mirrors the old root path.
- New test mirrors house convention `tests/<concern>.test.js`; POJOs/no classes/2-space/Named-export conventions don't bind a bash script — keep the script POSIX-leaning, no external deps (only `bash`, `node`, `awk`/`grep`).

### References

- `docs/kickoff/readiness-audit-2026-11-07/decisions.md` — D-003 (scope), D-001 (situation), land-pending note
- `_bmad-output/planning-artifacts/epics.md:465-483` — this story's ACs; `:170-174` Epic 3 context
- `VERIFY-CONTRACT.md` — rules 1/2/3/4/8/9 are the contract being enforced
- `AGENTS.md:52` (frozen-test rule), `:64` (pointer style), `:66-70` (Housekeeping to amend)
- `_bmad-output/planning-artifacts/architecture.md:78-86` — Delivery & Tooling (no build step, Node ≥ 18, static serve)
- `_bmad-output/implementation-artifacts/3-1-four-new-cards-in-the-catalogue.md` — evidence/fence/mutation patterns to copy
- `docs/archive/gsd/` — archive precedent

## Dev Agent Record

### Agent Model Used

omp (lane-qwen38-ultra/qwen), 2026-11-07

### Debug Log References

- Baseline: `node --test tests/` → 304/304 green, 8.4 s wall, Node v26.8.1 (2026-11-07, @ 259b42f).
- Required entries: red-green evidence for the hygiene legs; the parse/red-case witness; `git diff 259b42f -- tests/` fence proof; `git ls-files -s run_tests.sh`; suite wall-time.
- RED (Task 5, legs landed first @ HEAD 62b047b): `node --test tests/hygiene.test.js` → all 4 legs ✖ — (a) "run_tests.sh must exist at the repo root", (b) ".github/workflows/ must exist", (c) "AGENTS.md must name the one gate command", (d) "NIGHT.md must no longer exist at the repo root". Tasks 1–4 turned all 4 green.
- Mutation check (one per leg): (a) `chmod 644 run_tests.sh` → kill; (b) workflows dir moved away → kill; (c) `git stash push -- AGENTS.md` (HEAD copy, no gate name) → kill; (d) `touch NIGHT.md` → kill. Restored suite rc=0; exec bit back to 755.
- Green gate: `time ./run_tests.sh` → `308/308 passed`, `rc=0`, 8.5 s wall (< 10 s budget; = baseline 304 + 4 hygiene legs).
- Red-case witness through the REAL script: throwaway `tests/zz-redcase-tmp.test.js` (one failing assert) → TAP tail `# tests 309` / `# pass 308` / `# fail 1`, printed line `308/309 passed`, `rc=1`. Scratch file deleted before commit.
- Parse bug caught green-ward: first cut used `$2` for the `# pass` count → printed `0/308`; fixed to `$3` (both summary fields are column 3).
- Fence proof: `git diff 259b42f -- tests/` → sole change `tests/hygiene.test.js` (new, 56 lines, zero deletions elsewhere). `git ls-files -s run_tests.sh` → `100755 0feb45df…`.
- Night retirement: `git status` recorded all 12 paths as `R` renames; `git log --follow --oneline docs/archive/night/NIGHT.md` walks back through ccd4c46 → 72dc536 … → 4bb2704 (night-kit install). Root has no NIGHT.md/JOURNAL.md/BLOCKED.md/tools; `.gitignore` `.night/` line untouched.
- Doc greps (AC1/AC2/AC4 verify): `grep -c run_tests.sh AGENTS.md VERIFY-CONTRACT.md` → 3 and 1; `grep -l run_tests.sh .github/workflows/*.yml` → test.yml; `grep -n NIGHT_PROTECT VERIFY-CONTRACT.md` → :14, archive-pointer clause only.
- Static smoke (no Chromium on arm64, 3-1 precedent): `python3 -m http.server 8123` → index.html, css/style.css, js/{shell,game,render3d,audio}.js all HTTP 200 (zero-diff confirmed).
- CI acceptance witness: Actions run success on push — https://github.com/Tedris/jumprope-web/actions/runs/42412617078 (`✓ Run ./run_tests.sh`, ubuntu-latest, clean checkout).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created (2026-11-07).
- Gate ships as one 19-line bash script: tee'd TAP run, node's `${PIPESTATUS[0]}` as the only exit source, awk-parsed `# tests`/`# pass` → `N/M passed` in green AND red cases.
- Fence hygiene.test.js landed RED-first, all 4 legs mutation-killed once each (retro A3).
- CI-comment rephrase: the hygiene package-manager leg scans the full YAML including comments — the original comment literally said "npm install/ci" and killed the leg. Reworded the comment instead of loosening the regex (value-exact verification preserved).
- VERIFY-CONTRACT: rule 3 states the protection directly (NIGHT_PROTECT named only as retired-archive pointer); "Morning flow consequence" → "Unattended-run consequence" (BMAD vocabulary, meaning unchanged); rule 9 annotated `(GSD retired; BMAD ACs carry the command line)`.
- AGENTS.md gained the rule-4 Commands block (build/test+verify/serve/probe-state + do-not-touch), the night-kit pointer bullet, the gate in Housekeeping, and the corrected near-frozen claim (no test reads package.json; the two index.html reads are HUD seeds, not fences — re-verified by grep 2026-11-07).

### File List

- `run_tests.sh` — new (mode 755)
- `.github/workflows/test.yml` — new
- `docs/archive/night/{NIGHT.md,JOURNAL.md,BLOCKED.md,tools/night/**}` — moved via `git mv` (content untouched)
- `AGENTS.md` — modified (Commands block + do-not-touch, gate command, night pointer, `:70` claim fix)
- `VERIFY-CONTRACT.md` — modified (rule 3 pointer, morning-flow wording, rule 9 GSD annotation)
- `tests/hygiene.test.js` — new (static doc/oracle fence legs)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — modified (story status)

## Change Log

- 2026-11-07 — Story 3.0 created: D-003 scope locked (gate script, CI oracle, night-file retirement, doc reconciliation); audit planning write-back landed separately at 259b42f; status ready-for-dev.
- 2026-11-07 — Story 3.0 implemented: run_tests.sh gate (308/308, rc-correct, 755), .github/workflows/test.yml (Actions run 42412617078 green), night kit → docs/archive/night/ via git mv, AGENTS.md/VERIFY-CONTRACT reconciled, tests/hygiene.test.js fences (red-green + mutation-checked); status review.
