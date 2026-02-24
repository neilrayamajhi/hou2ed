import type { CSSProperties } from 'react';
import { theme } from '../../theme/tokens';
import { focusRing } from '../../theme/styles';

type ToggleOption = {
  value: string;
  label: string;
};

type ToggleProps = {
  options: [ToggleOption, ToggleOption];
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function Toggle({ options, value, onChange, label }: ToggleProps) {
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.sm,
  };

  const labelStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.white,
  };

  const toggleContainerStyle: CSSProperties = {
    display: 'inline-flex',
    backgroundColor: theme.colors.black,
    border: `1px solid ${theme.colors.gold}`,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    gap: 4,
  };

  const optionStyle = (isActive: boolean): CSSProperties => ({
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
    minHeight: 44,
    minWidth: 120,
    border: 'none',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: isActive ? theme.colors.gold : 'transparent',
    color: isActive ? theme.colors.black : theme.colors.white,
  });

  return (
    <div style={containerStyle}>
      {label && <span style={labelStyle}>{label}</span>}
      <div style={toggleContainerStyle} role="group" aria-label={label}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              style={optionStyle(isActive)}
              onClick={() => onChange(option.value)}
              onFocus={(e) => {
                if (!isActive) {
                  Object.assign(e.currentTarget.style, focusRing);
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
