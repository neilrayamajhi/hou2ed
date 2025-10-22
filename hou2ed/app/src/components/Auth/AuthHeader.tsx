import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { theme } from "../../theme";

// Constants
const BRAND_PANEL_HEIGHT = 120;
const ANIMATION_DURATION = 300;

export default function AuthHeader() {
  const [isExpanded, setIsExpanded] = useState(false);
  const animationHeight = useState(new Animated.Value(0))[0];

  const toggleBrandPanel = () => {
    const toValue = isExpanded ? 0 : BRAND_PANEL_HEIGHT;
    setIsExpanded(!isExpanded);

    Animated.timing(animationHeight, {
      toValue,
      duration: ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.logo}>HOU2ED</Text>
        <TouchableOpacity>
          <Text style={styles.helpText}>Help</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.brandPanel}>
        <TouchableOpacity style={styles.brandHeader} onPress={toggleBrandPanel}>
          <Text style={styles.brandTitle}>What HOU2ED means</Text>
          <Text style={[styles.chevron, isExpanded && styles.chevronUp]}>
            ▼
          </Text>
        </TouchableOpacity>

        <Animated.View
          style={[styles.brandContent, { height: animationHeight }]}
        >
          <Text style={styles.brandText}>
            The 2 represents togetherness and second chances. A house becomes a
            home when people and space meet safety and belonging. Being hou2ed
            means stability, hope, and a fresh start.
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  logo: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: "#D4AF37",
  },
  helpText: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
  brandPanel: {
    marginTop: theme.spacing.sm,
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  brandTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#D4AF37",
  },
  chevron: {
    color: "#D4AF37",
    fontSize: theme.typography.fontSize.md,
  },
  chevronUp: {
    transform: [{ rotate: "180deg" }],
  },
  brandContent: {
    overflow: "hidden",
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: theme.typography.fontSize.md,
    lineHeight: 22,
    paddingTop: theme.spacing.md,
  },
});
