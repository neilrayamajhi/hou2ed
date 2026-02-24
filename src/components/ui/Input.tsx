import type { CSSProperties, InputHTMLAttributes } from 'react';
import { theme } from '../../theme/tokens';
import { column } from '../../theme/styles';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helpText?: string;
};

export function Input({ label, error, helpText, id, style, ...props }: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helpId = helpText ? `${inputId}-help` : undefined;

  const labelStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  };

  const inputStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    backgroundColor: theme.colors.black,
    color: theme.colors.white,
    border: `1px solid ${error ? theme.colors.error : theme.colors.white}`,
    borderRadius: theme.borderRadius.md,
    padding: `${theme.spacing.md}px`,
    minHeight: 48,
    width: '100%',
    transition: 'all 0.2s ease',
    outline: 'none',
  };

  const helpTextStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray.light,
    marginTop: theme.spacing.xs,
  };

  const errorTextStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  };

  return (
    <div style={{ ...column(theme.spacing.xs), ...style }}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={inputStyle}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, helpId].filter(Boolean).join(' ') || undefined}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.colors.gold;
          e.currentTarget.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.2)`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? theme.colors.error : theme.colors.white;
          e.currentTarget.style.boxShadow = 'none';
        }}
        {...props}
      />
      {helpText && !error && (
        <span id={helpId} style={helpTextStyle}>
          {helpText}
        </span>
      )}
      {error && (
        <span id={errorId} style={errorTextStyle} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
