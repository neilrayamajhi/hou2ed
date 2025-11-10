import React, { useState } from "react";
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from "react-native";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import AddressAutocompleteClean, { type AddressData } from "../../components/forms/AddressAutocompleteClean";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";

export default function AddressPicker() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [selected, setSelected] = useState<AddressData | null>(null);

  const confirm = () => {
    if (!selected) return;
    // Navigate back to AddListing with the selected address
    navigation.navigate("AddListing", { selectedAddress: selected } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.title}>Pick Address & Location</Text>

        <View style={{ marginTop: spacing.md }}>
          <AddressAutocompleteClean
            onAddressSelect={(addr) => setSelected(addr)}
            placeholder="Search for an address..."
          />
        </View>

        {selected && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.label}>Selected</Text>
            <Text style={styles.value}>{selected.fullAddress}</Text>
            <View
              style={{
                marginTop: spacing.md,
                borderRadius: radius.md,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: colors.gray[800],
              }}
            >
              <MapView
                provider={PROVIDER_GOOGLE}
                style={{ height: 220, width: "100%" }}
                initialRegion={{
                  latitude: selected.latitude,
                  longitude: selected.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker
                  coordinate={{ latitude: selected.latitude, longitude: selected.longitude }}
                  title={selected.street}
                  description={`${selected.city}, ${selected.state} ${selected.zipCode}`}
                />
              </MapView>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, !selected && { opacity: 0.6 }]}
          disabled={!selected}
          onPress={confirm}
          accessibilityLabel="Use this address"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Use This Address</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[950] },
  title: { color: colors.gray[50], fontSize: 20, fontWeight: "600" },
  label: { color: colors.gray[300], marginBottom: spacing.xs },
  value: { color: colors.gray[100] },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: { color: colors.gray[950], fontWeight: "600" },
});
