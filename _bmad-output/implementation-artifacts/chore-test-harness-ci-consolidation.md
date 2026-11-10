---
baseline_commit: db98032
---
# Chore: test-harness + CI consolidation (pre-6.6)

Status: backlog

Ledger bundle (owners CONFIRMED at Epic 3/4/5 closes; this chore runs NOW, before the Epic 6 entry probe):

- `deferred-work.md` :50 — two writers to the persisted best (`js/shell.js:443-444` over-restart + `:725-726` trip). The restart write is dead weight: `run.altitude` is frozen between the sites (status `over` passes through `tickRun` untouched), so the trip write already persisted the value. One shared save path (FR22 rule). [The Epic 4 close said Story 6.2; the Epic 5 close batch answer moved it here — SUPERSEDES.]
- `deferred-work.md` :54/:66/:196/:200 — bootShell fork census: #3 `altitude.test.js:119-203`, #4 `ascent.test.js:291+` (captures `console.error` WITHOUT asserting it), #5 `pausemenu.test.js:85+` (same error-capture gap), #6 `leadinhop.test.js:49+` (virtual clock). Plus the two originals `shell.test.js:30+`, `uxpolish.test.js:58+`, and the polish variant `polish.test.js:93+` — SEVEN boot bodies, ~60-90 duplicated lines each (DOM stub, audio wrapper, game wrapper, render stub/rewrite, data-URL import).
- `deferred-work.md` :184/:185 — `polish.test.js` gate flake (:546 D-05 + :529 sibling): `bootPolishShell` never stubs `performance`; real `performance.now()` races the pumped frame clock. Fix = virtual-clock stub (the ledger's own prescription: "lands with the shared tests/support/shell-harness.js stub").
- `deferred-work.md` :117 — CI runs only Node 26; documented floor ≥ 18 (`AGENTS.md:25`). Add the matrix.
- `deferred-work.md` :118 — unfiltered `on: push` double-runs on tags/PR-heads. Add `tags-ignore` + `concurrency` (no branch filters — the wrong-branch silent-skip trap stays avoided).
- `deferred-work.md` :186 — diff-census blind spot: UNTRACKED new files slip `git diff <base>` (reproduced twice: this round's `leadinhop.test.js` needed a manual pre-listing; chore A's `secondwind` census red). Close it with a `git status --porcelain` arm in both census legs so future stories need no R1 ceremony for new paths.

## Design decision (baked — compositional primitives, NOT a god-boot)

The seven boots differ in real ways (render stub vs render-rewrite wrapper, audio wrapper vs silent, preSeed vs storageMap vs own/airJumps, DOM hud-id sets, boot tags for the multi-boot guard). A single `boot(opts)` with 15 knobs would be the same duplication wearing a crown. Instead:

- **NEW `tests/support/shell-harness.js`** — shared PRIMITIVES every boot composes: `makeDom({ hudIds, canvas2d, orientation })` (the stub-object factory + capture arrays), `makeAudioWrapHref()` / `makeRenderStubHref()` / `makeGameWrapHref(srcUrl, inject)` (the data-URL wrapper authors), `dataUrl(src, tag)`, `bootModule(src, tag)` (the `import(...)` + bootCount guard), `installVirtualClock()` (returns `{ now, advance, install, restore }`, the pickerhud `performance`-stub idiom), `captureConsoleErrors()` (`{ errors, install, restore }`).
- **Each of the seven suites' boot function becomes a ≤25-line COMPOSITION** of the primitives — options stay suite-local, behavior stays identical. Test bodies below each boot stay byte-identical. `console.error` capture: `captureConsoleErrors` is wired in EVERY boot's env; ascent/pausemenu/leadinhop/polish keep returning `env.errors` (already collected) — the four that DISCARD it gain ONE closing assertion leg each (`assert.deepEqual(env.errors, [], ...)`) — if a real logged error surfaces, STOP and report (product finding, per 5.5-D5 doctrine).
- **polish boots on the virtual clock** (`installVirtualClock` + pump = `advance`) — pays :184/:185 deterministically.
- **D-best: delete `js/shell.js:443-444`** (restart write + its `best = Math.max` line). The v1parity restart-persistence legs pin the OBSERVABLE (key after restart) — unchanged by construction; the trip write (:725-726) is the single surviving path. Nothing else in shell.js.
- **CI (`.github/workflows/test.yml`)**: `node-version: [18, 26]` matrix (same oracle `./run_tests.sh`), `on.push.tags-ignore: ['**']`, `concurrency: { group: "ci-${{ github.ref }}", cancel-in-progress: false }`. `.github` is do-not-touch (AGENTS.md) — THIS story text is the written authorization; the workflow oracle is unchanged.
- **Census re-pin**: both diff-census legs (`ceilingbreak` §6, `summitapproach` §4.3) gain, right after the diff census: merge `git status --porcelain` paths into `changed` (untracked `?? path` and modified `M path` lines; strip status prefixes). Clean tree ⇒ arm is a no-op; an un-listed new/modified file ⇒ red at CREATION time, not commit time. BASE constants stay pinned (merge-base form stays deferred — the porcelain arm closes the demonstrated hole with two added statements).
### Creation-window note
Kickoff fact: the CREATE commit lands this artifact as a new tracked path, so the two census legs red at the first dev gate until the artifact string is added to both `allowed` Sets alongside the two test paths above — three strings per Set, comment-stamped; after them, green.
## Contract (binding)

- Files allowed to differ from BASE `db98032`: `js/shell.js` (D-best deletion ONLY), `.github/workflows/test.yml` (CI delta ONLY), NEW `tests/support/shell-harness.js`, NEW `tests/harness.test.js`, the seven boot suites (`shell`, `uxpolish`, `altitude`, `ascent`, `ascentstinger` if it reuses ascent's boot — verify at dev time, `pausemenu`, `polish`, `leadinhop`), `tests/ceilingbreak.test.js` + `tests/summitapproach.test.js` (porcelain arm + this story's allow-set strings), `tests/secondwind.test.js` — NOTHING except via census-listing, this artifact, `sprint-status.yaml`, `deferred-work.md`. Every OTHER byte byte-identical.
- The FULL gate must be green after EVERY task step (the consolidation is behavior-preserving by contract; a frozen-suite red means an adapter is wrong — fix the adapter, never the suite body; a boot-adapter CANONICAL rewrite of a test body is FORBIDDEN — STOP and report instead).
- Node 18 compatibility: the primitives use only syntax already present in the repo (ES2020 surface, `node --test` APIs stay inside test files).
- New suite `tests/harness.test.js`: ≤2 boots; source-fence legs + ONE behavior boot. Mutation battery in a /tmp clone of the workspace AT the current tree (one mutant alone per run, gold before/after); NEVER mutate the workspace; clean up.
- Kickoff: run `./run_tests.sh` FIRST — expect 535/535 at `db98032`; the creation-window census reds are PREVENTED here because the new paths are pre-listed below (R1 not needed — the porcelain arm would catch this story's own files otherwise; keep BOTH mechanisms consistent: pre-list + arm).

**Sanctioned allow-set additions (both legs, list-only, with a one-line comment "chore consolidation 2026-11-09"):** `tests/support/shell-harness.js`, `tests/harness.test.js`. Every touched EXISTING suite is already census-listed except — verify at dev time — `tests/polish.test.js`, `tests/uxpolish.test.js`, `tests/shell.test.js`, `tests/altitude.test.js`, `tests/ascent.test.js`, `tests/pausemenu.test.js`, `tests/leadinhop.test.js`, `tests/secondwind.test.js`, `.github/workflows/test.yml`: append exactly the ones that end up in the diff, comment-stamped. The census legs' porcelain arm makes an omission red IMMEDIATELY, not at commit time.

## Tasks

- [ ] Task 0 — Read the seven boot bodies end to end; write the primitive set into `tests/support/shell-harness.js` by COMPOSING the exact donor code paths (no cleverness: the module ships what the suites already do). Then convert boots one suite at a time, gate after EACH: polish (clock stub — the flake pays), altitude, ascent (+error leg), uxpolish, shell, pausemenu (+error leg), leadinhop (+error leg).
- [ ] Task 1 — D-best deletion in `js/shell.js` + one census-fence leg in `tests/harness.test.js`: `saveBest(` appears EXACTLY 1 time in js/shell.js + the trip path persists (behavior already pinned by v1parity — cite those legs, do not re-pin).
- [ ] Task 2 — CI delta + a source-fence leg in `tests/harness.test.js` parsing `test.yml`: matrix includes 18 AND 26, `tags-ignore` present, `concurrency` present, oracle line `./run_tests.sh` unchanged.
- [ ] Task 3 — Porcelain arm in both census legs; demonstrate in the /tmp clone: plant an untracked scratch file → BOTH censuses red with the arm, green with the arm removed (evidence line, not a permanent leg).
- [ ] Task 4 — Behavior legs in `tests/harness.test.js` (≤2 boots, virtual clock): H1 clock determinism — boot via the module, advance 1000 virtual ms in one jump, assert a D-07-style window closed with ZERO wall time (kills a dropped clock stub); H2 error capture — boot with a render stub that `console.error`s, assert `env.errors` non-empty and the error-leg pattern holds (kills dropped capture wiring).
- [ ] Task 5 — Battery (/tmp clone): **M1** drop the errors-capture wiring → H2/behavior red; **M2** drop the performance stub in the module → H1 + polish :546/:529 red; **M3** restore the restart best-write → fence leg red; **M4** remove the CI matrix → fence leg red; **M5** remove the porcelain arm → the planted-file probe survives (hole re-opens). Gold 535+ legs before/after.
- [ ] Task 6 — Record: gate counts, fork note (SEVEN boots → primitives; ledger :54/:66/:196/:200 get PAID stamps at review close), flake verdict (:184/:185 PAID if :546/:529 run green 3 consecutive full gates). Flip `chore-test-harness-ci-consolidation: review`.

## Dev Agent Record

### File List
