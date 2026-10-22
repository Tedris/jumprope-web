#!/usr/bin/env bash
# worker.sh — one-shot coding worker for the night loop.
# Contract: argv = <brief-path> <id> <baseline-sha> <title>; exit 0 on
# "attempt done, let the orchestrator gate it". NEVER commit; the loop gates
# and commits. Edit this per repo to change engine/model/flags — the loop
# itself never changes.
set -uo pipefail
BRIEF="$1"; ID="$2"; SHA="$3"; TITLE="$4"

# Optional per-repo overrides sourced from night.conf is already done by the
# loop; here honor NIGHT_MODEL if set (provider/model for opencode).
MODEL_ARGS=()
[ -n "${NIGHT_MODEL:-}" ] && MODEL_ARGS=(--model "$NIGHT_MODEL")

exec timeout $(( ${NIGHT_ITER_TIMEOUT:-1800} + 30 )) \
  opencode run "${MODEL_ARGS[@]}" -f "$BRIEF" --title "night-$ID" \
  "Implement $BRIEF exactly (item $ID: $TITLE). Read the brief and every file it names first. Baseline is HEAD $SHA. Do NOT commit and do NOT touch git remotes, the network beyond package installs, model lanes, systemd units, or anything outside this repo — the orchestrator verifies and commits. Only files the brief's Deliverables allow may change. Run the gate command named in the brief when done and report the final PASS line."
