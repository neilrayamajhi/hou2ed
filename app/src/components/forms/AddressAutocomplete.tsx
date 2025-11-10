/**
 * AddressAutocomplete Component
 *
 * Provides Mapbox-powered address search with autocomplete suggestions.
 * Returns structured address data with coordinates.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Keyboard,
} from "react-native";
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
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
  }>;
  address?: string;
  text?: string;
};

type Props = {
  onAddressSelect: (address: AddressData) => void;
  placeholder?: string;
  initialValue?: string;
};

export default function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Search for an address...",
  initialValue = "",
}: Props) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  // Search for addresses using Mapbox Geocoding API
  const searchAddresses = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const token = env.MAPBOX_TOKEN;
    if (!token) {
      console.warn("⚠️ Mapbox token not configured - autocomplete disabled");
      return;
    }

    console.log("🔍 Searching for address:", searchQuery);
    setIsLoading(true);

    try {
      // Bias results towards US addresses, limit to 5 suggestions
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery,
      )}.json?access_token=${encodeURIComponent(token)}&country=US&types=address&limit=5`;

      const response = await fetch(url);

      if (!response.ok) {
        console.warn("Mapbox geocoding failed", response.status);
        setSuggestions([]);
        return;
      }

      const data = await response.json();
      console.log("✅ Mapbox returned", data.features?.length || 0, "results");
      setSuggestions(data.features || []);
      setIsDropdownVisible(true);
    } catch (error) {
      console.error("❌ Address search error:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle text input with debouncing
  const handleTextChange = (text: string) => {
    setQuery(text);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer to search after 300ms of no typing
    const timer = setTimeout(() => {
      searchAddresses(text);
    }, 300);

    setDebounceTimer(timer);
  };

  // Parse Mapbox feature into structured address
  const parseAddress = (feature: MapboxFeature): AddressData => {
    const [longitude, latitude] = feature.center;

    // Extract address components from context
    let city = "";
    let state = "";
    let zipCode = "";

    if (feature.context) {
      for (const ctx of feature.context) {
        if (ctx.id.startsWith("postcode")) {
          zipCode = ctx.text;
        } else if (ctx.id.startsWith("place")) {
          city = ctx.text;
        } else if (ctx.id.startsWith("region")) {
          // State might be "California" or "CA", we want the abbreviation
          const stateText = ctx.text;
          // If it's a full name, extract abbreviation from id (e.g., "region.123.US-CA")
          const match = ctx.id.match(/US-([A-Z]{2})/);
          state = match ? match[1] : stateText;
        }
      }
    }

    // Street address is the main text
    const street = feature.text || "";

    return {
      fullAddress: feature.place_name,
      street,
      city,
      state,
      zipCode,
      latitude,
      longitude,
    };
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (feature: MapboxFeature) => {
    const addressData = parseAddress(feature);

    setQuery(addressData.fullAddress);
    setSuggestions([]);
    setIsDropdownVisible(false);
    Keyboard.dismiss();

    onAddressSelect(addressData);
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsDropdownVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.gray[500]}
          style={styles.searchIcon}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[500]}
          value={query}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsDropdownVisible(true);
            }
          }}
          autoCapitalize="words"
          autoCorrect={false}
        />

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary[500]}
            style={styles.loader}
          />
        )}

        {!isLoading && query.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={colors.gray[500]} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {isDropdownVisible && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestion}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Ionicons
                  name="location"
                  size={18}
                  color={colors.primary[500]}
                  style={styles.suggestionIcon}
                />
                <Text style={styles.suggestionText} numberOfLines={2}>
                  {item.place_name}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}

      {/* No results message */}
      {!isLoading &&
        isDropdownVisible &&
        query.length > 0 &&
        suggestions.length === 0 && (
          <View style={styles.dropdown}>
            <View style={styles.noResults}>
              <Ionicons name="search" size={24} color={colors.gray[600]} />
              <Text style={styles.noResultsText}>No addresses found</Text>
              <Text style={styles.noResultsHint}>Try a different search</Text>
            </View>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.gray[50],
    paddingVertical: spacing.xs,
  },
  loader: {
    marginLeft: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.gray[700],
    borderRadius: radius.md,
    maxHeight: 250,
    overflow: "hidden",
    // Shadow for elevation effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  suggestionIcon: {
    marginRight: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.gray[100],
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: colors.gray[800],
  },
  noResults: {
    padding: spacing.xl,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  noResultsHint: {
    fontSize: typography.sizes.sm,
    color: colors.gray[500],
    marginTop: spacing.xs,
  },
});
