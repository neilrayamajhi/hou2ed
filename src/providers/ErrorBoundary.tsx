import { Component, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            color: '#FFFFFF',
            padding: '24px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: '#D4AF37', marginBottom: '16px' }}>Something went wrong</h1>
            <p>Please refresh the page to try again.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
