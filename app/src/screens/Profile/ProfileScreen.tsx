import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import { RootStackNavigationProp } from "../../navigation/types";
import { useI18n } from "../../i18n";
import { supabase } from "../../lib/supabase";
import { transformUserData } from "../../utils/auth";
import {
  getNotificationTime,
  saveNotificationTime,
  scheduleDailyNotification,
} from "../../services/notification.service";

interface ProfileSection {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
  showArrow?: boolean;
}

export default function ProfileScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, logout, setUser } = useAuthStore();
  const i18n = useI18n();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar_url || null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [applicationsCount, setApplicationsCount] = useState<number>(0);

  // Notification time picker state (for providers)
  const [notificationTime, setNotificationTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loadingNotificationTime, setLoadingNotificationTime] = useState(false);

  const handleEditAvatar = useCallback(async () => {
    console.log("[ProfileScreen] Starting avatar upload...");
    if (!user?.id) {
      Alert.alert(
        "Error",
        "You must be logged in to update your profile picture",
      );
      return;
    }

    try {
      // Pick image
      console.log("[ProfileScreen] Launching image picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log("[ProfileScreen] Image picker result:", {
        canceled: result.canceled,
        hasAssets: !!result.assets?.[0],
      });

      if (result.canceled || !result.assets[0]) {
        console.log("[ProfileScreen] Image selection canceled");
        return;
      }

      const asset = result.assets[0];
      console.log("[ProfileScreen] Selected image:", {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
      });

      // Validate file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        console.error("[ProfileScreen] Image too large:", asset.fileSize);
        Alert.alert("Error", "Image must be less than 5MB");
        return;
      }

      setUploadingAvatar(true);

      // In React Native, we need to use ArrayBuffer instead of blob
      console.log("[ProfileScreen] Fetching image data...");
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      console.log("[ProfileScreen] ArrayBuffer created:", {
        size: arrayBuffer.byteLength,
      });

      const fileExt = asset.uri.split(".").pop() || "jpg";
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      console.log("[ProfileScreen] Uploading to Supabase:", {
        bucket: "avatars",
        path: filePath,
        size: arrayBuffer.byteLength,
        contentType: asset.mimeType || "image/jpeg",
      });

      // Upload to Supabase Storage using ArrayBuffer
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, arrayBuffer, {
          contentType: asset.mimeType || "image/jpeg",
          upsert: true,
        });

      console.log("[ProfileScreen] Upload response:", {
        data: uploadData,
        error: uploadError,
      });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      console.log("[ProfileScreen] Getting public URL...");
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      console.log("[ProfileScreen] Public URL:", urlData?.publicUrl);

      if (!urlData?.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      // Update profile with new avatar URL (user.id is guaranteed by guard above)
      console.log("[ProfileScreen] Updating profile table...");
      const userId = user.id!; // Non-null assertion - checked at function start
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", userId);

      console.log("[ProfileScreen] Profile update result:", {
        error: updateError,
      });

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setAvatarUri(urlData.publicUrl);

      // Refresh user data to include new avatar_url
      console.log("[ProfileScreen] Refreshing user data...");
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const updatedUserData = await transformUserData(authData.user);
        setUser(updatedUserData);
        console.log("[ProfileScreen] User data refreshed with avatar!");
      }

      console.log("[ProfileScreen] Avatar upload successful!");
      Alert.alert("Success", "Profile picture updated successfully");
    } catch (error) {
      console.error("[ProfileScreen] Avatar upload error:", error);
      console.error(
        "[ProfileScreen] Error details:",
        JSON.stringify(error, null, 2),
      );
      Alert.alert(
        "Error",
        `Failed to upload profile picture: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setUploadingAvatar(false);
    }
  }, [user, setUser]);

  // Fetch applications count (excluding withdrawn and deleted)
  const fetchApplicationsCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { supabase } = await import("../../lib/supabase");

      // Check user's role first (user.id is guaranteed by guard above)
      const userId = user.id!; // Non-null assertion - checked at function start
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const userRole = profile?.role || "seeker";

      // Only count applications for seekers
      if (userRole === "seeker") {
        const { count, error } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("seeker_id", userId)
          .is("deleted_at", null) // Exclude soft-deleted
          .neq("status", "withdrawn"); // Exclude withdrawn

        if (!error && count !== null) {
          setApplicationsCount(count);
        } else {
          // If there's an error or no count, set to 0
          setApplicationsCount(0);
        }
      } else {
        // Providers don't have applications in the same way
        setApplicationsCount(0);
      }
    } catch (error) {
      console.error("Error fetching applications count:", error);
      setApplicationsCount(0); // Reset to 0 on error
    }
  }, [user?.id]);

  // Fetch count on mount and when screen is focused
  React.useEffect(() => {
    fetchApplicationsCount();
  }, [fetchApplicationsCount]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchApplicationsCount();
    });
    return unsubscribe;
  }, [navigation, fetchApplicationsCount]);

  const handleApplications = useCallback(() => {
    navigation.navigate("ApplicationsList");
  }, [navigation]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirm Deletion",
              "Type 'DELETE' to confirm account deletion",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Confirm",
                  style: "destructive",
                  onPress: async () => {
                    await logout();
                    navigation.reset({
                      index: 0,
                      routes: [{ name: "OnboardingScreen" }],
                    });
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [logout, navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          logout();
          navigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  }, [logout, navigation]);

  // Load notification time preference on mount (providers only)
  const loadNotificationTime = useCallback(async () => {
    if (!user?.id || user?.role !== "provider") {
      return;
    }

    try {
      setLoadingNotificationTime(true);
      const timeString = await getNotificationTime(user.id);

      if (timeString) {
        // Parse time string (format: "HH:MM:SS" or "HH:MM")
        const [hours, minutes] = timeString.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        setNotificationTime(date);
        console.log(
          `📱 Loaded notification time: ${timeString} (hours: ${hours}, minutes: ${minutes})`,
        );
      } else {
        // No saved time - keep as null to show "Not set"
        setNotificationTime(null);
        console.log("📱 No saved notification time found - showing 'Not set'");
      }
    } catch (error) {
      console.error("Error loading notification time:", error);
      // On error, keep as null
      setNotificationTime(null);
    } finally {
      console.log("🏁 Finally block: Setting loading=false");
      setLoadingNotificationTime(false);
      console.log("✅ State updates queued");
    }
  }, [user?.id, user?.role]);

  // Handle time change from picker (iOS just updates state, Android saves immediately)
  const handleTimeChange = useCallback(
    async (event: any, selectedDate?: Date) => {
      if (!selectedDate) return;

      // On Android, close picker and save immediately
      if (Platform.OS === "android") {
        setShowTimePicker(false);
        if (!user?.id) return;

        setLoadingNotificationTime(true);

        try {
          setNotificationTime(selectedDate);

          // Format time as HH:MM:SS for database
          const hours = selectedDate.getHours();
          const minutes = selectedDate.getMinutes();
          const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

          console.log(
            `💾 Saving notification time: ${timeString} (${hours}:${minutes})`,
          );

          // Save to database
          const saved = await saveNotificationTime(user.id, timeString);

          if (saved) {
            console.log(`✅ Time saved to database successfully`);

            // Schedule the daily notification
            const scheduled = await scheduleDailyNotification(
              hours,
              minutes,
              user.id,
              user.role as "provider" | "seeker",
            );

            console.log(`📅 Scheduling result: ${scheduled}`);

            // Format time for display (12-hour format)
            const displayTime = selectedDate.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            });

            // Keep the state as-is (already set from setNotificationTime above)
            // Don't reload from database to avoid race condition

            Alert.alert(
              "✅ Reminder Set",
              user.role === "provider"
                ? `You'll get a daily reminder at ${displayTime} to recheck your bed availability.\n\n💡 Tap the notification to go directly to your availability updater!\n\n⚠️ Note: Repeating notifications only work in production builds, not in Expo Go.`
                : `You'll receive application updates daily at ${displayTime}.`,
              [{ text: "Got it!" }],
            );

            console.log(
              `✅ Notification time saved and scheduled: ${displayTime}`,
            );
          } else {
            Alert.alert(
              "Error",
              "Failed to save notification time. Please try again.",
            );
          }
        } catch (error) {
          console.error("Error setting notification time:", error);
          Alert.alert(
            "Error",
            "Failed to set notification time. Please try again.",
          );
        } finally {
          setLoadingNotificationTime(false);
        }
      } else {
        // On iOS, just update the state (user will tap "Done" to save)
        setNotificationTime(selectedDate);
      }
    },
    [user?.id, user?.role],
  );

  // Handle opening the time picker
  const handleOpenTimePicker = useCallback(() => {
    // If no time is set, initialize with current time or 7 PM default
    if (!notificationTime) {
      const defaultTime = new Date();
      defaultTime.setHours(19, 0, 0, 0); // Default to 7:00 PM
      setNotificationTime(defaultTime);
    }
    setShowTimePicker(true);
  }, [notificationTime]);

  // Handle saving time when user taps "Done" on iOS
  const handleSaveTime = useCallback(async () => {
    if (!user?.id || !notificationTime) return;

    setShowTimePicker(false);
    setLoadingNotificationTime(true);

    try {
      // Format time as HH:MM:SS for database
      const hours = notificationTime.getHours();
      const minutes = notificationTime.getMinutes();
      const timeString = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;

      console.log(
        `💾 Saving notification time: ${timeString} (${hours}:${minutes})`,
      );

      // Save to database
      const saved = await saveNotificationTime(user.id, timeString);

      if (saved) {
        console.log(`✅ Time saved to database successfully`);

        // Schedule the daily notification
        const scheduled = await scheduleDailyNotification(
          hours,
          minutes,
          user.id,
          user.role as "provider" | "seeker",
        );

        console.log(`📅 Scheduling result: ${scheduled}`);

        // Format time for display (12-hour format)
        const displayTime = notificationTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        // Keep the state as-is (notificationTime is already set correctly)
        // Don't reload from database to avoid race condition

        Alert.alert(
          "✅ Reminder Set",
          user.role === "provider"
            ? `You'll get a daily reminder at ${displayTime} to recheck your bed availability.\n\n💡 Tap the notification to go directly to your availability updater!\n\n⚠️ Note: Repeating notifications only work in production builds, not in Expo Go.`
            : `You'll receive application updates daily at ${displayTime}.`,
          [{ text: "Got it!" }],
        );

        console.log(`✅ Notification time saved and scheduled: ${displayTime}`);
      } else {
        Alert.alert(
          "Error",
          "Failed to save notification time. Please try again.",
        );
      }
    } catch (error) {
      console.error("Error setting notification time:", error);
      Alert.alert(
        "Error",
        "Failed to set notification time. Please try again.",
      );
    } finally {
      setLoadingNotificationTime(false);
    }
  }, [user?.id, user?.role, notificationTime]);

  // Load notification time on mount
  useEffect(() => {
    console.log(`🔍 ProfileScreen mount - user role: ${user?.role}`);

    if (user?.role === "provider") {
      console.log("📞 Calling loadNotificationTime on mount");
      loadNotificationTime();
    }
  }, [loadNotificationTime, user?.role]);

  // Note: Focus listener removed to prevent double-loading on mount
  // The mount useEffect above handles initial load
  // TODO: Add back focus listener if needed for refresh when returning to screen

  const profileSections: ProfileSection[] = useMemo(
    () => [
      // My Applications - only show for seekers (providers don't apply to housing)
      ...(user?.role === "seeker"
        ? [
            {
              id: "applications",
              title: i18n.t("profile.sections.applications"),
              icon: "document-text-outline" as keyof typeof Ionicons.glyphMap,
              onPress: handleApplications,
              badge: applicationsCount > 0 ? applicationsCount : undefined,
              showArrow: true,
            },
          ]
        : []),
      {
        id: "account-settings",
        title: i18n.t("profile.sections.accountSettings"),
        icon: "settings-outline",
        onPress: () => {},
        showArrow: false,
      },
      {
        id: "legal",
        title: "Legal",
        icon: "shield-checkmark-outline",
        onPress: () => {},
        showArrow: false,
      },
    ],
    [
      user?.role,
      i18n.language,
      handleApplications,
      applicationsCount,
      navigation,
    ],
  );

  const renderSection = useCallback(
    (section: ProfileSection) => {
      if (section.id === "account-settings") {
        return (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.icon}
                size={20}
                color={colors.primary[400]}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.settingsContent}>
              {/* Notification Time - Show for providers */}
              {user?.role === "provider" && (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={handleOpenTimePicker}
                  accessibilityLabel="Set notification time"
                  accessibilityRole="button"
                >
                  <View style={styles.settingLeft}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.gray[400]}
                    />
                    <Text style={styles.settingText}>
                      Daily Availability Reminder
                    </Text>
                  </View>
                  <View style={styles.settingRight}>
                    {(() => {
                      console.log(
                        `🎨 RENDER: loading=${loadingNotificationTime}, time=${notificationTime?.toLocaleTimeString()}`,
                      );
                      return loadingNotificationTime ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary[500]}
                        />
                      ) : (
                        <Text style={styles.settingValue}>
                          {notificationTime
                            ? notificationTime.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "Not set"}
                        </Text>
                      );
                    })()}
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.gray[500]}
                    />
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate("BlockedUsers")}
                accessibilityLabel="Blocked users"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="ban-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>Blocked Users</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingRow, styles.dangerRow]}
                onPress={handleDeleteAccount}
                accessibilityLabel="Delete account"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="trash-outline" size={18} color={colors.red} />
                  <Text style={[styles.settingText, styles.dangerText]}>
                    Delete Account
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.red} />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      if (section.id === "legal") {
        return (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={section.icon}
                size={20}
                color={colors.primary[400]}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.settingsContent}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate("TermsOfService")}
                accessibilityLabel="Privacy Policy"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>Privacy Policy</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate("TermsOfService")}
                accessibilityLabel="Terms of Service"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>Terms of Service</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      return (
        <TouchableOpacity
          key={section.id}
          style={styles.section}
          onPress={section.onPress}
          accessibilityLabel={section.title}
          accessibilityRole="button"
        >
          <View style={styles.sectionContent}>
            <View style={styles.sectionLeft}>
              <Ionicons
                name={section.icon}
                size={20}
                color={colors.primary[400]}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionRight}>
              {section.badge !== undefined && section.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{section.badge}</Text>
                </View>
              )}
              {section.showArrow && (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.gray[500]}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [handleDeleteAccount, i18n.language, i18n.t, navigation],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{i18n.t("profile.title")}</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleEditAvatar}
            accessibilityLabel="Edit profile picture"
            accessibilityRole="button"
          >
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {uploadingAvatar ? (
                  <View style={styles.avatarPlaceholder}>
                    <ActivityIndicator
                      size="large"
                      color={colors.primary[500]}
                    />
                  </View>
                ) : avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person"
                      size={40}
                      color={colors.gray[600]}
                    />
                  </View>
                )}
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {user?.fullName || user?.username || "User"}
          </Text>
          <Text style={styles.userEmail}>{user?.email || "Not available"}</Text>
          <Text style={styles.userRole}>
            {user?.role === "provider"
              ? i18n.t("profile.housingProvider")
              : i18n.t("profile.housingSeeker")}
          </Text>
        </View>

        {/* Profile Sections */}
        <View style={styles.sectionsContainer}>
          {profileSections.map(renderSection)}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleLogout}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time Picker Modal (for notification time) */}
      {showTimePicker && Platform.OS === "ios" ? (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowTimePicker(false)}
          >
            <Pressable
              style={styles.timePickerModalContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.timePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={styles.timePickerCancel}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.timePickerTitle}>
                  Set Daily Reminder Time
                </Text>
                <TouchableOpacity
                  onPress={handleSaveTime}
                  style={styles.timePickerDone}
                >
                  <Text style={styles.timePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={notificationTime || new Date()}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                textColor={colors.gray[50]}
                style={styles.timePicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={notificationTime || new Date()}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[900],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: colors.gray[50],
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.gray[800],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.gray[900],
  },
  userName: {
    fontSize: typography.sizes.xl,
    fontWeight: "600",
    color: colors.gray[50],
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginTop: spacing.xs,
  },
  userRole: {
    fontSize: typography.sizes.sm,
    color: colors.primary[400],
    marginTop: spacing.xs,
  },
  sectionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    backgroundColor: colors.gray[850],
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  sectionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  sectionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "500",
    color: colors.gray[50],
    marginLeft: spacing.md,
  },
  badge: {
    backgroundColor: colors.primary[500],
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.gray[900],
  },
  settingsContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  settingText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[200],
    marginLeft: spacing.md,
  },
  settingValue: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
  },
  dangerRow: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: colors.red,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.gray[850],
  },
  signOutText: {
    fontSize: typography.sizes.md,
    fontWeight: "500",
    color: colors.red,
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  timePickerModalContainer: {
    backgroundColor: colors.gray[850],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xl,
  },
  timePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[800],
  },
  timePickerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
  },
  timePickerCancel: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  timePickerCancelText: {
    fontSize: typography.sizes.md,
    color: colors.gray[400],
  },
  timePickerDone: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[500],
    borderRadius: radius.md,
  },
  timePickerDoneText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.gray[900],
  },
  timePicker: {
    height: 200,
  },
});
