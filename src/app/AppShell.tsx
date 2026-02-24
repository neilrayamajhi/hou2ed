import type { ReactNode } from 'react';
import { screen } from '../theme/styles';
import { ErrorBoundary } from '../providers/ErrorBoundary';
import { ToastProvider } from '../providers/ToastProvider';

type Props = {
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <div style={screen}>
          <main id="main-content">{children}</main>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}
