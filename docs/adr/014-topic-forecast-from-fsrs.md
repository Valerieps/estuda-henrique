# ADR-014: Topic forecast simulated from the FSRS state

**Status:** Accepted
**Date:** 2026-11-15
**Decision:** The forecast on the Tópico screen (`docs/spec/diagnostico.md`) is a pure function in
`src/domain/study/forecast.ts`: for each of the next N days (7), it computes each studied card's
retrievability with the same ts-fsrs forgetting curve as the mastery (ADR-010), assuming every card
that falls due is reviewed on its due day and answered Acertei (its state is advanced with ts-fsrs
`Rating.Good` on that day), and no new cards are added. The topic's forecast is the lowest daily
average over the window; how it is worded (cut-off, rounding, minimum days of data) is a product
rule in the spec. The server feeds it the
member's `card_states` for the topic, as it does for the mastery; no new table.
**Why:** "Fazendo só as revisões do dia" means exactly this scenario; using the scheduler itself
keeps the forecast consistent with the mastery he already sees, and it needs no stored data.
**Alternatives:** Extrapolating the topic's mastery line from `topic_snapshots`: no new code in the
domain, but it ignores which cards fall due and is noisy with few days of data.
