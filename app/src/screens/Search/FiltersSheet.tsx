import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import FilterAccordion from "../../components/FilterAccordion";
import Checkbox from "../../components/ui/Checkbox";
import Button from "../../components/ui/Button";
import Slider from "../../components/ui/Slider";
import { useFilterStore } from "../../state/useFilterStore";
import { countBooleanFilters } from "../../utils/filterHelpers";
import { FILTER_SECTIONS, getFilterCount } from "../../config/filterConfig";
import type { FilterState } from "../../types/filters";

interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Type-safe helper to get filter value
function getFilterValue(
  filters: FilterState,
  category: string,
  key: string
): boolean {
  const categoryData = filters[category as keyof FilterState];
  if (categoryData && typeof categoryData === 'object') {
    return (categoryData as Record<string, boolean>)[key] || false;
  }
  return false;
}

export default function FiltersSheet({ visible, onClose }: FiltersSheetProps) {
  const {
    snapshot,
    loadSnapshot,
    clearAll,
    setNestedFilter,
    setPriceRange,
    setLocation,
    priceRange,
    location,
  } = useFilterStore();

  // Local state for temporary filter changes
  const [tempFilters, setTempFilters] = useState<FilterState>(snapshot());

  // Update temp filters when modal opens
  useEffect(() => {
    if (visible) {
      setTempFilters(snapshot());
    }
  }, [visible, snapshot]);

  // Handle checkbox changes
  const handleFilterToggle = useCallback(
    (category: keyof FilterState, key: string, value: boolean) => {
      setTempFilters((prev) => {
        const categoryData = prev[category];
        if (typeof categoryData === 'object' && categoryData !== null) {
          return {
            ...prev,
            [category]: {
              ...categoryData,
              [key]: value,
            },
          };
        }
        return prev;
      });
    },
    []
  );

  // Handle price range change
  const handlePriceChange = useCallback((values: [number, number]) => {
    setTempFilters((prev) => ({
      ...prev,
      priceRange: { min: values[0], max: values[1] },
    }));
  }, []);

  // Handle location changes
  const handleLocationChange = useCallback((field: string, value: string) => {
    setTempFilters((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value || undefined,
      },
    }));
  }, []);

  // Apply filters
  const handleApply = useCallback(() => {
    loadSnapshot(tempFilters);
    onClose();
  }, [tempFilters, loadSnapshot, onClose]);

  // Clear all filters
  const handleClearAll = useCallback(() => {
    clearAll();
    setTempFilters(snapshot());
  }, [clearAll, snapshot]);

  // Count active filters in each category
  const getCategoryCount = useCallback(
    (category: keyof FilterState) => {
      const categoryData = tempFilters[category];
      if (typeof categoryData === "object" && categoryData !== null) {
        return countBooleanFilters(categoryData as Record<string, any>);
      }
      return 0;
    },
    [tempFilters]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClearAll}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={"#FFFFFF"} />
            </TouchableOpacity>
          </View>

          {/* Filter Sections */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Location Section */}
            <FilterAccordion title="Location" defaultExpanded>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={"#4B5563"}
                  value={tempFilters.location.city || ""}
                  onChangeText={(text) => handleLocationChange("city", text)}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ZIP Code"
                  placeholderTextColor={"#4B5563"}
                  value={tempFilters.location.zipCode || ""}
                  onChangeText={(text) => handleLocationChange("zipCode", text)}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
            </FilterAccordion>

            {/* Price Range Section */}
            <FilterAccordion title="Price Range">
              <Slider
                min={0}
                max={5000}
                values={[tempFilters.priceRange.min, tempFilters.priceRange.max]}
                onValuesChange={handlePriceChange}
                step={50}
                prefix="$"
                formatValue={(v) => (v === 0 ? "Free" : v.toString())}
              />
            </FilterAccordion>

            {/* Filter Categories */}
            {Object.entries(FILTER_SECTIONS).map(([categoryKey, categoryData]) => (
              <FilterAccordion
                key={categoryKey}
                title={categoryData.title}
                activeCount={getCategoryCount(categoryKey as keyof FilterState)}
              >
                <View style={styles.checkboxGroup}>
                  {categoryData.filters.map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      style={styles.checkboxRow}
                      onPress={() =>
                        handleFilterToggle(
                          categoryKey as keyof FilterState,
                          filter.key,
                          !getFilterValue(tempFilters, categoryKey, filter.key)
                        )
                      }
                    >
                      <Checkbox
                        value={getFilterValue(tempFilters, categoryKey, filter.key)}
                        onValueChange={(value) =>
                          handleFilterToggle(
                            categoryKey as keyof FilterState,
                            filter.key,
                            value
                          )
                        }
                      />
                      <Text style={styles.checkboxLabel}>{filter.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FilterAccordion>
            ))}
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.footer}>
            <Button variant="primary" onPress={handleApply} style={styles.applyButton}>
              Apply Filters
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1F2937",
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: "#D4AF37",
  },
  clearAllText: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  inputGroup: {
    gap: theme.spacing.md,
  },
  input: {
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
  },
  checkboxGroup: {
    gap: theme.spacing.sm,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  checkboxLabel: {
    fontSize: theme.typography.fontSize.md,
    color: "#FFFFFF",
    flex: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "#1F2937",
  },
  applyButton: {
    width: "100%",
  },
});