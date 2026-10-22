# Agent-Verifiability Contract

Code in this repo is written so an unattended agent can **identify** what is
done, **run** it, and **validate** it without a human in the loop. When any
check below is impossible, that is a bug in the repo, not in the agent.

## The ten rules

1. **One gate command.** `./run_tests.sh` (or npm/pytest/cargo equivalent)
   runs everything and exits non-zero on any failure. Prose ACs don't exist.
2. **Parseable PASS line.** The gate prints `N/M passed` — countable, diffable.
3. **The gate is sacred.** tests/, the gate script, and CI config are in
   `NIGHT_PROTECT`; a worker touching them is instant red.
4. **AGENTS.md names the commands.** build / test / verify / run-headless /
   probe-state, plus a do-not-touch list. Agents read this first.
5. **Headless by default.** GUI is a thin shell over a logic core that runs
   and asserts without a display (`godot --headless`, LÖVE harness, DOM-free
   sim). Every user-visible behavior has a non-GUI path to the same code.
6. **Injectable randomness and time.** Seeded RNG, injected `now()`. Any run
   reproducible from (seed, inputs). A bug that only appears unseeded is a
   design bug.
7. **State is data.** Dumps, replays, or JSONL event streams — so a probe
   script can PRINT a mechanism's real values before an assertion is trusted
   (green-gate-but-wrong-design is the classic false pass).
8. **CI runs the same oracle**, from a clean checkout, never on the dev box.
9. **Framework artifacts carry verify.** GSD plans have `<verify>` with a
   runnable command; BMAD ACs each have a command line. If writing the
   command is impossible, the story/plan isn't well-formed yet.
10. **Runs isolated.** Pinned ports, scratch dirs, worktree-safe — no
    ambient host services or absolute-path fixtures.

## Morning flow consequence

Night agents ship only what the oracle confirms; `verification: pending`
and `review` are the highest status an unattended run may write. A human (or
a morning fresh-context reviewer on a different model) promotes to done.
