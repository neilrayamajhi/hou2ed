import type { CSSProperties } from 'react';
import { container, section, grain } from '../../theme/styles';
import { theme } from '../../theme/tokens';
import { Button } from '../ui/Button';

export function Hero() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Animation keyframes
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

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes glow {
            0%, 100% {
              text-shadow: 0 0 20px rgba(212, 175, 55, 0.3),
                           0 0 40px rgba(212, 175, 55, 0.2);
            }
            50% {
              text-shadow: 0 0 30px rgba(212, 175, 55, 0.5),
                           0 0 60px rgba(212, 175, 55, 0.3);
            }
          }
        `}
      </style>

      <section
        aria-label="Hero section"
        style={{
          ...section,
          ...grain,
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: theme.spacing.xxl * 2,
          paddingBottom: theme.spacing.xxl * 2,
          overflow: 'hidden',
        }}
      >
        {/* Ambient gold glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '600px',
            background: `radial-gradient(circle, ${theme.colors.gold}15 0%, transparent 70%)`,
            pointerEvents: 'none',
            animation: 'fadeIn 1.5s ease-out',
          }}
        />

        <div
          style={{
            ...container(),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* HOU2ED Wordmark - matching adaptive-icon.png */}
          <h1
            style={{
              fontFamily: theme.typography.fontFamily.body, // Outfit
              fontSize: 'clamp(48px, 12vw, 120px)',
              fontWeight: '900', // Extra bold to match logo
              color: theme.colors.gold,
              marginBottom: theme.spacing.xxl,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              animation: 'glow 3s ease-in-out infinite',
              ...fadeInUp,
            }}
          >
            HOU2ED
          </h1>

          {/* Main Headline - Framer-inspired large typography */}
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.body, // Outfit for consistency
              fontSize: 'clamp(32px, 6vw, 72px)',
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.white,
              maxWidth: '1000px',
              marginBottom: theme.spacing.xxl,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              ...fadeInUp,
              animationDelay: '0.2s',
            }}
          >
            Connecting seekers
            <br />
            <span style={{ color: theme.colors.gold }}>with housing providers</span>
          </h2>

          {/* Supporting Text */}
          <p
            style={{
              fontFamily: theme.typography.fontFamily.body,
              fontSize: 'clamp(16px, 2vw, 22px)',
              fontWeight: theme.typography.fontWeight.regular,
              color: theme.colors.gray.light,
              maxWidth: '650px',
              marginBottom: theme.spacing.xxl * 1.5,
              lineHeight: 1.7,
              letterSpacing: '0.01em',
              ...fadeInUp,
              animationDelay: '0.4s',
            }}
          >
            A platform that streamlines housing access through transparent listings, clear
            eligibility, and faster placement workflows.
          </p>

          {/* CTA Buttons */}
          <div
            className="responsive-stack"
            style={{
              display: 'flex',
              gap: theme.spacing.md,
              marginBottom: theme.spacing.xxl,
              flexWrap: 'wrap',
              justifyContent: 'center',
              ...fadeInUp,
              animationDelay: '0.6s',
            }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={() => scrollToSection('waitlist')}
              style={{ minWidth: '200px' }}
            >
              Join Waitlist
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => scrollToSection('mission')}
              style={{ minWidth: '200px' }}
            >
              Learn More
            </Button>
          </div>

          {/* Trust Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
              border: `1px solid ${theme.colors.gray.dark}`,
              borderRadius: theme.borderRadius.full,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px)',
              ...fadeInUp,
              animationDelay: '0.8s',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: theme.colors.gold,
                boxShadow: `0 0 10px ${theme.colors.gold}`,
              }}
            />
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.white,
                fontWeight: theme.typography.fontWeight.medium,
                margin: 0,
              }}
            >
              Trusted by housing providers and seekers
            </p>
          </div>
        </div>

        {/* Decorative bottom gradient */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '200px',
            background: `linear-gradient(to top, ${theme.colors.black}, transparent)`,
            pointerEvents: 'none',
          }}
        />
      </section>
    </>
  );
}
