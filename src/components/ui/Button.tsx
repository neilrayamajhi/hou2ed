import type { CSSProperties, ButtonHTMLAttributes } from 'react';
import { theme } from '../../theme/tokens';
import { focusRing } from '../../theme/styles';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'lg' | 'md';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const baseStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.fontWeight.semibold,
    border: 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled || loading ? 0.5 : 1,
  };

  const sizeStyles: Record<ButtonSize, CSSProperties> = {
    lg: {
      minHeight: 48,
      padding: `${theme.spacing.md}px ${theme.spacing.xl}px`,
      fontSize: theme.typography.fontSize.lg,
      borderRadius: theme.borderRadius.lg,
    },
    md: {
      minHeight: 44,
      padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
      fontSize: theme.typography.fontSize.md,
      borderRadius: theme.borderRadius.md,
    },
  };

  const variantStyles: Record<ButtonVariant, CSSProperties> = {
    primary: {
      backgroundColor: theme.colors.gold,
      color: theme.colors.black,
      boxShadow: theme.shadows.gold,
    },
    secondary: {
      backgroundColor: 'transparent',
      color: theme.colors.gold,
      border: `2px solid ${theme.colors.gold}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.white,
      border: '2px solid transparent',
    },
  };

  const hoverStyles: CSSProperties = {
    transform: disabled || loading ? 'none' : 'translateY(-1px)',
    boxShadow: variant === 'primary' ? '0 0 30px rgba(212, 175, 55, 0.5)' : theme.shadows.md,
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled || loading}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusRing);
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, hoverStyles);
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = variant === 'primary' ? theme.shadows.gold : 'none';
      }}
      {...props}
    >
      {loading && <span>⏳</span>}
      {children}
    </button>
  );
}
