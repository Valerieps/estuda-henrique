import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

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

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={classes(variant, className)} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonVariant };

/** A link that looks like a button: for navigation (a URL), never for an action. */
export function ButtonLink({ variant = 'primary', className, ...props }: ButtonLinkProps) {
  return <a className={classes(variant, className)} {...props} />;
}
