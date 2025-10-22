import { colors } from '../theme/tokens';

/**
 * Calculate relative luminance of a color
 * Based on WCAG 2.1 formula
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
    if (val <= 0.03928) {
      return val / 12.92;
    }
    return Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a number between 1 and 21
 */
export function getContrastRatio(foreground: string, background: string): number {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG AA standard
 * Normal text: 4.5:1
 * Large text (18pt+ or 14pt+ bold): 3:1
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if contrast meets WCAG AAA standard
 * Normal text: 7:1
 * Large text: 4.5:1
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  largeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Verify HOU2ED color combinations
 */
export const colorContrastChecks = {
  goldOnBlack: {
    ratio: getContrastRatio(colors.gold, colors.black),
    meetsAA: meetsWCAGAA(colors.gold, colors.black),
    meetsAAA: meetsWCAGAAA(colors.gold, colors.black),
  },
  whiteOnBlack: {
    ratio: getContrastRatio(colors.white, colors.black),
    meetsAA: meetsWCAGAA(colors.white, colors.black),
    meetsAAA: meetsWCAGAAA(colors.white, colors.black),
  },
  blackOnGold: {
    ratio: getContrastRatio(colors.black, colors.gold),
    meetsAA: meetsWCAGAA(colors.black, colors.gold),
    meetsAAA: meetsWCAGAAA(colors.black, colors.gold),
  },
  greenOnBlack: {
    ratio: getContrastRatio(colors.green, colors.black),
    meetsAA: meetsWCAGAA(colors.green, colors.black),
    meetsAAA: meetsWCAGAAA(colors.green, colors.black),
  },
  redOnBlack: {
    ratio: getContrastRatio(colors.red, colors.black),
    meetsAA: meetsWCAGAA(colors.red, colors.black),
    meetsAAA: meetsWCAGAAA(colors.red, colors.black),
  },
  amberOnBlack: {
    ratio: getContrastRatio(colors.amber, colors.black),
    meetsAA: meetsWCAGAA(colors.amber, colors.black),
    meetsAAA: meetsWCAGAAA(colors.amber, colors.black),
  },
};

/**
 * Minimum touch target size (WCAG 2.5.5)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Hit slop for better touch targets
 */
export const HIT_SLOP = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

/**
 * Focus ring styles for accessibility
 */
export const focusRingStyle = {
  borderWidth: 2,
  borderColor: colors.gold,
  borderStyle: 'solid' as const,
};

/**
 * Screen reader announcements helper
 */
export function announceForAccessibility(message: string) {
  if (typeof window !== 'undefined' && 'ReactNativeWebView' in window) {
    // React Native
    const AccessibilityInfo = require('react-native').AccessibilityInfo;
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Web - use aria-live region
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    document.body.appendChild(announcement);
    announcement.textContent = message;
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

/**
 * Get accessibility label for common patterns
 */
export const a11yLabels = {
  closeButton: 'Close',
  backButton: 'Go back',
  menuButton: 'Open menu',
  filterButton: 'Open filters',
  saveButton: 'Save to favorites',
  shareButton: 'Share',
  searchButton: 'Search',
  submitButton: 'Submit',
  nextButton: 'Next',
  previousButton: 'Previous',
  playButton: 'Play',
  pauseButton: 'Pause',
  editButton: 'Edit',
  deleteButton: 'Delete',
  moreButton: 'More options',
  expandButton: 'Expand',
  collapseButton: 'Collapse',
};

/**
 * Get accessibility hint for common patterns
 */
export const a11yHints = {
  button: 'Double tap to activate',
  link: 'Double tap to open',
  toggle: 'Double tap to toggle',
  slider: 'Swipe up or down to adjust',
  textInput: 'Double tap to edit',
  image: 'Image',
  decorative: 'Decorative image',
};

/**
 * Check if color contrast report should be logged (development only)
 */
if (__DEV__) {
  console.log('<¨ HOU2ED Color Contrast Report:');
  console.log('================================');
  Object.entries(colorContrastChecks).forEach(([name, check]) => {
    const status = check.meetsAA ? '' : 'L';
    console.log(
      `${status} ${name}: ${check.ratio.toFixed(2)}:1 (AA: ${check.meetsAA}, AAA: ${check.meetsAAA})`
    );
  });
  console.log('================================');
  console.log('WCAG AA requires 4.5:1 for normal text, 3:1 for large text');
}