import React, { useEffect, useRef } from "react";
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Animated,
  TouchableOpacityProps,
} from "react-native";

interface ToggleProps extends Omit<TouchableOpacityProps, "onPress"> {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({
  value,
  onValueChange,
  disabled = false,
  style,
  ...props
}: ToggleProps) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? 20 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, translateX]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        value && styles.active,
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      {...props}
    >
      <Animated.View style={[styles.thumb, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    padding: 2,
    justifyContent: "center",
  },
  active: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  disabled: {
    opacity: 0.5,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
  },
});
