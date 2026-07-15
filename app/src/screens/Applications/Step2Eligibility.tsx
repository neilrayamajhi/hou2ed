import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../../theme/tokens";
import {
  ELIGIBILITY_TAG_GROUPS,
  TagOption
} from "../../constants/application";
import type { ApplicationDraft } from "./ApplyWizard";

interface Step2EligibilityProps {
  draft: ApplicationDraft;
  onUpdate: (updates: Partial<ApplicationDraft>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Memoized chip component for performance
const SelectableChip = React.memo(({
  tag,
  isSelected,
  onPress,
}: {
  tag: TagOption;
  isSelected: boolean;
  onPress: (tagId: string) => void;
}) => {
  const handlePress = useCallback(() => {
    onPress(tag.id);
  }, [tag.id, onPress]);

  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityLabel={tag.label}
      accessibilityState={{ checked: isSelected }}
    >
      {isSelected && (
        <Ionicons
          name="checkmark-circle"
          size={18}
          color={colors.black}
          style={styles.checkIcon}
        />
      )}
      <Text
        style={[
          styles.chipText,
          isSelected && styles.chipTextSelected,
        ]}
      >
        {tag.label}
      </Text>
    </TouchableOpacity>
  );
});

SelectableChip.displayName = 'SelectableChip';

// Tag group component for better organization
const TagGroup = React.memo(({
  title,
  tags,
  selectedTags,
  onToggleTag,
}: {
  title: string | null;
  tags: TagOption[];
  selectedTags: Set<string>;
  onToggleTag: (tagId: string) => void;
}) => {
  return (
    <View style={title ? styles.section : undefined}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.tagGrid}>
        {tags.map((tag) => (
          <SelectableChip
            key={tag.id}
            tag={tag}
            isSelected={selectedTags.has(tag.id)}
            onPress={onToggleTag}
          />
        ))}
      </View>
    </View>
  );
});

TagGroup.displayName = 'TagGroup';

export default function Step2Eligibility({
  draft,
  onUpdate,
  onNext,
  onBack,
}: Step2EligibilityProps) {
  // Use Set for O(1) lookups instead of array.includes()
  const [selectedTagsSet, setSelectedTagsSet] = useState<Set<string>>(
    () => new Set(draft.eligibilityTags || [])
  );

  // Convert Set to array for draft update
  const selectedTagsArray = useMemo(
    () => Array.from(selectedTagsSet),
    [selectedTagsSet]
  );

  // Update draft whenever tags change
  useEffect(() => {
    onUpdate({ eligibilityTags: selectedTagsArray });
  }, [selectedTagsArray, onUpdate]);

  // Optimized toggle function using Set operations
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagsSet((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedTagsSet(new Set());
  }, []);

  // Memoized count for performance
  const selectedCount = selectedTagsSet.size;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Tell us about yourself</Text>
          <Text style={styles.subtitle}>
            Select all that apply. This helps us match you with suitable housing.
          </Text>
        </View>

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.gold} />
          <Text style={styles.infoText}>
            Your selections are confidential and will only be used to match you with appropriate housing options.
          </Text>
        </View>

        {/* Render all tag groups from constants */}
        {ELIGIBILITY_TAG_GROUPS.map((group) => (
          <TagGroup
            key={group.id}
            title={group.title}
            tags={group.tags}
            selectedTags={selectedTagsSet}
            onToggleTag={toggleTag}
          />
        ))}

        {/* Selected Count */}
        {selectedCount > 0 && (
          <View style={styles.countContainer}>
            <Text style={styles.countText}>
              {selectedCount} {selectedCount === 1 ? "tag" : "tags"} selected
            </Text>
            <TouchableOpacity
              onPress={clearAllSelections}
              accessibilityRole="button"
              accessibilityLabel="Clear all selections"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Privacy Note */}
        <View style={styles.privacyNote}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.gray[500]} />
          <Text style={styles.privacyText}>
            This information is used solely for matching purposes and is kept strictly confidential.
          </Text>
        </View>
      </ScrollView>

      {/* Footer with Navigation */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel="Continue to next step"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.black} />
          </TouchableOpacity>
        </View>

        <Text style={styles.footerHint}>
          You can skip this step if you prefer not to share
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.white,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.darkGray,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.white,
    lineHeight: 20,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderGray,
    backgroundColor: colors.black,
  },
  chipSelected: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  checkIcon: {
    marginRight: spacing.xs,
  },
  chipText: {
    fontSize: 14,
    color: colors.white,
  },
  chipTextSelected: {
    color: colors.black,
    fontWeight: "600",
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gold,
    marginBottom: spacing.md,
  },
  countContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  countText: {
    fontSize: 14,
    color: colors.white,
  },
  clearText: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: "600",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  privacyText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 12,
    color: colors.gray[500],
    lineHeight: 16,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.lg + 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
    backgroundColor: colors.black,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  backButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.white,
    marginLeft: spacing.sm,
  },
  nextButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.black,
    marginRight: spacing.sm,
  },
  footerHint: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: "center",
    marginTop: spacing.sm,
  },
});