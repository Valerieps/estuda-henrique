import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

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

type Shared = { label: string; error?: string | null; className?: string };

function Wrapper({ label, error, className, errorId, children }: Shared & { errorId: string; children: ReactNode }) {
  return (
    <label className={['field', className].filter(Boolean).join(' ')}>
      <span className="field-label">{label}</span>
      {children}
      {error && (
        <span id={errorId} className="field-error">
          {error}
        </span>
      )}
    </label>
  );
}

/** A labeled multi-line input. */
export function TextAreaField({ label, error, className, ...input }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = useId();
  return (
    <Wrapper label={label} error={error} className={className} errorId={errorId}>
      <textarea aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...input} />
    </Wrapper>
  );
}

/** A labeled native select; its options are the children. */
export function SelectField({ label, error, className, children, ...input }: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  const errorId = useId();
  return (
    <Wrapper label={label} error={error} className={className} errorId={errorId}>
      <select aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...input}>
        {children}
      </select>
    </Wrapper>
  );
}
