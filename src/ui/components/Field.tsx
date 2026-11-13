import { useId, type InputHTMLAttributes } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Always visible: a placeholder is not a label. */
  label: string;
  /** Shown under the input and announced with it. */
  error?: string | null;
  className?: string;
};

/** A labeled input with its error message tied to it for screen readers. */
export function Field({ label, error, className, ...input }: FieldProps) {
  const errorId = useId();
  return (
    <label className={['field', className].filter(Boolean).join(' ')}>
      <span className="field-label">{label}</span>
      <input aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...input} />
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </label>
  );
}
