import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp } from "../../navigation/types";

export default function DevMenu() {
  const navigation = useNavigation<RootStackNavigationProp>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dev Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Navigation</Text>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("Tabs")}
          accessibilityLabel="Go to Tabs"
          accessibilityRole="button"
        >
          <Ionicons name="grid-outline" size={24} color={colors.primary[500]} />
          <View style={styles.menuButtonTextContainer}>
            <Text style={styles.menuButtonTitle}>Go to Tabs</Text>
            <Text style={styles.menuButtonSubtitle}>Home, Search, Messages, Saved, Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: "Tabs" }] })}
          accessibilityLabel="Reset to Tabs"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={24} color={colors.primary[500]} />
          <View style={styles.menuButtonTextContainer}>
            <Text style={styles.menuButtonTitle}>Reset to Tabs</Text>
            <Text style={styles.menuButtonSubtitle}>Reset navigation state to the tab root</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Provider Screens</Text>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("ProviderDashboard")}
          accessibilityLabel="Go to Provider Dashboard"
          accessibilityRole="button"
        >
          <Ionicons name="home-outline" size={24} color={colors.primary[500]} />
          <View style={styles.menuButtonTextContainer}>
            <Text style={styles.menuButtonTitle}>Provider Dashboard</Text>
            <Text style={styles.menuButtonSubtitle}>
              View and manage listings, applications
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate("AvailabilityUpdater")}
          accessibilityLabel="Go to Availability Updater"
          accessibilityRole="button"
        >
          <Ionicons name="refresh-outline" size={24} color={colors.primary[500]} />
          <View style={styles.menuButtonTextContainer}>
            <Text style={styles.menuButtonTitle}>Availability Updater</Text>
            <Text style={styles.menuButtonSubtitle}>Update bed counts for listings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Dev Tools</Text>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => {
            // @ts-ignore
            navigation.navigate("Styleguide");
          }}
          accessibilityLabel="View Styleguide"
          accessibilityRole="button"
        >
          <Ionicons name="color-palette-outline" size={24} color={colors.primary[500]} />
          <View style={styles.menuButtonTextContainer}>
            <Text style={styles.menuButtonTitle}>Styleguide</Text>
            <Text style={styles.menuButtonSubtitle}>View design tokens and components</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray[400]} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    textAlign: "center",
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing["3xl"],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[400],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  menuButtonTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  menuButtonTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.xs,
  },
  menuButtonSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
});
