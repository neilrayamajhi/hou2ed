import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { theme } from '../../theme/tokens';

type CardProps = {
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
};

export function Card({ header, children, footer, style, onMouseEnter, onMouseLeave }: CardProps) {
  const cardStyle: CSSProperties = {
    backgroundColor: theme.colors.black,
    border: `1px solid ${theme.colors.gold}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: theme.shadows.md,
    overflow: 'hidden',
  };

  const headerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gold}`,
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.gold,
  };

  const bodyStyle: CSSProperties = {
    padding: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.white,
    lineHeight: 1.6,
  };

  const footerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderTop: `1px solid rgba(212, 175, 55, 0.2)`,
  };

  return (
    <div style={{ ...cardStyle, ...style }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {header && <div style={headerStyle}>{header}</div>}
      <div style={bodyStyle}>{children}</div>
      {footer && <div style={footerStyle}>{footer}</div>}
    </div>
  );
}
