export const colors = {
  black: "#000000",
  gold: "#D4AF37",
  white: "#FFFFFF",
  green: "#21C55D",
  amber: "#F59E0B",
  red: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    850: "#18202F",
    900: "#111827",
  },
  primary: {
    50: "#FFF9E6",
    100: "#FFF3CC",
    200: "#FFE799",
    300: "#FFDB66",
    400: "#FFD033",
    500: "#D4AF37",
    600: "#AA8C2C",
    700: "#806921",
    800: "#554616",
    900: "#2B230B",
  },
  darkGray: "#1A1A1A",
  borderGray: "#2A2A2A",
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
} as const;

export const shadows = {
  subtle: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2.22,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
} as const;

export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
  },
  heading: {
    fontWeight: "600" as const,
  },
  body: {
    fontWeight: "400" as const,
  },
} as const;