import type { CSSProperties } from 'react';
import { container, section } from '../../theme/styles';
import { theme } from '../../theme/tokens';
import { Card } from '../ui/Card';

export function Mission() {
  const fadeInUp: CSSProperties = {
    animation: 'fadeInUp 0.8s ease-out forwards',
    opacity: 0,
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>

      <section
        id="mission"
        aria-labelledby="mission-heading"
        style={{
          ...section,
          paddingTop: theme.spacing.xxl * 3,
          paddingBottom: theme.spacing.xxl * 3,
          position: 'relative',
        }}
      >
        {/* Top Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: `linear-gradient(to right, transparent, ${theme.colors.gold}40, transparent)`,
            marginBottom: theme.spacing.xxl * 2,
          }}
        />

        <div
          style={{
            ...container(),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Section Title */}
          <h2
            id="mission-heading"
            style={{
              fontFamily: theme.typography.fontFamily.body,
              fontSize: 'clamp(28px, 5vw, 56px)',
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.gold,
              marginBottom: theme.spacing.xxl,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              ...fadeInUp,
            }}
          >
            Our Mission
          </h2>

          {/* Body Copy */}
          <div
            style={{
              maxWidth: '720px',
              marginBottom: theme.spacing.xxl * 1.5,
            }}
          >
            <p
              style={{
                fontFamily: theme.typography.fontFamily.body,
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: theme.typography.fontWeight.regular,
                color: theme.colors.white,
                lineHeight: 1.8,
                marginBottom: theme.spacing.lg,
                ...fadeInUp,
                animationDelay: '0.2s',
              }}
            >
              Housing access shouldn't be complicated. HOU2ED reduces friction in the placement
              process by connecting seekers with providers through a transparent, efficient
              platform.
            </p>

            <p
              style={{
                fontFamily: theme.typography.fontFamily.body,
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: theme.typography.fontWeight.regular,
                color: theme.colors.white,
                lineHeight: 1.8,
                marginBottom: theme.spacing.lg,
                ...fadeInUp,
                animationDelay: '0.3s',
              }}
            >
              We provide clear eligibility criteria, verified listings, and streamlined workflows
              that support faster, more equitable placement for both seekers and providers.
            </p>
          </div>

          {/* Callout Card */}
          <div
            style={{
              maxWidth: '800px',
              width: '100%',
              ...fadeInUp,
              animationDelay: '0.6s',
            }}
          >
            <Card
              style={{
                border: `2px solid ${theme.colors.gold}`,
                backgroundColor: 'rgba(212, 175, 55, 0.03)',
                backdropFilter: 'blur(10px)',
                boxShadow: `0 0 40px rgba(212, 175, 55, 0.1)`,
              }}
            >
              <p
                style={{
                  fontFamily: theme.typography.fontFamily.body,
                  fontSize: 'clamp(18px, 2.5vw, 24px)',
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.gold,
                  lineHeight: 1.6,
                  textAlign: 'center',
                  margin: `${theme.spacing.md}px 0`,
                }}
              >
                " Every person deserves a clear path to secure housing. We're building the platform
                to make it happen."
              </p>
            </Card>
          </div>
        </div>

        {/* Bottom Divider */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: `linear-gradient(to right, transparent, ${theme.colors.gold}40, transparent)`,
            marginTop: theme.spacing.xxl * 2,
          }}
        />
      </section>
    </>
  );
}
