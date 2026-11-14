// A card line shared by Piores cartas and the Tópico screen: front, mastery, errors, last seen,
// and the Editar and Suspender actions (docs/spec/diagnostico.md).
import { useState } from 'react';
import type { TopicCard } from '../application/api-contract';
import { strings } from '../domain/strings';
import { clozeCard } from '../domain/study/cloze';
import { useServices } from './backend-context';
import { Button } from './components/Button';
import { Notice } from './components/Notice';
import { Sheet } from './components/Sheet';

const s = strings.worst;

/** The text of the card's front, with a blank where a cloze passage is hidden. */
export function cardFront(card: Pick<TopicCard, 'kind' | 'front' | 'clozeIndex'>): string {
  if (card.kind === 'basic') return card.front;
  const cloze = clozeCard(card.front, card.clozeIndex);
  return cloze ? `${cloze.before}${s.blank}${cloze.after}` : card.front;
}

interface CardLineProps {
  readonly card: TopicCard;
  /** Present: the line has a checkbox (Estudar estas agora). */
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  /** Called after an edit or a suspension, so the list can reload. */
  readonly onChanged: () => void;
}

export function CardLine({ card, selected, onSelect, onChanged }: CardLineProps) {
  const { backend } = useServices();
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggleSuspended() {
    setFailed(false);
    const result = await backend.command('card.suspend', { cardId: card.cardId, suspended: !card.suspended });
    if (!result.ok) return setFailed(true);
    onChanged();
  }

  const pct = card.mastery === null ? null : Math.round(card.mastery * 100);
  const text = cardFront(card);
  return (
    <li className="card card-line">
      <div className="card-line-main">
        {onSelect && <input type="checkbox" checked={selected === true} onChange={onSelect} aria-label={`${s.select}: ${text}`} />}
        <div className="grow stack">
          {card.problem && (
            <span className="small strong" role="note">
              {s.problem} · <span className="muted">{s.problemHint}</span>
            </span>
          )}
          <span>{text}</span>
          <span className="small muted">
            {card.suspended && `${s.suspendedTag} · `}
            {pct === null ? s.noMastery : s.mastery(pct)} · {s.errors(card.againCount)} · {s.lastSeen(card.lastSeenDay)}
          </span>
        </div>
      </div>
      {failed && <Notice tone="error">{s.actionFailed}</Notice>}
      <div className="card-line-actions">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {s.edit}
        </Button>
        <Button variant="secondary" onClick={() => void toggleSuspended()}>
          {card.suspended ? s.unsuspend : s.suspend}
        </Button>
      </div>
      {editing && (
        <EditNote
          card={card}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

function EditNote({ card, onClose, onSaved }: { card: TopicCard; onClose: () => void; onSaved: () => void }) {
  const { backend } = useServices();
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [hint, setHint] = useState(card.hint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const cloze = card.kind === 'cloze';

  async function save() {
    setSaving(true);
    setError(false);
    const result = await backend.command('note.update', { noteId: card.noteId, front, back: cloze ? undefined : back, hint: hint.trim() === '' ? null : hint });
    setSaving(false);
    if (!result.ok) return setError(true);
    onSaved();
  }

  return (
    <Sheet title={s.edit} onClose={onClose}>
      {error && <Notice tone="error">{s.actionFailed}</Notice>}
      <label className="field">
        <span className="field-label">{cloze ? s.editClozeFront : s.editFront}</span>
        <textarea value={front} onChange={(e) => setFront(e.target.value)} />
      </label>
      {!cloze && (
        <label className="field">
          <span className="field-label">{s.editBack}</span>
          <textarea value={back} onChange={(e) => setBack(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field-label">{s.editHint}</span>
        <textarea value={hint} onChange={(e) => setHint(e.target.value)} />
      </label>
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? s.saving : s.save}
      </Button>
    </Sheet>
  );
}
