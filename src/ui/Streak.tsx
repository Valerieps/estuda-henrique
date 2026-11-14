import { useState } from 'react';
import type { StreakView, TodayView } from '../application/api-contract';
import { strings } from '../domain/strings';
import { weekday } from '../domain/study/study-day';
import { useServices } from './backend-context';
import { Button } from './components/Button';
import { Notice } from './components/Notice';
import { Sheet } from './components/Sheet';

const s = strings.streak;

/** The flame of the top bar; tapping it opens the Ofensiva sheet. */
export function Flame({ today, onReload }: { today: TodayView | undefined; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  if (!today) return null;
  const { days, litToday } = today.streak;
  return (
    <>
      <button type="button" className="flame" data-lit={litToday} aria-label={s.flame(days, litToday)} onClick={() => setOpen(true)}>
        <span className="icon" aria-hidden="true">
          🔥
        </span>
        <span aria-hidden="true">{days}</span>
      </button>
      {open && <StreakSheet streak={today.streak} onClose={() => setOpen(false)} onReload={onReload} />}
    </>
  );
}

function StreakSheet({ streak, onClose, onReload }: { streak: StreakView; onClose: () => void; onReload: () => void }) {
  const first = weekday(streak.calendar[0].day);
  return (
    <Sheet title={s.title} onClose={onClose}>
      <p className="strong">{s.days(streak.days)}</p>
      <div className="calendar" role="list">
        {s.weekdays.map((letter, i) => (
          <span key={i} className="head" aria-hidden="true">
            {letter}
          </span>
        ))}
        {Array.from({ length: first }, (_, i) => (
          <span key={`pad${i}`} aria-hidden="true" />
        ))}
        {streak.calendar.map((d) => {
          const state = d.counted ? 'counted' : d.rest ? 'rest' : 'missed';
          return (
            <span key={d.day} className="day" role="listitem" data-state={state} aria-label={`${d.day.slice(8)}: ${s[state]}`}>
              {Number(d.day.slice(8))}
            </span>
          );
        })}
      </div>
      <p className="muted small">{s.help}</p>
      {streak.canRepair && <RepairButton onDone={onReload} />}
    </Sheet>
  );
}

/** Consertar ofensiva: shared by the sheet and the warning card. */
export function RepairButton({ onDone }: { onDone: () => void }) {
  const { backend } = useServices();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function repair() {
    setBusy(true);
    setFailed(false);
    const result = await backend.command('streak.repair', {});
    setBusy(false);
    if (result.ok) onDone();
    else setFailed(true);
  }
  return (
    <>
      {failed && <Notice tone="error">{s.repairFailed}</Notice>}
      <Button disabled={busy} onClick={() => void repair()}>
        {s.repair}
      </Button>
    </>
  );
}
