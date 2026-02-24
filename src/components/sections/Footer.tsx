import type { CSSProperties } from 'react';
import { container } from '../../theme/styles';
import { theme } from '../../theme/tokens';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerContainerStyle: CSSProperties = {
    borderTop: `2px solid ${theme.colors.gold}`,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    marginTop: theme.spacing.xxl * 2,
  };

  const contentStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.lg,
    flexWrap: 'wrap',
  };

  const brandStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.gold,
    margin: 0,
  };

  const taglineStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray.light,
    marginTop: theme.spacing.xs,
  };

  const linksContainerStyle: CSSProperties = {
    display: 'flex',
    gap: theme.spacing.lg,
    flexWrap: 'wrap',
  };

  const linkStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.white,
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  };

  const copyrightStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.gray.light,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid rgba(212, 175, 55, 0.2)`,
  };

  return (
    <footer style={footerContainerStyle}>
      <div style={container()}>
        <div style={contentStyle}>
          {/* Brand */}
          <div>
            <h3 style={brandStyle}>HOU2ED</h3>
            <p style={taglineStyle}>Streamlining housing access for everyone</p>
          </div>

          {/* Links */}
          <div style={linksContainerStyle}>
            <a
              href="/privacy"
              style={linkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.colors.white;
              }}
            >
              Privacy
            </a>
            <a
              href="/terms"
              style={linkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.colors.white;
              }}
            >
              Terms
            </a>
            <a
              href="mailto:contact@hou2ed.com"
              style={linkStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.colors.white;
              }}
            >
              Contact
            </a>
          </div>
        </div>

        {/* Copyright */}
        <p style={copyrightStyle}>
          © {currentYear} HOU2ED. All rights reserved. Built to improve housing access for everyone.
        </p>
      </div>
    </footer>
  );
}
