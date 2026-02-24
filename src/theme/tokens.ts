export const theme = {
  colors: {
    black: '#000000',
    gold: '#D4AF37',
    white: '#FFFFFF',
    success: '#21C55D',
    warning: '#F59E0B',
    error: '#EF4444',
    gray: {
      light: '#4B5563',
      medium: '#374151',
      dark: '#1F2937',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      display: 32,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    fontFamily: {
      display: '"DM Serif Display", serif',
      body: '"Outfit", sans-serif',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
    md: '0 2px 4px 0 rgba(0, 0, 0, 0.25)',
    lg: '0 4px 8px 0 rgba(0, 0, 0, 0.3)',
    gold: '0 0 20px rgba(212, 175, 55, 0.3)',
  },
} as const;

export type Theme = typeof theme;
