import React, { useState, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, FlatList, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { env } from "../../utils/env";

export type AddressData = {
  fullAddress: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
};

type MapboxFeature = {
  id: string;
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
  address?: string;
  text?: string;
};

type Props = {
  onAddressSelect: (address: AddressData) => void;
  placeholder?: string;
  initialValue?: string;
};

export default function AddressAutocompleteClean({ onAddressSelect, placeholder = "Search for an address...", initialValue = "" }: Props) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const token = env.MAPBOX_TOKEN;
    if (!token) return;
    try {
      setIsLoading(true);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${encodeURIComponent(token)}&country=US&types=address&limit=5`;
      const response = await fetch(url);
      if (!response.ok) {
        setSuggestions([]);
        return;
      }
      const data = await response.json();
      setSuggestions(data.features || []);
      setIsDropdownVisible(true);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTextChange = (text: string) => {
    setQuery(text);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => searchAddresses(text), 300);
    setDebounceTimer(timer);
  };

  const parseAddress = (feature: MapboxFeature): AddressData => {
    const [lng, lat] = feature.center;
    let city = "";
    let state = "";
    let zipCode = "";
    feature.context?.forEach((ctx) => {
      if (ctx.id.startsWith("postcode")) zipCode = ctx.text;
      else if (ctx.id.startsWith("place")) city = ctx.text;
      else if (ctx.id.startsWith("region")) {
        const m = ctx.id.match(/US-([A-Z]{2})/);
        state = m ? m[1] : ctx.text;
      }
    });
    const street = feature.text || "";
    return { fullAddress: feature.place_name, street, city, state, zipCode, latitude: Number(lat), longitude: Number(lng) };
  };

  const handleSelectSuggestion = (feature: MapboxFeature) => {
    const addressData = parseAddress(feature);
    setQuery(addressData.fullAddress);
    setSuggestions([]);
    setIsDropdownVisible(false);
    Keyboard.dismiss();
    onAddressSelect(addressData);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[500]}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsDropdownVisible(true);
          }}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator size="small" color={colors.primary[500]} style={styles.loader} />
        )}
        {!isLoading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      {isDropdownVisible && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.suggestion} onPress={() => handleSelectSuggestion(item)}>
                <Ionicons name="location" size={18} color={colors.primary[500]} style={styles.suggestionIcon} />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.place_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  inputContainer: { position: "relative", width: "100%", marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.gray[900],
    color: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    paddingLeft: spacing[4],
    paddingRight: spacing[10],
    fontSize: typography.body.fontSize,
    minHeight: 44,
  },
  loader: { position: "absolute", right: spacing[3], top: 12 },
  clearButton: { position: "absolute", right: spacing[3], top: 10, padding: 4 },
  dropdown: {
    marginTop: 8,
    backgroundColor: colors.gray[900],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    maxHeight: 240,
    overflow: "hidden",
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  suggestionIcon: { marginRight: spacing[3] },
  suggestionText: { color: colors.gray[100], fontSize: typography.body.fontSize, flex: 1 },
});
