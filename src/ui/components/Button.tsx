import { useId, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react';

/**
 * The app's buttons. One `primary` per screen, for the action the screen exists for; `secondary`
 * for the rest; `danger` for what deletes or removes (docs/UI.md).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'secondary-danger';

function classes(variant: ButtonVariant, extra?: string) {
  const variantClass = {
    primary: '',
    secondary: 'secondary',
    danger: 'danger',
    'secondary-danger': 'secondary danger',
  }[variant];
  return ['button', variantClass, extra].filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Why the button is disabled, shown as text under it while it is (docs/UI.md). */
  disabledReason?: string;
};

export function Button({ variant = 'primary', className, type = 'button', disabledReason, ...props }: ButtonProps) {
  const reasonId = useId();
  const button = <button type={type} className={classes(variant, className)} {...props} />;
  if (!props.disabled || !disabledReason) return button;
  return (
    <span className="button-with-reason">
      <button type={type} className={classes(variant, className)} {...props} aria-describedby={reasonId} />
      <span id={reasonId} className="button-reason">
        {disabledReason}
      </span>
    </span>
  );
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant };

/** A link that looks like a button: for navigation (a URL), never for an action. */
export function ButtonLink({ variant = 'primary', className, ...props }: ButtonLinkProps) {
  return <a className={classes(variant, className)} {...props} />;
}
