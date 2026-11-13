# ADR-008: Online-only app, data in the group's Durable Object

**Status:** Accepted
**Date:** 2026-11-13
**Decision:** The app keeps no study data on the device. Cards, answers and FSRS state live in the
`Group` Durable Object (ADR-004) and are read and written through the API. The app needs a network
connection; it does not queue answers offline. The PWA (manifest, icons) stays only so it can be
installed on the home screen. The PRD's local-first rules (IndexedDB, RNF02) and the JSON backup
(RF23, RNF06) are dropped.
**Why:** The owner chose the cloud app with Google sign-in, and Henrique always has internet. The
data stays in Cloudflare, which the owner (his aunt, as his guardian) accepts. With one source of
truth there is no sync to build and no backup to remember.
**Alternatives:** Local-first with IndexedDB and a JSON backup (the PRD): no server, but a cleared
Chrome or a new phone loses everything. Offline answers queued and synced later: more code for a
case that does not happen for this user.
