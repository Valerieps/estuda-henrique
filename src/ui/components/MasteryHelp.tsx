import { strings } from '../../domain/strings';
import { Icon } from './Icon';

/**
 * What "Domínio" means, one tap away: a phone has no hover, so a disclosure stands in for a tooltip.
 * Native <details>, so it opens with the keyboard and screen readers announce it.
 */
export function MasteryHelp() {
  return (
    <details className="mastery-help">
      <summary>
        <Icon name="info" />
        {strings.components.masteryHelpLabel}
      </summary>
      <p>{strings.components.masteryHelp}</p>
    </details>
  );
}
