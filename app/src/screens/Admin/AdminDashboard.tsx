import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";
import {
  colors,
  spacing,
  typography,
  radius,
  shadows,
} from "../../theme/tokens";
import type { RootStackNavigationProp } from "../../navigation/types";
import { useQuery } from "@tanstack/react-query";
import { useAdminStats } from "../../hooks/useAdminStats";
import { useAdminAnalytics } from "../../hooks/useAdminAnalytics";
import { useRequireAdmin } from "../../hooks/useRequireAdmin";
import { useAuthStore } from "../../state/useAuthStore";
import { listOpenReports } from "../../services/reports.service";
import type { WeeklyBucket, KeyCount } from "../../utils/analytics";
import AvatarInitial from "../../components/admin/AvatarInitial";

// ─── Chart color palette ─────────────────────────────────────────────────────

const CHART_COLORS = [
  colors.primary[500],
  colors.primary[300],
  colors.green,
  colors.amber,
  colors.red,
  colors.gray[500],
];

const CHART_AXIS_COLOR = colors.gray[600];
const CHART_GRID_COLOR = colors.gray[800];
const CHART_LABEL_STYLE = {
  color: colors.gray[400],
  fontSize: typography.sizes.xs,
};

// ─── Data mappers ─────────────────────────────────────────────────────────────

function toLineData(buckets: WeeklyBucket[]) {
  return buckets.map((b) => ({ value: b.count, label: b.label }));
}

