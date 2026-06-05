import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import AddressAutocompleteClean, { type AddressData } from "../../components/forms/AddressAutocompleteClean";
import { geocodeAddress } from "../../lib/geocoding";
import { env } from "../../utils/env";

export default function GeoTest() {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);

  const runGeocode = async () => {
    console.log("[GeoTest] Geocode button pressed");
    setResult("Geocoding...");
    setIsLoading(true);
    if (!street && !city && !state && !zip) {
      Alert.alert("Enter an address", "Type an address or pick from search first.");
      setIsLoading(false);
      return;
    }
    try {
      // Add a 10s timeout so the UI always resolves
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await geocodeAddress({ street, city, state, zip });
      clearTimeout(timeout);
      if (!res) {
        setResult("No result (check token/network or try another address)");
      } else {
        console.log("[GeoTest] Geocode result:", res);
        setResult(`lat=${res.lat.toFixed(6)}, lng=${res.lng.toFixed(6)}`);
        setMapCoords({ lat: res.lat, lng: res.lng });
      }
    } catch (e: any) {
      setResult(`Error: ${e?.message || String(e)}`);
    }
    setIsLoading(false);
  };

  const handleSelect = (addr: AddressData) => {
    setStreet(addr.street);
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.zipCode);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ padding: spacing.lg, flex: 1 }}>
          <Text style={styles.title}>Geocoding Test</Text>
          <Text style={styles.sub}>
            {env.MAPBOX_TOKEN ? "Mapbox token detected" : "Mapbox token missing"}
          </Text>

          <View style={{ marginTop: spacing.lg }}>
          <AddressAutocompleteClean onAddressSelect={handleSelect} placeholder="Search for an address..." />
          </View>

        <View style={{ height: spacing.xl }} />

          <Text style={styles.label}>Street</Text>
          <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="1600 Pennsylvania Ave NW" placeholderTextColor={colors.gray[500]} />

        <Text style={styles.label}>City</Text>
        <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Washington" placeholderTextColor={colors.gray[500]} />

        <Text style={styles.label}>State</Text>
        <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="DC" placeholderTextColor={colors.gray[500]} />

        <Text style={styles.label}>ZIP</Text>
        <TextInput style={styles.input} value={zip} onChangeText={setZip} placeholder="20500" placeholderTextColor={colors.gray[500]} />

        <TouchableOpacity style={[styles.button, isLoading && { opacity: 0.6 }]} disabled={isLoading} onPress={runGeocode} accessibilityLabel="Run geocoding test" accessibilityRole="button">
          <Text style={styles.buttonText}>{isLoading ? "Geocoding..." : "Geocode via Mapbox"}</Text>
        </TouchableOpacity>

        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.result}>{result || "(no result yet)"}</Text>
          <Text style={styles.resultSmall}>Street: {street || '—'}</Text>
          <Text style={styles.resultSmall}>City/State/ZIP: {city || '—'}, {state || '—'} {zip || ''}</Text>
        </View>

        {mapCoords && (
          <View style={{ marginTop: spacing.lg, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray[800] }}>
            <MapView
              style={{ height: 220, width: '100%' }}
              initialRegion={{
                latitude: mapCoords.lat,
                longitude: mapCoords.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: mapCoords.lat, longitude: mapCoords.lng }} />
            </MapView>
          </View>
        )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[950] },
  title: { color: colors.gray[50], fontSize: 20, fontWeight: "600" },
  sub: { color: colors.gray[400], marginTop: 4 },
  label: { color: colors.gray[200], marginTop: spacing.md, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.gray[900],
    color: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    fontSize: typography.body.fontSize,
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary[600],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: { color: colors.gray[950], fontWeight: "600" },
  result: { color: colors.gray[200], marginTop: spacing.md },
});
