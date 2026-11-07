#!/usr/bin/env bash
# night_loop.sh — generic unattended overnight work loop.
# Generalized from the battle-tested raid-lead kit (tranches 1-2, 16/16 shipped).
#
# Contract per iteration: re-anchor from disk (git + NIGHT.md), pick the FIRST
# unchecked item with a brief, hand it to tools/night/worker.sh (worker never
# commits), run the gate, commit ONLY at green, journal everything.
# Red FAIL_LIMIT times on one item -> BLOCKED.md, never picked again.
#
# Rails: clean+green baseline required to start; iteration + wall-clock budgets;
# per-iteration timeout; abort trap resets the worktree; protected paths are
# checked; a pass whose diff touches only bookkeeping is treated as red.
# This script NEVER touches: git remotes, model lanes, systemd units, or
# anything outside the repo.
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")/../.." || exit 1

CONF=tools/night/night.conf
[ -f "$CONF" ] && . "$CONF"

GATE="${NIGHT_GATE:-./run_tests.sh}"
FAIL_LIMIT="${NIGHT_FAIL_LIMIT:-2}"
MAX_ITERS="${NIGHT_MAX_ITERS:-40}"
MAX_HOURS="${NIGHT_MAX_HOURS:-8}"
ITER_TIMEOUT="${NIGHT_ITER_TIMEOUT:-1800}"
SLEEP_FAIL="${NIGHT_SLEEP_FAIL:-60}"
PROTECT="${NIGHT_PROTECT:-}"                       # space-separated paths/globs the worker must not modify

NIGHT_DIR=.night; mkdir -p "$NIGHT_DIR"
LOG="$NIGHT_DIR/loop_$(date +%Y%m%d_%H%M%S).log"
END=$(( $(date +%s) + MAX_HOURS * 3600 ))

log() { printf '[%s] %s\n' "$(date '+%F %H:%M:%S')" "$*" | tee -a "$LOG"; }
journal() { printf '| %s | %s |\n' "$(date '+%F %H:%M')" "$*" >> JOURNAL.md; git add JOURNAL.md 2>/dev/null; }
fail_count() { cat "$NIGHT_DIR/fail_$1" 2>/dev/null || echo 0; }
bump_fail()  { echo $(( $(fail_count "$1") + 1 )) > "$NIGHT_DIR/fail_$1"; }

abort_reset() { git reset --hard HEAD >/dev/null 2>&1; git clean -fdq >/dev/null 2>&1; }
trap 'log "ABORTED"; journal "loop | ABORTED by signal; worktree reset to HEAD"; git add -A 2>/dev/null; git commit -qm "night: abort bookkeeping" 2>/dev/null; exit 130' INT TERM HUP

# ---------- preflight ----------
[ -x tools/night/worker.sh ] || { echo "no executable tools/night/worker.sh" > "$NIGHT_DIR/BASELINE_PROBLEM"; log "FATAL: worker.sh missing"; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "tree not clean at start" > "$NIGHT_DIR/BASELINE_PROBLEM"; log "FATAL: tree not clean"; exit 1; }
if ! eval "$GATE" >>"$LOG" 2>&1; then
  echo "baseline gate is RED — refusing to start; fix before scheduling" > "$NIGHT_DIR/BASELINE_PROBLEM"
  log "FATAL: baseline gate red"; exit 1
fi
rm -f "$NIGHT_DIR/BASELINE_PROBLEM"
log "start: budget=${MAX_ITERS} iters / ${MAX_HOURS}h, iter-timeout=${ITER_TIMEOUT}s, gate=[$GATE]"
[ "$MAX_ITERS" -eq 0 ] && { log "dry-run: MAX_ITERS=0, preflight only"; exit 0; }

# ---------- pick / mark ----------
pick() {  # first pending item whose brief exists and is under the fail limit
  local id
  while read -r id; do
    [ -f "tools/night/briefs/$id.md" ] || { log "skip $id (no brief)"; continue; }
    [ "$(fail_count "$id")" -ge "$FAIL_LIMIT" ] && continue
    echo "$id"; return 0
  done < <(grep -oP '^- \[ \] \K[^:]+(?=:)' NIGHT.md)
  return 1
}
mark_done()    { sed -i "s/^- \[ \] $1:/- [x] $1:/" NIGHT.md; }
mark_blocked() {
  sed -i "s/^- \[ \] $1:/- [!] $1:/" NIGHT.md
  printf '\n## %s — BLOCKED after %s failed attempts (%s)\n%s\n' \
    "$1" "$FAIL_LIMIT" "$(date '+%F %H:%M')" "$2" >> BLOCKED.md
  git add BLOCKED.md NIGHT.md && git commit -qm "night: block $1 after $FAIL_LIMIT failures"
}

