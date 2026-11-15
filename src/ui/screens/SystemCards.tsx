import { useState } from 'react';
import type { NoteView } from '../../application/api-contract';
import { strings } from '../../domain/strings';
import { useServices } from '../backend-context';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { SelectField, TextAreaField } from '../components/Field';
import { Notice } from '../components/Notice';
import { Sheet } from '../components/Sheet';
import { CreateSheet } from '../CreateSheet';
import { useQuery } from '../use-query';

const s = strings.adminCards;

/** The admin's home: the system cards by topic, with create, edit and delete (docs/spec/cartas.md). */
export function SystemCards() {
  const subjects = useQuery('subjects', {}, ['subjects']);
  const [topicId, setTopicId] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!subjects.data) {
    return subjects.error ? (
      <section className="stack">
        <Notice tone="error">{strings.genericError}</Notice>
        <Button onClick={subjects.reload}>{strings.retry}</Button>
      </section>
    ) : (
      <p className="muted" role="status">{s.loading}</p>
    );
  }

  const topics = subjects.data.flatMap((subject) => subject.topics.map((t) => ({ ...t, subject: subject.name })));
  if (topics.length === 0) return <EmptyState title={s.title} text={s.noTopics} />;
  const current = topics.find((t) => t.id === topicId) ?? topics[0];
  const grouped = subjects.data.length > 1;
  const options = (list: readonly { id: string; name: string }[]) =>
    list.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ));

  return (
    <section className="stack">
      <h1>{s.title}</h1>
      {notice && <Notice>{notice}</Notice>}
      <Button
        onClick={() => {
          setNotice(null);
          setCreating(true);
        }}
      >
        {strings.create.newCard}
      </Button>
      <SelectField label={s.topic} value={current.id} onChange={(e) => setTopicId(e.target.value)}>
        {subjects.data.map((subject) =>
          grouped ? (
            <optgroup key={subject.id} label={subject.name}>
              {options(subject.topics)}
            </optgroup>
          ) : (
            options(subject.topics)
          ),
        )}
      </SelectField>
      <TopicNotes topicId={current.id} />
      {creating && (
        <CreateSheet
          onClose={() => setCreating(false)}
          onDone={(message) => {
            setCreating(false);
            setNotice(message);
          }}
        />
      )}
    </section>
  );
}

function TopicNotes({ topicId }: { topicId: string }) {
  const notes = useQuery('notes', { topicId }, ['cards']);
  if (!notes.data) {
    return notes.error ? (
      <>
        <Notice tone="error">{strings.genericError}</Notice>
        <Button onClick={notes.reload}>{strings.retry}</Button>
      </>
    ) : (
      <p className="muted" role="status">{s.loading}</p>
    );
  }
  if (notes.data.length === 0) return <p className="muted">{s.empty}</p>;
  return (
    <>
      <p className="small muted">{s.count(notes.data.length)}</p>
      <ul className="stack">
        {notes.data.map((note) => (
          <NoteLine key={note.id} note={note} onChanged={notes.reload} />
        ))}
      </ul>
    </>
  );
}

function NoteLine({ note, onChanged }: { note: NoteView; onChanged: () => void }) {
  const { backend } = useServices();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    const result = await backend.command('note.delete', { noteId: note.id, system: true });
    setBusy(false);
    if (!result.ok) return setFailed(true);
    setDeleting(false);
    onChanged();
  }

  return (
    <li className="card stack">
      <span>{note.front}</span>
      {note.kind === 'basic' && <span className="small muted">{note.back}</span>}
      {note.hint && <span className="small muted">{note.hint}</span>}
      <div className="row">
        <Button variant="secondary" onClick={() => setEditing(true)}>
          {s.edit}
        </Button>
        <Button variant="secondary" onClick={() => setDeleting(true)}>
          {s.delete}
        </Button>
      </div>
      {editing && (
        <EditNote
          note={note}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}
      {deleting && (
        <Sheet title={s.deleteTitle} onClose={() => setDeleting(false)}>
          <p>{s.deleteBody}</p>
          {failed && <Notice tone="error">{s.failed}</Notice>}
          <Button disabled={busy} onClick={() => void remove()}>
            {s.deleteConfirm}
          </Button>
          <Button variant="secondary" onClick={() => setDeleting(false)}>
            {s.cancel}
          </Button>
        </Sheet>
      )}
    </li>
  );
}

function EditNote({ note, onClose, onSaved }: { note: NoteView; onClose: () => void; onSaved: () => void }) {
  const { backend } = useServices();
  const [front, setFront] = useState(note.front);
  const [back, setBack] = useState(note.back);
  const [hint, setHint] = useState(note.hint ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const cloze = note.kind === 'cloze';

  async function save() {
    setSaving(true);
    setError(false);
    const result = await backend.command('note.update', {
      noteId: note.id,
      front,
      back: cloze ? undefined : back,
      hint: hint.trim() === '' ? null : hint,
      system: true,
    });
    setSaving(false);
    if (!result.ok) return setError(true);
    onSaved();
  }

  return (
    <Sheet title={s.edit} onClose={onClose}>
      {error && <Notice tone="error">{s.failed}</Notice>}
      <TextAreaField label={cloze ? s.clozeFront : s.front} value={front} onChange={(e) => setFront(e.target.value)} />
      {!cloze && <TextAreaField label={s.back} value={back} onChange={(e) => setBack(e.target.value)} />}
      <TextAreaField label={s.hint} value={hint} onChange={(e) => setHint(e.target.value)} />
      <Button disabled={saving} onClick={() => void save()}>
        {saving ? s.saving : s.save}
      </Button>
    </Sheet>
  );
}
