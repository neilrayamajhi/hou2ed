import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
} from "react-native";

interface ChipProps extends TouchableOpacityProps {
  selected?: boolean;
  children: React.ReactNode;
}

export default function Chip({
  selected = false,
  children,
  style,
  ...props
}: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      {...props}
    >
      <Text
        style={[
          styles.text,
          selected ? styles.selectedText : styles.unselectedText,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  unselected: {
    backgroundColor: "#000000",
    borderColor: "#FFFFFF",
  },
  selected: {
    backgroundColor: "#FFD700",
    borderColor: "#FFD700",
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
  },
  unselectedText: {
    color: "#FFFFFF",
  },
  selectedText: {
    color: "#000000",
  },
});