protected_touched() {  # echo violating files (worker must not touch these)
  local p
  for p in $PROTECT; do git diff --name-only HEAD -- $p; done
}

# ---------- summary (morning report) ----------
summarize() {
  { printf '# Morning summary — %s\n\n' "$(date '+%F %H:%M')"
    printf 'done: %s | blocked: %s | pending: %s | HEAD: %s\n\n' \
      "$(grep -c '^- \[x\]' NIGHT.md)" "$(grep -c '^- \[!\]' NIGHT.md)" \
      "$(grep -c '^- \[ \]' NIGHT.md)" "$(git rev-parse --short HEAD)"
    printf '## Last 40 journal rows\n\n'; tail -n 40 JOURNAL.md
    [ -s BLOCKED.md ] && { printf '\n## BLOCKED (read me first)\n'; tail -n 40 BLOCKED.md; }
  } > "$NIGHT_DIR/SUMMARY.md"
}

# ---------- main loop ----------
for i in $(seq 1 "$MAX_ITERS"); do
  [ "$(date +%s)" -ge "$END" ] && { log "budget: wall-clock end"; break; }
  item=$(pick) || { log "backlog exhausted"; break; }
  title=$(grep -m1 "$item:" NIGHT.md | sed "s/.*$item: //")
  sha=$(git rev-parse --short HEAD)
  log "iter $i: $item — $title (baseline $sha)"

  timeout "$ITER_TIMEOUT" tools/night/worker.sh "tools/night/briefs/$item.md" "$item" "$sha" "$title" >>"$LOG" 2>&1
  rc=$?
  [ "$rc" -eq 124 ] && log "  timeout after ${ITER_TIMEOUT}s"

  gate_ok=1; why=""
  if [ "$rc" -ne 0 ]; then gate_ok=0; why="worker rc=$rc"
  elif [ -z "$(git status --porcelain)" ]; then gate_ok=0; why="vacuous: worker changed nothing"
  elif [ -n "${PROTECT// /}" ] && [ -n "$(protected_touched)" ]; then
    gate_ok=0; why="protected paths touched: $(protected_touched | tr '\n' ' ')"
  elif [ -z "$( { git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
       | sort -u | grep -vE '^(NIGHT\.md|JOURNAL\.md|BLOCKED\.md|\.night/|tools/night/)' )" ]; then
    gate_ok=0; why="vacuous: diff touches only bookkeeping"
  elif [ -x "tools/night/gates/$item.sh" ]; then
    tools/night/gates/$item.sh >>"$LOG" 2>&1 || { gate_ok=0; why="item gate red"; }
  else
    eval "$GATE" >>"$LOG" 2>&1 || { gate_ok=0; why="gate red"; }
  fi

  if [ "$gate_ok" -eq 1 ]; then
    git add -A && git commit -qm "night($item): $title [iter $i, gate green]" \
      && { log "  PASS -> $(git rev-parse --short HEAD)"
           mark_done "$item"; journal "$item | PASS \`$(git rev-parse --short HEAD)\`"
           git add -A && git commit -qm "night: bookkeeping — $item checked"
           continue; }
  fi

  # red path
  log "  FAIL ($why)"
  abort_reset
  bump_fail "$item"
  n=$(fail_count "$item")
  log "  FAIL attempt $n/$FAIL_LIMIT"
  if [ "$n" -ge "$FAIL_LIMIT" ]; then
    log "  BLOCKED: $item"
    mark_blocked "$item" "Tried $n iterations, last: iter $i, why: $why. Log: $LOG"
    journal "$item | BLOCKED after $n fails"
  else
    journal "$item | fail $n/$FAIL_LIMIT"
  fi
  git add -A >/dev/null 2>&1; git commit -qm "night: bookkeeping — $item attempt $n" >/dev/null 2>&1
  sleep "$SLEEP_FAIL"
done

git add -A >/dev/null 2>&1; git commit -qm "night: loop close-out" >/dev/null 2>&1
summarize
log "loop end at $(git rev-parse --short HEAD); gate: $(eval "$GATE" 2>/dev/null | tail -1)"
