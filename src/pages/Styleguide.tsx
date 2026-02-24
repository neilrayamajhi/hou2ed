import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../providers/ToastProvider';
import { container, section, styleHeading, column } from '../theme/styles';
import { theme } from '../theme/tokens';

export function Styleguide() {
  const [role, setRole] = useState('seeker');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <div style={{ ...container(), ...section, paddingTop: theme.spacing.xxl * 2 }}>
      <h1 style={{ ...styleHeading, marginBottom: theme.spacing.xxl }}>Component Styleguide</h1>

      <div style={{ ...column(theme.spacing.xxl * 2) }}>
        {/* Buttons */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Buttons
          </h2>
          <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" size="md">
              Medium Size
            </Button>
            <Button variant="primary" loading>
              Loading
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Inputs */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Inputs
          </h2>
          <Input label="Full Name" placeholder="Enter your name" />
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            helpText="We'll never share your email"
          />
          <Input label="With Error" placeholder="Invalid input" error="This field is required" />
        </section>

        {/* Toggle */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Toggle
          </h2>
          <Toggle
            label="Select Role"
            options={[
              { value: 'seeker', label: 'Seeker' },
              { value: 'provider', label: 'Provider' },
            ]}
            value={role}
            onChange={setRole}
          />
        </section>

        {/* Cards */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Cards
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: theme.spacing.lg,
            }}
          >
            <Card header="Card with Header">This is a basic card with a header.</Card>
            <Card
              header="Card with Footer"
              footer={
                <Button variant="secondary" size="md">
                  Action
                </Button>
              }
            >
              This card has both a header and a footer with an action button.
            </Card>
            <Card>
              <strong>No Header Card</strong>
              <p style={{ marginTop: theme.spacing.sm }}>
                This card doesn't have a header or footer.
              </p>
            </Card>
          </div>
        </section>

        {/* Toast Demo */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Toasts
          </h2>
          <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <Button variant="secondary" onClick={() => showToast('Success message!', 'success')}>
              Show Success
            </Button>
            <Button variant="secondary" onClick={() => showToast('Error message!', 'error')}>
              Show Error
            </Button>
            <Button variant="secondary" onClick={() => showToast('Info message!', 'info')}>
              Show Info
            </Button>
          </div>
        </section>

        {/* Modal Demo */}
        <section style={column(theme.spacing.lg)}>
          <h2
            style={{
              fontFamily: theme.typography.fontFamily.display,
              fontSize: theme.typography.fontSize.xl,
              color: theme.colors.gold,
            }}
          >
            Modal
          </h2>
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Example Modal"
            footer={
              <>
                <Button variant="ghost" size="md" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" onClick={() => setIsModalOpen(false)}>
                  Confirm
                </Button>
              </>
            }
          >
            This is an example modal with a header, body content, and footer actions. Press Escape
            or click outside to close.
          </Modal>
        </section>
      </div>
    </div>
  );
}
