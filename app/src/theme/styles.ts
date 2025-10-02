import { StyleSheet, TextStyle, ViewStyle } from "react-native";
import { colors, spacing, typography } from "./tokens";

export const screen: ViewStyle = {
  flex: 1,
  backgroundColor: colors.black,
  padding: spacing.lg,
};

export const styleHeading: TextStyle = {
  color: colors.gold,
  fontSize: 32,
  fontWeight: typography.heading.fontWeight,
};

export const styleSubheading: TextStyle = {
  color: colors.gold,
  fontSize: 20,
  fontWeight: typography.heading.fontWeight,
};

export const styleBody: TextStyle = {
  color: colors.white,
  fontSize: 16,
  fontWeight: typography.body.fontWeight,
  lineHeight: 24,
};

export const focusRing: ViewStyle = {
  borderWidth: 2,
  borderColor: colors.gold,
};

export const hitSlop = {
  top: 10,
  bottom: 10,
  left: 10,
  right: 10,
};

export const commonStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.black,
    padding: spacing.lg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  spaceBetween: {
    justifyContent: "space-between",
  },
  heading: {
    color: colors.gold,
    fontSize: 32,
    fontWeight: typography.heading.fontWeight,
  },
  subheading: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: typography.heading.fontWeight,
  },
  body: {
    color: colors.white,
    fontSize: 16,
    fontWeight: typography.body.fontWeight,
    lineHeight: 24,
  },
  label: {
    color: colors.white,
    fontSize: 14,
    fontWeight: typography.body.fontWeight,
    marginBottom: spacing.xs,
  },
  error: {
    color: colors.red,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
