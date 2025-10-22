import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { MIN_TOUCH_TARGET, HIT_SLOP } from "../../utils/a11y";

interface InlineCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export default function InlineCounter({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  max = 999,
  label,
  style,
  disabled = false,
}: InlineCounterProps) {
  const handleIncrement = useCallback(() => {
    if (value < max && !disabled) {
      onIncrement();
    }
  }, [value, max, onIncrement, disabled]);

  const handleDecrement = useCallback(() => {
    if (value > min && !disabled) {
      onDecrement();
    }
  }, [value, min, onDecrement, disabled]);

  const isDecrementDisabled = disabled || value <= min;
  const isIncrementDisabled = disabled || value >= max;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.counter}>
        <TouchableOpacity
          style={[
            styles.button,
            isDecrementDisabled && styles.buttonDisabled,
          ]}
          onPress={handleDecrement}
          disabled={isDecrementDisabled}
          hitSlop={HIT_SLOP}
          accessibilityLabel="Decrease value"
          accessibilityRole="button"
        >
          <Ionicons
            name="remove"
            size={20}
            color={isDecrementDisabled ? colors.gray[600] : colors.gray[50]}
          />
        </TouchableOpacity>

        <View style={styles.valueContainer}>
          <Text style={styles.value}>{value}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            isIncrementDisabled && styles.buttonDisabled,
          ]}
          onPress={handleIncrement}
          disabled={isIncrementDisabled}
          hitSlop={HIT_SLOP}
          accessibilityLabel="Increase value"
          accessibilityRole="button"
        >
          <Ionicons
            name="add"
            size={20}
            color={isIncrementDisabled ? colors.gray[600] : colors.gray[50]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[800],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.gray[700],
  },
  button: {
    padding: spacing.md,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  valueContainer: {
    paddingHorizontal: spacing.md,
    minWidth: 40,
    alignItems: "center",
  },
  value: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
  },
});