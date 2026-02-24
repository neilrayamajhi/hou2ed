import type { CSSProperties } from 'react';
import { container, section } from '../../theme/styles';
import { theme } from '../../theme/tokens';
import { Card } from '../ui/Card';

type FeatureItem = {
  icon: string;
  title: string;
  description: string;
  features: string[];
};

const features: FeatureItem[] = [
  {
    icon: '🏘️',
    title: 'For Seekers',
    description: 'Clear pathways to verified housing opportunities',
    features: ['Verified listings', 'Transparent eligibility', 'Guided navigation'],
  },
  {
    icon: '📋',
    title: 'Streamlined Process',
    description: 'Organized information flow for faster placement',
    features: ['Structured profiles', 'Reduced back-and-forth', 'Secure documentation'],
  },
  {
    icon: '🤝',
    title: 'For Providers',
    description: 'Tools that streamline workflows and coordination',
    features: ['Applicant visibility', 'Communication tools', 'Faster placements'],
  },
];

export function WhatItDoes() {
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

          @media (max-width: 768px) {
            .features-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>

      <section
        aria-labelledby="features-heading"
        style={{
          ...section,
          paddingTop: theme.spacing.xxl * 3,
          paddingBottom: theme.spacing.xxl * 3,
          position: 'relative',
        }}
      >
        <div style={container()}>
          {/* Section Title */}
          <h2
            id="features-heading"
            style={{
              fontFamily: theme.typography.fontFamily.body,
              fontSize: 'clamp(28px, 5vw, 56px)',
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.gold,
              marginBottom: theme.spacing.lg,
              letterSpacing: '-0.02em',
              textAlign: 'center',
              ...fadeInUp,
            }}
          >
            What HOU2ED Does
          </h2>

          {/* Section Subtitle */}
          <p
            style={{
              fontFamily: theme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 2vw, 20px)',
              fontWeight: theme.typography.fontWeight.regular,
              color: theme.colors.gray.light,
              textAlign: 'center',
              maxWidth: '700px',
              margin: `0 auto ${theme.spacing.xxl * 1.5}px`,
              lineHeight: 1.6,
              ...fadeInUp,
              animationDelay: '0.2s',
            }}
          >
            Connecting seekers and providers with the tools they need for faster, more equitable
            placements.
          </p>

          {/* Feature Cards Grid */}
          <div
            className="features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: theme.spacing.lg,
              marginTop: theme.spacing.xxl,
            }}
          >
            {features.map((feature, index) => (
              <div
                key={feature.title}
                style={{
                  ...fadeInUp,
                  animationDelay: `${0.3 + index * 0.15}s`,
                }}
              >
                <Card
                  style={{
                    height: '100%',
                    border: `1px solid ${theme.colors.gold}40`,
                    backgroundColor: 'rgba(212, 175, 55, 0.02)',
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.border = `1px solid ${theme.colors.gold}`;
                    target.style.backgroundColor = 'rgba(212, 175, 55, 0.05)';
                    target.style.transform = 'translateY(-4px)';
                    target.style.boxShadow = `0 8px 24px rgba(212, 175, 55, 0.15)`;
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.border = `1px solid ${theme.colors.gold}40`;
                    target.style.backgroundColor = 'rgba(212, 175, 55, 0.02)';
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = theme.shadows.md;
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing.md,
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        fontSize: '48px',
                        lineHeight: 1,
                        marginBottom: theme.spacing.sm,
                      }}
                    >
                      {feature.icon}
                    </div>

                    {/* Title */}
                    <h3
                      style={{
                        fontFamily: theme.typography.fontFamily.body,
                        fontSize: theme.typography.fontSize.xl,
                        fontWeight: theme.typography.fontWeight.bold,
                        color: theme.colors.gold,
                        marginBottom: theme.spacing.xs,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontFamily: theme.typography.fontFamily.body,
                        fontSize: theme.typography.fontSize.md,
                        fontWeight: theme.typography.fontWeight.regular,
                        color: theme.colors.white,
                        marginBottom: theme.spacing.md,
                        lineHeight: 1.6,
                      }}
                    >
                      {feature.description}
                    </p>

                    {/* Feature List */}
                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: theme.spacing.sm,
                      }}
                    >
                      {feature.features.map((item) => (
                        <li
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            fontFamily: theme.typography.fontFamily.body,
                            fontSize: theme.typography.fontSize.sm,
                            color: theme.colors.gray.light,
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: theme.colors.gold,
                              flexShrink: 0,
                            }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
