import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { container, section, column } from '../../theme/styles';
import { theme } from '../../theme/tokens';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import { Card } from '../ui/Card';
import { useToast } from '../../providers/ToastProvider';

const waitlistSchema = z
  .object({
    fullName: z.string().min(1, 'Full name is required').max(100, 'Name is too long'),
    email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
    role: z.enum(['seeker', 'provider'], {
      required_error: 'Please select a role',
    }),
    organization: z.string().max(200, 'Organization name is too long').optional(),
    message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => {
      if (data.role === 'provider') {
        return data.organization && data.organization.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Organization name is required for providers',
      path: ['organization'],
    },
  );

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export function Waitlist() {
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      role: 'seeker',
      organization: '',
      message: '',
    },
  });

  const role = watch('role');
  const message = watch('message');

  const onSubmit = async (data: WaitlistFormData) => {
    // Mock submit - backend will be wired in Prompt 5.4
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Form submitted:', data);

    showToast("Thank you. You've been added to the Hou2ed waitlist.", 'success');
    reset();
  };

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

          textarea {
            font-family: 'Outfit', sans-serif;
            resize: vertical;
          }
        `}
      </style>

      <section
        id="waitlist"
        aria-labelledby="waitlist-heading"
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

        <div style={container()}>
          {/* Section Header */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: theme.spacing.xxl * 1.5,
            }}
          >
            <h2
              id="waitlist-heading"
              style={{
                fontFamily: theme.typography.fontFamily.body,
                fontSize: 'clamp(28px, 5vw, 56px)',
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.gold,
                marginBottom: theme.spacing.lg,
                letterSpacing: '-0.02em',
                ...fadeInUp,
              }}
            >
              Be First to Access HOU2ED
            </h2>
            <p
              style={{
                fontFamily: theme.typography.fontFamily.body,
                fontSize: 'clamp(16px, 2vw, 20px)',
                fontWeight: theme.typography.fontWeight.regular,
                color: theme.colors.white,
                lineHeight: 1.6,
                maxWidth: '600px',
                margin: '0 auto',
                ...fadeInUp,
                animationDelay: '0.2s',
              }}
            >
              Be among the first to access HOU2ED. Join our waitlist for early access and updates as
              we build the future of housing placement.
            </p>
          </div>

          {/* Form Card */}
          <div
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              ...fadeInUp,
              animationDelay: '0.4s',
            }}
          >
            <Card
              style={{
                border: `2px solid ${theme.colors.gold}`,
                backgroundColor: 'rgba(212, 175, 55, 0.02)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <form onSubmit={handleSubmit(onSubmit)} style={column(theme.spacing.lg)}>
                {/* Full Name */}
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Enter your full name"
                  error={errors.fullName?.message}
                  {...register('fullName')}
                />

                {/* Email */}
                <Input
                  label="Email"
                  type="email"
                  placeholder="Enter your email address"
                  error={errors.email?.message}
                  {...register('email')}
                />

                {/* Role Toggle */}
                <div style={column(theme.spacing.xs)}>
                  <Toggle
                    label="I am a..."
                    options={[
                      { value: 'seeker', label: 'Seeker' },
                      { value: 'provider', label: 'Provider' },
                    ]}
                    value={role}
                    onChange={(value) => {
                      register('role').onChange({ target: { value } });
                    }}
                  />
                  {errors.role && (
                    <span
                      style={{
                        fontFamily: theme.typography.fontFamily.body,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.error,
                      }}
                      role="alert"
                    >
                      {errors.role.message}
                    </span>
                  )}
                </div>

                {/* Conditional Organization Field */}
                {role === 'provider' && (
                  <Input
                    label="Organization Name"
                    type="text"
                    placeholder="Enter your organization name"
                    error={errors.organization?.message}
                    helpText="Required for housing providers"
                    {...register('organization')}
                  />
                )}

                {/* Optional Message */}
                <div style={column(theme.spacing.xs)}>
                  <label
                    htmlFor="message"
                    style={{
                      fontFamily: theme.typography.fontFamily.body,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium,
                      color: theme.colors.white,
                    }}
                  >
                    Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    placeholder="Tell us more about your needs or interests..."
                    maxLength={500}
                    rows={4}
                    style={{
                      fontFamily: theme.typography.fontFamily.body,
                      fontSize: theme.typography.fontSize.md,
                      backgroundColor: theme.colors.black,
                      color: theme.colors.white,
                      border: `1px solid ${errors.message ? theme.colors.error : theme.colors.white}`,
                      borderRadius: theme.borderRadius.md,
                      padding: `${theme.spacing.md}px`,
                      width: '100%',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      if (!errors.message) {
                        e.currentTarget.style.borderColor = theme.colors.gold;
                        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(212, 175, 55, 0.2)`;
                      }
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = errors.message
                        ? theme.colors.error
                        : theme.colors.white;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    {...register('message')}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: theme.typography.fontFamily.body,
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.gray.light,
                      }}
                    >
                      {(message || '').length}/500 characters
                    </span>
                    {errors.message && (
                      <span
                        style={{
                          fontFamily: theme.typography.fontFamily.body,
                          fontSize: theme.typography.fontSize.sm,
                          color: theme.colors.error,
                        }}
                        role="alert"
                      >
                        {errors.message.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!isValid || isSubmitting}
                  loading={isSubmitting}
                >
                  Join the Waitlist
                </Button>

                {/* Privacy Note */}
                <p
                  style={{
                    fontFamily: theme.typography.fontFamily.body,
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.gray.light,
                    textAlign: 'center',
                    lineHeight: 1.5,
                    marginTop: theme.spacing.sm,
                  }}
                >
                  By joining, you agree to receive updates from HOU2ED. We respect your privacy. See
                  our{' '}
                  <a
                    href="/privacy"
                    style={{
                      color: theme.colors.gold,
                      textDecoration: 'none',
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </form>
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
