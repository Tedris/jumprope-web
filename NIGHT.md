# NIGHT.md — overnight backlog (loop contract)

Rules for the night loop (`tools/night/night_loop.sh`) and its operators:
- Each iteration: re-anchor from git + this file, pick the FIRST unchecked
  item, implement per its brief in `tools/night/briefs/<ID>.md`, run the
  gate, commit ONLY at green, journal to JOURNAL.md.
- Red twice on the same item → mark `- [!]` here, append to BLOCKED.md,
  stop taking that item. Silence means progress; BLOCKED.md means you.
- Never touch: model lanes, systemd units, git remotes, `git push`, anything
  outside this repo. Human-gated by owner directive.
- Interleave independent items across lanes so a stall in one doesn't
  starve the night. Feel/taste items stay out of the queue entirely.

## Format
`- [ ] ID: title` → pending · `- [x]` shipped · `- [!]` blocked/skipped

## Backlog — tranche 1 (YYYY-MM-DD)

<!-- Items in PRIORITY ORDER; the loop takes the first unchecked with a brief.
     - [ ] FEA-1: first item must have no unmet dependencies — brief FEA-1.md -->
- [x] GSD-04-01: 04-feel-audio plan 04-01 — brief GSD-04-01.md
- [!] GSD-04-02: 04-feel-audio plan 04-02 — brief GSD-04-02.md
- [x] GSD-04-03: 04-feel-audio plan 04-03 — brief GSD-04-03.md
- [!] GSD-04-04: 04-feel-audio plan 04-04 — brief GSD-04-04.md
- [ ] FEEL-SWEEP: forgiveness-window soak sweep -> morning tuning table — brief FEEL-SWEEP.md
