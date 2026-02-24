/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Generate a unique ID for form fields
 */
export const generateFieldId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Wire up aria-describedby for form fields with help text and errors
 */
export const getAriaDescribedBy = (helpTextId?: string, errorId?: string): string | undefined => {
  const ids = [helpTextId, errorId].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
};

/**
 * Check if an element meets minimum hit target size (44x44px)
 */
export const meetsHitTarget = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.width >= 44 && rect.height >= 44;
};

/**
 * Add keyboard navigation helper for focus trapping in modals
 */
export const trapFocus = (container: HTMLElement): (() => void) => {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleTabKey);

  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite',
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};
