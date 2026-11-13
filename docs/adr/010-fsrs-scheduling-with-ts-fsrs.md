# ADR-010: FSRS scheduling with ts-fsrs, behind one domain file

**Status:** Accepted
**Date:** 2026-11-13
**Decision:** Card scheduling uses `ts-fsrs` 5.4.2, pinned exactly. Only `src/domain/study/scheduler.ts`
imports it; the rest of the app and the server see `SchedulingState` and `Answer`
(`again`, `hard`, `good`). Parameters: FSRS defaults, desired retention 0.9, learning and
relearning steps of 1 and 10 minutes, short-term scheduling on, fuzz off. `SchedulingState` is
plain JSON (ISO dates), stored in `card_states` and, as the state before an answer, in
`reviews.previous_state`, which is how Desfazer restores a card.
**Why:** `docs/spec/estudo.md` asks for FSRS with default parameters and 90% retention, and Errei
steps of 1 and 10 minutes. Writing FSRS by hand risks subtle errors in the formulas. `ts-fsrs` is
the reference TypeScript implementation (MIT), runs in the Worker and the browser, and 5.4.2 has
no dependencies. Fuzz off makes an answer deterministic, so tests and undo are exact. Keeping the
library behind one file means a later version (6.x drops `elapsed_days` and adds a dependency)
changes one file and its tests.
**Alternatives:** 6.0.0, released two weeks before this decision, with a new dependency
(`@open-spaced-repetition/srs-kit`): too new and adds a package. SM-2: not what the spec asks
for, and worse intervals. Our own FSRS implementation: more code to get right, nothing to gain.
