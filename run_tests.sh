#!/usr/bin/env bash
# The one gate (VERIFY-CONTRACT rules 1-2): node --test in TAP mode, node's
# exit code as the oracle, and a parseable "N/M passed" line for humans and
# agents alike. Never exit on a pipeline member's status — PIPESTATUS[0].
set -u
cd "$(dirname "$0")"

log=$(mktemp)
trap 'rm -f "$log"' EXIT

node --test --test-reporter=tap tests/ 2>&1 | tee "$log"
rc=${PIPESTATUS[0]}

# TAP summary lines ("# tests 304" / "# pass 304") are ASCII and locale-stable;
# the default spec reporter's unicode-prefixed lines are not greppable.
counts=$(awk '/^# tests [0-9]+$/ {t=$3} /^# pass [0-9]+$/ {p=$3}
  END {if (t == "") print "no-summary"; else printf "%d/%d", (p == "" ? 0 : p), t}' "$log")
if [ "$counts" = "no-summary" ]; then
  echo "run_tests.sh: no TAP summary parsed — the suite did not run" >&2
  exit 1
fi

echo "${counts} passed"
exit "$rc"
