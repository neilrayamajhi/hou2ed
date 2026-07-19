import { colors } from "../../theme/tokens";

// Shared gold-glow treatment for "hero" cards on detail screens — the one
// bolder accent this admin section leans on, kept to a handful of spots
// rather than applied everywhere so it stays a signature, not noise.
export const glowCard = {
  borderColor: "rgba(212, 175, 55, 0.25)",
  shadowColor: colors.primary[500],
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.18,
  shadowRadius: 12,
  elevation: 6,
} as const;
