// The text of a note as a member sees it: their own version of a system note when they edited one
// (`note_edits`), the note's text otherwise (docs/spec/cartas.md, ADR-009). Every query that
// shows a note's front, back or hint joins NOTE_EDITS (bound to the member's id) and reads the
// columns through noteText.

/** Join after `notes`; takes one parameter, the member's id. */
export const NOTE_EDITS = 'LEFT JOIN note_edits ne ON ne.note_id = notes.id AND ne.member_id = ?';

/** The member's text of a column: a null hint in their version stays null. */
export function noteText(column: 'front' | 'back' | 'hint'): string {
  return `CASE WHEN ne.note_id IS NULL THEN notes.${column} ELSE ne.${column} END`;
}
