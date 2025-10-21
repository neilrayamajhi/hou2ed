import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "../theme/tokens";

export default function EmergencyDisclaimer() {
  const call911 = () => {
    Linking.openURL("tel:911");
  };

  const call988 = () => {
    Linking.openURL("tel:988");
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={20} color={colors.error[500]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>In Case of Emergency</Text>
        <Text style={styles.description}>
          For immediate life-threatening emergencies, call{" "}
          <Text style={styles.link} onPress={call911}>
            911
          </Text>
          {"\n"}
          For mental health crisis support, call{" "}
          <Text style={styles.link} onPress={call988}>
            988
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.error[900],
    borderLeftWidth: 4,
    borderLeftColor: colors.error[500],
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 8,
  },
  iconContainer: {
    marginRight: spacing.sm,
    paddingTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.error[100],
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.sizes.sm,
    color: colors.error[200],
    lineHeight: 20,
  },
  link: {
    color: colors.error[400],
    fontWeight: typography.weights.semibold,
    textDecorationLine: "underline",
  },
});
