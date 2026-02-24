import type { CSSProperties, ReactNode } from 'react';
import { useEffect } from 'react';
import { theme } from '../../theme/tokens';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: theme.spacing.lg,
  };

  const modalStyle: CSSProperties = {
    backgroundColor: theme.colors.black,
    border: `2px solid ${theme.colors.gold}`,
    borderRadius: theme.borderRadius.lg,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: theme.shadows.lg,
    position: 'relative',
  };

  const headerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderBottom: `1px solid ${theme.colors.gold}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const titleStyle: CSSProperties = {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.gold,
    margin: 0,
  };

  const closeButtonStyle: CSSProperties = {
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.white,
    fontSize: theme.typography.fontSize.xxl,
    cursor: 'pointer',
    padding: theme.spacing.sm,
    lineHeight: 1,
    minWidth: 44,
    minHeight: 44,
    borderRadius: theme.borderRadius.sm,
    transition: 'all 0.2s ease',
  };

  const bodyStyle: CSSProperties = {
    padding: theme.spacing.lg,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.white,
    lineHeight: 1.6,
  };

  const footerStyle: CSSProperties = {
    padding: theme.spacing.lg,
    borderTop: `1px solid rgba(212, 175, 55, 0.2)`,
    display: 'flex',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div style={headerStyle}>
            <h2 id="modal-title" style={titleStyle}>
              {title}
            </h2>
            <button
              type="button"
              style={closeButtonStyle}
              onClick={onClose}
              aria-label="Close modal"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.colors.gold;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.colors.white;
              }}
            >
              ×
            </button>
          </div>
        )}
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
}
