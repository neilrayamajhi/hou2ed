import type { CSSProperties } from 'react';
import { theme } from './tokens';

// Breakpoints for responsive design
export const breakpoints = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
};

export const screen: CSSProperties = {
  minHeight: '100vh',
  backgroundColor: theme.colors.black,
  color: theme.colors.white,
  position: 'relative',
};

export const container = (maxWidth = 1200): CSSProperties => ({
  maxWidth: `${maxWidth}px`,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: theme.spacing.md,
  paddingRight: theme.spacing.md,
});

export const section: CSSProperties = {
  paddingTop: theme.spacing.xxl * 2,
  paddingBottom: theme.spacing.xxl * 2,
};

export const styleHeading: CSSProperties = {
  fontFamily: theme.typography.fontFamily.display,
  fontSize: theme.typography.fontSize.display,
  fontWeight: theme.typography.fontWeight.bold,
  color: theme.colors.gold,
  lineHeight: 1.2,
  letterSpacing: '-0.02em',
};

export const styleSubheading: CSSProperties = {
  fontFamily: theme.typography.fontFamily.display,
  fontSize: theme.typography.fontSize.xxl,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.gold,
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
};

export const styleBody: CSSProperties = {
  fontFamily: theme.typography.fontFamily.body,
  fontSize: theme.typography.fontSize.md,
  fontWeight: theme.typography.fontWeight.regular,
  color: theme.colors.white,
  lineHeight: 1.6,
};

export const row = (gap = theme.spacing.md): CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  gap: `${gap}px`,
});

export const column = (gap = theme.spacing.md): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: `${gap}px`,
});

export const divider: CSSProperties = {
  height: '2px',
  backgroundColor: theme.colors.gold,
  opacity: 0.3,
  border: 'none',
  width: '100%',
};

export const focusRing: CSSProperties = {
  outline: `2px solid ${theme.colors.gold}`,
  outlineOffset: '2px',
};

export const hitTarget = (size = 44): CSSProperties => ({
  minWidth: `${size}px`,
  minHeight: `${size}px`,
});

export const grain: CSSProperties = {
  backgroundImage: `
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
  `,
  backgroundSize: '50px 50px',
  backgroundPosition: 'center',
};
