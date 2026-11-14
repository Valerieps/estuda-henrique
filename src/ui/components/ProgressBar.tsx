import { strings } from '../../domain/strings';
import type { TopicState } from '../../domain/topic-state';

/**
 * A progress bar that always shows its number ("3 de 20"), so color and length are never the only
 * signal (docs/UI.md). `label` names what is counted, for screen readers; `tone` is a topic state
 * color, or the brand when omitted.
 */
export function ProgressBar({
  value,
  max,
  label,
  tone,
}: {
  value: number;
  max: number;
  label: string;
  tone?: TopicState;
}) {
  const shown = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (shown / max) * 100 : 0;
  return (
    <div className="progressbar" data-tone={tone}>
      <div
        className="progressbar-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        aria-valuetext={strings.components.progress(shown, max)}
      >
        <div className="progressbar-fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progressbar-label">{strings.components.progress(shown, max)}</span>
    </div>
  );
}
