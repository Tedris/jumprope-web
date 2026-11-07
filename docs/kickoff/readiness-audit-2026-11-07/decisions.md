# Decisions — readiness interview 2026-11-07 (brownfield, next_milestone)

All four gap questions were answered in one clarify round; decisions below are
the record. Write-back targets listed per decision.

## D-001 — Situation: next_milestone (2026-11-07)
Mid-milestone continuation toward the v2 summit gate (epics 3–6, exit = Story
6.1 policy-bot summit gate). Confirmed by user against poc_to_demo/drift.
Evidence: sprint-status.yaml (epic-1 done, epic-2 done, epic-3 in-progress,
Story 3.1 at review), 303/303 tests green.

## D-002 — TRACK-1 music content gets a story (2026-11-07)
Owner: **Story 5.6 "TRACK-1 — the music content" (Epic 5: Feel & Fidelity)**.
Mechanism is shipped and test-pinned; the story ships the file at
`audio/track.ogg` (seamless loop). Acquisition route (generated vs supplied)
is a named decision point at story start — no serving-lane switching, per
standing directive.
Write-back: epics.md (Epic 5 + Story 5.6), sprint-status.yaml (`5-6`), PRD
Open Items row.

## D-003 — Housekeeping becomes one chore story before 3.2 (2026-11-07)
**Story 3.0 "Repo hygiene — VERIFY-CONTRACT in force"**: `./run_tests.sh` gate
script (rule 1/2), GitHub Actions CI on the same oracle (rule 8), retire the
October night-loop files (NIGHT.md/JOURNAL.md/BLOCKED.md/tools/night) to
docs/archive/, VERIFY-CONTRACT reconciled with reality. Lands before Story 3.2.
Write-back: epics.md (Epic 3 + Story 3.0), sprint-status.yaml (`3-0`).

## D-004 — META-01 pinned as the milestone after epics 3–6 (2026-11-07)
The disguise peel is the committed next milestone: **Epic 7 "The Peel"** moves
from candidate to pinned. CARD-09 already owned (Story 6.3 verdict); WR-02
already owned (Story 5.4); CARD-08 ships as Epic 3 FR12. PRD "Next-Milestone
Questions" are hereby answered.
Write-back: prd.md (Open Items, Non-Goals, Next-Milestone Questions),
epics.md Epic 7 header wording.

## D-005 — PRD Current State refreshed (2026-11-07)
v2 progress recorded: epics 1–2 done (2026-11-06), Story 3.1 in review,
303/303 green at audit; out-of-scope refreshed to point meta progression at
Epic 7.

## Land-pending (not a decision — an action for the next session)
Story 3.1's review-round change set is uncommitted in the working tree. Land
it per housekeeping (commit at done), and per deferred-work's land rule,
commit this audit's planning-doc changes as a separate planning commit.

## D-006 — Sound direction deferred; config surface packaged (2026-11-07)
The music/sound *direction* is undecided — the user's call, deferred
explicitly. Story 5.6's kickoff now decides direction before sourcing (AC
amended). What is NOT deferred: the audio **config surface** — the v1 audio
layer shipped persisted mute/volume controlled only by hidden keyboard
shortcuts (`Mute` key, `-`/`=`), and pause is a bare freeze-frame with no
menu. Packaged as **FR30 + Story 5.7 "Pause menu — the audio config
surface"** (Epic 5, land-early): pause opens Resume + volume control + sound
on/off, driving the existing `audio.js` seams through the existing storage
path. Mechanism is complete; only the UI surface is new.
Process note (user directive): the readiness skill stops at packaging —
stories are run separately by the user, not inside this interview.
