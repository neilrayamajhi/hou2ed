import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Platform,
  Switch,
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
  getScheduledNotifications,
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
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notificationTime, setNotificationTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

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

      // Update profile with new avatar URL
      console.log("[ProfileScreen] Updating profile table...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

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

      // Check user's role first
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "seeker";

      // Only count applications for seekers
      if (userRole === "seeker") {
        const { count, error } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("seeker_id", user.id)
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

  // Load notification time on mount
  const loadNotificationTime = useCallback(async () => {
    if (!user?.id) return;

    try {
      const timeString = await getNotificationTime(user.id);
      if (timeString) {
        // timeString is in UTC (HH:MM:SS), convert to local time
        const [hours, minutes] = timeString.split(":");
        const date = new Date();
        // Set as UTC time first
        date.setUTCHours(parseInt(hours, 10));
        date.setUTCMinutes(parseInt(minutes, 10));
        date.setUTCSeconds(0);
        // Now the Date object represents that UTC time
        // When we display it, JavaScript automatically converts to local time
        setNotificationTime(date);

        // DON'T schedule here - only schedule when user explicitly sets time
        // This prevents notifications from firing on every login
        console.log(
          `📱 Loaded notification time: ${date.getHours()}:${date.getMinutes()} (not scheduling on load)`,
        );
      }
    } catch (error) {
      console.error("Error loading notification time:", error);
    }
  }, [user?.id]);

  // Load notification time on mount
  React.useEffect(() => {
    loadNotificationTime();
  }, [loadNotificationTime]);

  // Handle time change
  const handleTimeChange = useCallback(
    async (event: any, selectedDate?: Date) => {
      if (!selectedDate || !user?.id) return;

      setNotificationTime(selectedDate);

      // On Android, save immediately and dismiss picker
      if (Platform.OS === "android") {
        setShowTimePicker(false);

        // Convert LOCAL time to UTC before saving
        const utcHours = selectedDate.getUTCHours().toString().padStart(2, "0");
        const utcMinutes = selectedDate
          .getUTCMinutes()
          .toString()
          .padStart(2, "0");
        const timeString = `${utcHours}:${utcMinutes}:00`;

        const success = await saveNotificationTime(user.id, timeString);
        if (success) {
          // Schedule LOCAL notification at the selected time
          const localHour = selectedDate.getHours();
          const localMinute = selectedDate.getMinutes();

          console.log(
            `📱 Scheduling local notification for ${localHour}:${localMinute}`,
          );
          const scheduled = await scheduleDailyNotification(
            localHour,
            localMinute,
            user.id,
            user.role || "seeker",
          );

          if (scheduled) {
            // Show LOCAL time to user with role-specific message
            const displayHours = localHour % 12 || 12;
            const ampm = localHour >= 12 ? "PM" : "AM";
            const isProvider = user.role === "provider";

            Alert.alert(
              "Success",
              isProvider
                ? `✅ Daily reminder set for ${displayHours}:${localMinute.toString().padStart(2, "0")} ${ampm}\n\n📋 You'll get a reminder every day to update your listing availability and bed counts.\n\nTap the notification to go directly to the updater!`
                : `✅ Daily notification set for ${displayHours}:${localMinute.toString().padStart(2, "0")} ${ampm}\n\nYou'll be notified every day if there are updates to your applications.`,
            );
          } else {
            Alert.alert(
              "⚠️ Expo Go Limitation",
              "Daily repeating notifications don't work in Expo Go.\n\n" +
                "✅ Your time preference is saved\n" +
                "✅ Will work in production build\n\n" +
                "To test now: Create a development build with 'eas build --profile development'\n\n" +
                "See EXPO_GO_NOTIFICATION_LIMITATION.md for details.",
            );
          }
        } else {
          Alert.alert(
            "⚠️ Expo Go Limitation",
            "Daily repeating notifications don't work in Expo Go.\n\n" +
              "✅ Your time preference is saved\n" +
              "✅ Will work in production build\n\n" +
              "To test now: Create a development build with 'eas build --profile development'\n\n" +
              "See EXPO_GO_NOTIFICATION_LIMITATION.md for details.",
          );
        }
      }
      // On iOS, just update the state - user will tap "Done" to save
    },
    [user?.id],
  );

  // Handle saving the time (called when user taps "Done" on iOS)
  const handleSaveTime = useCallback(async () => {
    if (!user?.id) return;

    setShowTimePicker(false);

    // Convert LOCAL time to UTC before saving
    const utcHours = notificationTime.getUTCHours().toString().padStart(2, "0");
    const utcMinutes = notificationTime
      .getUTCMinutes()
      .toString()
      .padStart(2, "0");
    const timeString = `${utcHours}:${utcMinutes}:00`;

    const success = await saveNotificationTime(user.id, timeString);
    if (success) {
      // Schedule LOCAL notification at the selected time
      const localHour = notificationTime.getHours();
      const localMinute = notificationTime.getMinutes();

      console.log(
        `📱 Scheduling local notification for ${localHour}:${localMinute}`,
      );
      const scheduled = await scheduleDailyNotification(
        localHour,
        localMinute,
        user.id,
        user.role || "seeker",
      );

      if (scheduled) {
        // Show LOCAL time to user with role-specific message
        const displayHours = localHour % 12 || 12;
        const ampm = localHour >= 12 ? "PM" : "AM";
        const isProvider = user.role === "provider";

        Alert.alert(
          "Success",
          isProvider
            ? `✅ Daily reminder set for ${displayHours}:${localMinute.toString().padStart(2, "0")} ${ampm}\n\n📋 You'll get a reminder every day to update your listing availability and bed counts.\n\nTap the notification to go directly to the updater!`
            : `✅ Daily notification set for ${displayHours}:${localMinute.toString().padStart(2, "0")} ${ampm}\n\nYou'll be notified every day if there are updates to your applications.`,
        );
      } else {
        Alert.alert(
          "Warning",
          "Time saved but local notifications may not work. The system will still send push notifications at your set time.",
        );
      }
    } else {
      Alert.alert("Error", "Failed to save notification time");
    }
  }, [user?.id, notificationTime]);

  // Format time for display
  const formatNotificationTime = useCallback(() => {
    const hours = notificationTime.getHours();
    const minutes = notificationTime.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }, [notificationTime]);

  const profileSections: ProfileSection[] = useMemo(
    () => [
      // Provider Dashboard - only show if user is a provider
      ...(user?.role === "provider"
        ? [
            {
              id: "provider-dashboard",
              title: "Provider Dashboard",
              icon: "home-outline" as keyof typeof Ionicons.glyphMap,
              onPress: () => navigation.navigate("ProviderDashboard"),
              showArrow: true,
            },
          ]
        : []),
      {
        id: "applications",
        title: i18n.t("profile.sections.applications"),
        icon: "document-text-outline",
        onPress: handleApplications,
        badge: applicationsCount > 0 ? applicationsCount : undefined,
        showArrow: true,
      },
      {
        id: "account-settings",
        title: i18n.t("profile.sections.accountSettings"),
        icon: "settings-outline",
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
              {/* Notification settings - Provider only */}
              {user?.role === "provider" && (
                <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>
                    {i18n.t("profile.settings.pushNotifications")}
                  </Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{
                    false: colors.gray[700],
                    true: colors.primary[600],
                  }}
                  thumbColor={
                    pushNotifications ? colors.primary[400] : colors.gray[400]
                  }
                  accessibilityLabel="Push notifications toggle"
                  accessibilityRole="switch"
                />
              </View>
              )}

              {/* Notification Time - Provider only */}
              {user?.role === "provider" && (
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => setShowTimePicker(true)}
                accessibilityLabel="Set notification time"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>Notification Time</Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {formatNotificationTime()}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.gray[500]}
                  />
                </View>
              </TouchableOpacity>
              )}

              {/* Email Notifications - Provider only */}
              {user?.role === "provider" && (
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>
                    {i18n.t("profile.settings.emailNotifications")}
                  </Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{
                    false: colors.gray[700],
                    true: colors.primary[600],
                  }}
                  thumbColor={
                    emailNotifications ? colors.primary[400] : colors.gray[400]
                  }
                  accessibilityLabel="Email notifications toggle"
                  accessibilityRole="switch"
                />
              </View>
              )}

              {/* Delete Account Button */}
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
    [
      pushNotifications,
      emailNotifications,
      handleDeleteAccount,
      i18n.language,
      i18n.t,
      formatNotificationTime,
      user?.role,
    ],
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

        {/* Provider Daily Reminder Banner - SUPER OBVIOUS */}
        {user?.role === "provider" && (
          <View style={styles.providerReminderBanner}>
            <View style={styles.reminderBannerHeader}>
              <View style={styles.reminderIconContainer}>
                <Ionicons name="notifications" size={24} color="#D4AF37" />
              </View>
              <View style={styles.reminderHeaderText}>
                <Text style={styles.reminderTitle}>
                  📋 Daily Availability Reminder
                </Text>
                <Text style={styles.reminderSubtitle}>
                  Get reminded to update your listing availability
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.reminderTimeButton}
              onPress={() => setShowTimePicker(true)}
              accessibilityLabel="Set daily reminder time"
              accessibilityRole="button"
            >
              <View style={styles.reminderTimeContent}>
                <View>
                  <Text style={styles.reminderTimeLabel}>
                    Remind me daily at:
                  </Text>
                  <Text style={styles.reminderTimeDisplay}>
                    {formatNotificationTime()}
                  </Text>
                </View>
                <View style={styles.reminderTimeAction}>
                  <Text style={styles.reminderChangeText}>CHANGE</Text>
                  <Ionicons name="time" size={24} color="#D4AF37" />
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.reminderHelpText}>
              💡 Tap the notification to jump straight to your availability
              updater and keep your listings current!
            </Text>
          </View>
        )}

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

      {/* Time Picker - Provider only */}
      {showTimePicker && (
        <>
          {Platform.OS === "ios" ? (
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
                  style={styles.timePickerModal}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.timePickerHeader}>
                    <Text style={styles.timePickerTitle}>
                      Select Notification Time
                    </Text>
                    <TouchableOpacity
                      onPress={handleSaveTime}
                      style={styles.timePickerDone}
                    >
                      <Text style={styles.timePickerDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={notificationTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={colors.gray[50]}
                  />
                </Pressable>
              </Pressable>
            </Modal>
          ) : (
            <DateTimePicker
              value={notificationTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
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
  // Provider Reminder Banner Styles
  providerReminderBanner: {
    backgroundColor: "#1a1a0f", // Slightly gold-tinted black
    borderWidth: 2,
    borderColor: "#D4AF37",
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
    padding: spacing.lg,
    shadowColor: "#D4AF37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reminderBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  reminderIconContainer: {
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    borderRadius: radius.full,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  reminderHeaderText: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
    color: "#D4AF37",
    marginBottom: spacing.xs,
  },
  reminderSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.gray[300],
  },
  reminderTimeButton: {
    backgroundColor: colors.gray[900],
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#D4AF37",
    marginVertical: spacing.md,
  },
  reminderTimeContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderTimeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.gray[400],
    marginBottom: spacing.xs,
  },
  reminderTimeDisplay: {
    fontSize: typography.sizes["2xl"],
    fontWeight: "700",
    color: "#D4AF37",
  },
  reminderTimeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  reminderChangeText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: "#D4AF37",
  },
  reminderHelpText: {
    fontSize: typography.sizes.xs,
    color: colors.gray[500],
    textAlign: "center",
    lineHeight: 18,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: colors.gray[800],
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
    marginBottom: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.gray[900],
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.sizes.sm,
    color: colors.gray[50],
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[700],
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  cancelButton: {
    backgroundColor: colors.gray[700],
  },
  cancelButtonText: {
    fontSize: typography.sizes.sm,
    color: colors.gray[200],
  },
  submitButton: {
    backgroundColor: colors.primary[500],
  },
  submitButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.gray[900],
  },
  timePickerModal: {
    backgroundColor: colors.gray[800],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  timePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[700],
  },
  timePickerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "600",
    color: colors.gray[50],
  },
  timePickerDone: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  timePickerDoneText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.primary[400],
  },
});
