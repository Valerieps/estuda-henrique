# ADR-009: Study data is private to the member who made it

**Status:** Accepted
**Date:** 2026-11-13
**Decision:** Every table of study data (answers, FSRS state, sessions, streak, routine, personal
cards, a user's version of a system card in `note_edits`) carries `member_id`, and every query and command filters by the actor's id taken from the
session, never from the input. No endpoint returns another member's study data, admins included.
The admin's only access to cards is to the system cards (the ones with no owner), to add and edit
them.
**Why:** Henrique is a minor. The owner asked to see nothing of what he does and to edit nothing of
his. Enforcing it in the server, not only hiding it in the interface, matches the rule that roles
are checked on the server (docs/SEGURANCA.md).
**Alternatives:** Letting the admin read his thermometer: rejected by the owner.
