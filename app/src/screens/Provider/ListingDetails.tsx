import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PhotoCarousel from "../../components/patterns/PhotoCarousel";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { RootStackNavigationProp, RootStackRouteProp } from "../../navigation/types";
import { getListingById } from "../../services/listing.service";
import { useRequireProvider } from "../../hooks/useRequireProvider";

export default function ListingDetails() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RootStackRouteProp<"ListingDetails">>();
  useRequireProvider();

  const listingId = route.params?.listingId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listing, setListing] = useState<Awaited<ReturnType<typeof getListingById>> | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await getListingById(listingId);
        if (isMounted) {
          setListing(data);
          setError(null);
        }
      } catch (e: any) {
        if (isMounted) setError(e?.message || "Failed to load listing");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const nextTwoWeeks = useMemo(() => {
    if (!listing) return [] as { date: string; beds: number }[];
    const out: { date: string; beds: number }[] = [];
    const days = listing.availabilityDays || {};
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      out.push({ date: key, beds: typeof days[key] === "number" ? days[key] : listing.availableBeds });
    }
    return out;
  }, [listing]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray[50]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading && (
          <Text style={{ color: colors.gray[400], padding: spacing.lg }}>Loading…</Text>
        )}
        {error && (
          <Text style={{ color: colors.red, padding: spacing.lg }}>{error}</Text>
        )}
        {listing && (
          <>
            <PhotoCarousel images={listing.images.length ? listing.images : ["https://via.placeholder.com/1200x900"]} height={260} />
            <View style={styles.section}>
              <Text style={styles.title}>{listing.title}</Text>
              <Text style={styles.address}>{listing.address}</Text>
              <View style={styles.statRow}>
                <Text style={styles.stat}>{listing.availableBeds}/{listing.totalBeds} beds available today</Text>
                {typeof listing.price === "number" ? (
                  <Text style={styles.price}>${listing.price}/mo</Text>
                ) : (
                  <Text style={styles.price}>Free</Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next 2 Weeks</Text>
              <View style={styles.weekGrid}>
                {nextTwoWeeks.map((d) => (
                  <View key={d.date} style={styles.dayCard}>
                    <Text style={styles.dayDate}>{d.date.slice(5)}</Text>
                    <Text style={styles.dayBeds}>{d.beds}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.section, styles.actions]}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate("EditListing", { listingId, listingData: { id: listing.id, title: listing.title, address: listing.address, totalBeds: listing.totalBeds, availableBeds: listing.availableBeds, lastUpdated: listing.lastUpdated } })}>
                <Text style={styles.secondaryText}>Edit Listing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate("AvailabilityUpdater") }>
                <Text style={styles.primaryText}>Update Availability</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[900] },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[800] },
  backButton: { padding: spacing.xs },
  headerTitle: { flex: 1, fontSize: typography.sizes.lg, fontWeight: "600", color: colors.gray[50], textAlign: "center" },
  headerSpacer: { width: 32 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing["3xl"] },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  title: { fontSize: typography.sizes.xl, fontWeight: "700", color: colors.gray[50] },
  address: { color: colors.gray[400], marginTop: spacing.xs },
  statRow: { marginTop: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { color: colors.primary[500], fontWeight: '600' },
  price: { color: colors.gray[200], fontWeight: '600' },
  sectionTitle: { fontSize: typography.sizes.md, fontWeight: '600', color: colors.gray[50], marginBottom: spacing.sm },
  weekGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayCard: { width: 80, borderWidth: 1, borderColor: colors.gray[800], backgroundColor: colors.gray[850], borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  dayDate: { color: colors.gray[400], fontSize: typography.sizes.xs },
  dayBeds: { color: colors.primary[500], fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray[700], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  secondaryText: { color: colors.gray[300], fontSize: typography.sizes.md, fontWeight: '600' },
  primaryBtn: { flex: 1, backgroundColor: colors.primary[500], borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  primaryText: { color: colors.gray[900], fontSize: typography.sizes.md, fontWeight: '600' },
});

