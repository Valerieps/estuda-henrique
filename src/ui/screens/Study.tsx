import { useState } from 'react';
import { strings } from '../../domain/strings';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { navigate } from '../router';

/**
 * The session layer: full screen, over the app, without its bars (docs/spec/estudo.md). The X asks
 * before leaving. The session itself replaces the empty state.
 */
export function Study() {
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="session-layer">
      <header>
        <Button variant="secondary" aria-label={strings.study.exit} onClick={() => setLeaving(true)}>
          ×
        </Button>
      </header>
      <div className="screen">
        {leaving ? (
          <EmptyState title={strings.study.exitTitle} text={strings.study.exitText}>
            <div className="stack">
              <Button onClick={() => setLeaving(false)}>{strings.study.keepGoing}</Button>
              <Button variant="secondary" onClick={() => navigate('/')}>
                {strings.study.exitNow}
              </Button>
            </div>
          </EmptyState>
        ) : (
          <EmptyState title={strings.empty.study.title} text={strings.empty.study.text} />
        )}
      </div>
    </div>
  );
}