function toBarData(items: KeyCount[], maxItems = 5) {
  return items.slice(0, maxItems).map((item, i) => ({
    value: item.count,
    label: item.key.length > 10 ? item.key.slice(0, 9) + "…" : item.key,
    frontColor: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

function toPieData(items: KeyCount[]) {
  return items.map((item, i) => ({
    value: item.count,
    text: item.key,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconContainer}>
        <Ionicons name={icon} size={22} color={colors.primary[500]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
      <View style={styles.chartInner}>{children}</View>
    </View>
  );
}

function PieLegend({ items }: { items: KeyCount[] }) {
  return (
    <View style={styles.pieLegend}>
      {items.map((item, i) => (
        <View key={item.key} style={styles.pieLegendRow}>
          <View
            style={[
              styles.pieLegendDot,
              { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] },
            ]}
          />
          <Text style={styles.pieLegendText}>
            {item.key}{" "}
            <Text style={{ color: colors.primary[500] }}>{item.count}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

function InlineLoader() {
  return (
    <View style={styles.inlineLoader}>
      <ActivityIndicator size="small" color={colors.primary[500]} />
    </View>
  );
}

function NavCard({
  label,
  icon,
  badge,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.navCard}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.75}
    >
      <View style={styles.navCardIconRow}>
        <View style={styles.navCardIconContainer}>
          <Ionicons name={icon} size={20} color={colors.primary[500]} />
        </View>
        {!!badge && (
          <View style={styles.navCardBadge}>
            <Text style={styles.navCardBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.navCardLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigation = useNavigation<RootStackNavigationProp>();
  useRequireAdmin();
  const { user, logout } = useAuthStore();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - spacing.lg * 2 - spacing["2xl"];

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isRefetching,
  } = useAdminStats();

  const {
    data: analytics,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useAdminAnalytics();

  const { data: openReports } = useQuery({
    queryKey: ["adminOpenReports"],
    queryFn: listOpenReports,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchAnalytics();
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: () => {
          logout();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIdentity}>
            <AvatarInitial name={user?.fullName || "Admin"} size={44} />
            <View>
              <Text style={styles.welcomeText}>Admin Dashboard</Text>
              <Text style={styles.adminName}>{user?.fullName || "Admin"}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            accessibilityLabel="Log out"
            accessibilityRole="button"
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* ── Manage ── */}
        <SectionHeader title="Manage" />
        <View style={styles.navCardsGrid}>
          <NavCard
            label="Users"
            icon="people-outline"
            onPress={() => navigation.navigate("UserManagementList")}
          />
          <NavCard
            label="Listings"
            icon="home-outline"
            onPress={() => navigation.navigate("ListingModerationList")}
          />
          <NavCard
            label="Reports"
            icon="flag-outline"
            badge={openReports?.length}
            onPress={() => navigation.navigate("ReportsList")}
          />
          <NavCard
            label="Verification Review"
            icon="shield-checkmark-outline"
            onPress={() => navigation.navigate("VerificationReviewList")}
          />
        </View>

        {/* ── Snapshot Cards ── */}
        <SectionHeader title="Platform Snapshot" />

        {statsLoading && <InlineLoader />}
        {statsError && (
          <Text style={styles.errorText}>Failed to load stats.</Text>
        )}
        {!statsLoading && !statsError && (
          <View style={styles.cardsGrid}>
            <StatCard
              label="Seekers"
              value={stats?.totalSeekers ?? 0}
              icon="people-outline"
            />
            <StatCard
              label="Providers"
              value={stats?.totalProviders ?? 0}
              icon="business-outline"
            />
            <StatCard
              label="Active Listings"
              value={stats?.activeListings ?? 0}
              icon="home-outline"
            />
            <StatCard
              label="New Signups (7d)"
              value={stats?.newSignupsThisWeek ?? 0}
              icon="person-add-outline"
            />
            <StatCard
              label="Blocks (30d)"
              value={stats?.recentBlocks ?? 0}
              icon="shield-outline"
            />
          </View>
        )}

        {/* ── Trends ── */}
        <SectionHeader title="Growth Trends (8 weeks)" />

        {analyticsLoading && <InlineLoader />}

        {!analyticsLoading && analytics && (
          <>
            <ChartCard
              title="New Signups per Week"
              subtitle="How many users joined each week"
            >
              <LineChart
                data={toLineData(analytics.signupsTrend)}
                width={chartWidth}
                height={160}
                color={colors.primary[500]}
                thickness={2}
                dataPointsColor={colors.primary[500]}
                dataPointsRadius={4}
                startFillColor={colors.primary[600]}
                endFillColor={colors.gray[900]}
                startOpacity={0.3}
                endOpacity={0}
                areaChart
                backgroundColor={colors.gray[850]}
                xAxisColor={CHART_AXIS_COLOR}
                yAxisColor={CHART_AXIS_COLOR}
                rulesColor={CHART_GRID_COLOR}
                xAxisLabelTextStyle={CHART_LABEL_STYLE}
                yAxisTextStyle={CHART_LABEL_STYLE}
                noOfSections={4}
                curved
                hideDataPoints={false}
                isAnimated
              />
            </ChartCard>

            <ChartCard
              title="New Listings per Week"
              subtitle="How many listings were created each week"
            >
              <LineChart
                data={toLineData(analytics.listingsTrend)}
                width={chartWidth}
                height={160}
                color={colors.green}
                thickness={2}
                dataPointsColor={colors.green}
                dataPointsRadius={4}
                startFillColor={colors.green}
                endFillColor={colors.gray[900]}
                startOpacity={0.25}
                endOpacity={0}
                areaChart
                backgroundColor={colors.gray[850]}
                xAxisColor={CHART_AXIS_COLOR}
                yAxisColor={CHART_AXIS_COLOR}
                rulesColor={CHART_GRID_COLOR}
                xAxisLabelTextStyle={CHART_LABEL_STYLE}
                yAxisTextStyle={CHART_LABEL_STYLE}
                noOfSections={4}
                curved
                isAnimated
              />
            </ChartCard>

            {/* ── Users ── */}
            <SectionHeader title="User Breakdown" />

            <ChartCard
              title="Seekers vs Providers"
              subtitle="All-time user role split"
            >
              <View style={styles.pieRow}>
                <PieChart
                  data={toPieData(analytics.roleSplit)}
                  radius={80}
                  donut
                  innerRadius={50}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterNumber}>
                        {analytics.roleSplit.reduce(
                          (sum, r) => sum + r.count,
                          0,
                        )}
                      </Text>
                      <Text style={styles.pieCenterLabel}>users</Text>
                    </View>
                  )}
                />
                <PieLegend items={analytics.roleSplit} />
              </View>
            </ChartCard>

            {/* ── Listings ── */}
            <SectionHeader title="Listings Analysis" />

            <ChartCard
              title="Top Cities by Listings"
              subtitle="Where your platform has the most supply"
            >
              <BarChart
                data={toBarData(analytics.listingsByCity)}
                width={chartWidth}
                height={180}
                barWidth={32}
                spacing={20}
                backgroundColor={colors.gray[850]}
                xAxisColor={CHART_AXIS_COLOR}
                yAxisColor={CHART_AXIS_COLOR}
                rulesColor={CHART_GRID_COLOR}
                xAxisLabelTextStyle={CHART_LABEL_STYLE}
                yAxisTextStyle={CHART_LABEL_STYLE}
                noOfSections={4}
                isAnimated
                roundedTop
              />
            </ChartCard>

            <ChartCard
              title="Listings by Housing Type"
              subtitle="Breakdown of what types of housing are offered"
            >
              <BarChart
                data={toBarData(analytics.listingsByHousingType)}
                width={chartWidth}
                height={180}
                barWidth={32}
                spacing={20}
                backgroundColor={colors.gray[850]}
                xAxisColor={CHART_AXIS_COLOR}
                yAxisColor={CHART_AXIS_COLOR}
                rulesColor={CHART_GRID_COLOR}
                xAxisLabelTextStyle={CHART_LABEL_STYLE}
                yAxisTextStyle={CHART_LABEL_STYLE}
                noOfSections={4}
                isAnimated
                roundedTop
              />
            </ChartCard>

            <ChartCard
              title="Verified vs Unverified Listings"
              subtitle="How many listings have been verified"
            >
              <View style={styles.pieRow}>
                <PieChart
                  data={toPieData(analytics.listingsByVerification)}
                  radius={70}
                  donut
                  innerRadius={44}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterNumber}>
                        {analytics.listingsByVerification.reduce(
                          (sum, r) => sum + r.count,
                          0,
                        )}
                      </Text>
                      <Text style={styles.pieCenterLabel}>total</Text>
                    </View>
                  )}
                />
                <PieLegend items={analytics.listingsByVerification} />
              </View>
            </ChartCard>

            {/* ── Applications ── */}
            <SectionHeader title="Applications Pipeline" />

            <ChartCard
              title="Applications by Status"
              subtitle="Where applicants are in the process"
            >
              <BarChart
                data={toBarData(analytics.applicationsByStatus, 6)}
                width={chartWidth}
                height={200}
                barWidth={28}
                spacing={16}
                backgroundColor={colors.gray[850]}
                xAxisColor={CHART_AXIS_COLOR}
                yAxisColor={CHART_AXIS_COLOR}
                rulesColor={CHART_GRID_COLOR}
                xAxisLabelTextStyle={{ ...CHART_LABEL_STYLE, width: 48 }}
                yAxisTextStyle={CHART_LABEL_STYLE}
                noOfSections={4}
                isAnimated
                roundedTop
              />
            </ChartCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logoutButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[800],
  },
  welcomeText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  adminName: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing["5xl"],
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  inlineLoader: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  errorText: {
    color: colors.red,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  // Nav cards
  navCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  navCard: {
    flexBasis: "46%",
    flexGrow: 1,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    ...shadows.subtle,
  },
  navCardIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  navCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  navCardBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  navCardBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.white,
  },
  navCardLabel: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[50],
  },
  // Stat cards grid
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    flexBasis: "45%",
    flexGrow: 1,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    ...shadows.subtle,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(212, 175, 55, 0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
  },
  // Chart cards
  chartCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gray[800],
    padding: spacing.lg,
    ...shadows.subtle,
  },
  chartTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.white,
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  chartInner: {
    overflow: "hidden",
  },
  // Pie chart
  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing["2xl"],
  },
  pieCenter: {
    alignItems: "center",
  },
  pieCenterNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: colors.white,
  },
  pieCenterLabel: {
    fontSize: typography.sizes.xs,
    color: colors.gray[400],
  },
  pieLegend: {
    flex: 1,
    gap: spacing.sm,
  },
  pieLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  pieLegendText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
});
