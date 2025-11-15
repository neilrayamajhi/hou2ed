import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Modal,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import { useSavedSearches } from "../../hooks/useSavedItems";
import { RootStackNavigationProp } from "../../navigation/types";
import { useI18n, LANGUAGES } from "../../i18n";
import { supabase } from "../../lib/supabase";
import { transformUserData } from "../../utils/auth";

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
  const { savedSearches } = useSavedSearches();
  const i18n = useI18n();

  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar_url || null,
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [applicationsCount, setApplicationsCount] = useState<number>(0);

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

  const handleSavedSearches = useCallback(() => {
    Alert.alert(
      "Saved Searches",
      `You have ${savedSearches.length} saved searches`,
    );
  }, [savedSearches]);

  const handleChangePassword = useCallback(() => {
    setChangePasswordModalVisible(true);
  }, []);

  const submitPasswordChange = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    try {
      const { supabase } = await import("../../lib/supabase");

      // Update the password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert("Error", "Failed to change password. Please try again.");
        return;
      }

      Alert.alert("Success", "Password changed successfully");
      setChangePasswordModalVisible(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      Alert.alert("Error", "Failed to change password. Please try again.");
    }
  }, [currentPassword, newPassword, confirmPassword]);

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

  const handleSwitchRole = useCallback(async () => {
    const newRole = user?.role === "provider" ? "seeker" : "provider";
    Alert.alert(
      "Switch Role",
      `Switch to ${newRole === "provider" ? "Housing Provider" : "Housing Seeker"}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Switch",
          onPress: async () => {
            try {
              const { supabase } = await import("../../lib/supabase");
              const {
                data: { user: authUser },
              } = await supabase.auth.getUser();

              if (!authUser) {
                Alert.alert("Error", "Not logged in");
                return;
              }

              const { error } = await supabase
                .from("profiles")
                .update({ role: newRole })
                .eq("id", authUser.id);

              if (error) {
                Alert.alert("Error", "Failed to switch role");
                return;
              }

              Alert.alert(
                "Success",
                `Switched to ${newRole}. Please sign out and back in to see changes.`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      logout();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: "Login" }],
                      });
                    },
                  },
                ],
              );
            } catch (err) {
              Alert.alert("Error", "Failed to switch role");
            }
          },
        },
      ],
    );
  }, [user?.role, logout, navigation]);

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
        id: "saved-searches",
        title: i18n.t("profile.sections.savedSearches"),
        icon: "search-outline",
        onPress: handleSavedSearches,
        badge: savedSearches.length,
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
      handleSavedSearches,
      savedSearches.length,
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
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleChangePassword}
                accessibilityLabel="Change password"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="key-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>
                    {i18n.t("profile.settings.changePassword")}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.gray[500]}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate("BlockedUsers")}
                accessibilityLabel="Manage blocked users"
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

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  Alert.alert(
                    i18n.t("profile.settings.selectLanguage"),
                    i18n.t("profile.settings.chooseLanguage"),
                    [
                      ...LANGUAGES.map((lang) => ({
                        text: `${lang.nativeName} (${lang.name})`,
                        onPress: () => i18n.setLanguage(lang.code),
                      })),
                      { text: i18n.t("common.cancel"), style: "cancel" },
                    ],
                  );
                }}
                accessibilityLabel="Change language"
                accessibilityRole="button"
              >
                <View style={styles.settingLeft}>
                  <Ionicons
                    name="language-outline"
                    size={18}
                    color={colors.gray[400]}
                  />
                  <Text style={styles.settingText}>
                    {i18n.t("profile.settings.language")}
                  </Text>
                </View>
                <View style={styles.settingRight}>
                  <Text style={styles.settingValue}>
                    {LANGUAGES.find((l) => l.code === i18n.language)?.name ||
                      "English"}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.gray[500]}
                  />
                </View>
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
      handleChangePassword,
      handleDeleteAccount,
      handleApplications,
      handleSavedSearches,
      savedSearches.length,
      i18n.language,
      i18n.t,
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

        {/* Profile Sections */}
        <View style={styles.sectionsContainer}>
          {profileSections.map(renderSection)}
        </View>

        {/* Dev Tools Section */}
        <View style={styles.devToolsSection}>
          <Text style={styles.devToolsTitle}>Developer Tools</Text>

          <TouchableOpacity
            style={styles.devButton}
            onPress={() => navigation.navigate("DevMenu")}
            accessibilityLabel="Open dev menu"
            accessibilityRole="button"
          >
            <Ionicons
              name="code-outline"
              size={20}
              color={colors.primary[500]}
            />
            <Text style={styles.devButtonText}>Dev Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devButton}
            onPress={handleSwitchRole}
            accessibilityLabel="Switch role"
            accessibilityRole="button"
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color={colors.primary[500]}
            />
            <Text style={styles.devButtonText}>
              Switch to {user?.role === "provider" ? "Seeker" : "Provider"}
            </Text>
          </TouchableOpacity>
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

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangePasswordModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setChangePasswordModalVisible(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>
              {i18n.t("profile.changePassword.title")}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder={i18n.t("profile.changePassword.current")}
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="Current password input"
            />

            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder={i18n.t("profile.changePassword.new")}
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="New password input"
            />

            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={i18n.t("profile.changePassword.confirm")}
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="Confirm password input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setChangePasswordModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>
                  {i18n.t("common.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitPasswordChange}
              >
                <Text style={styles.submitButtonText}>
                  {i18n.t("profile.changePassword.submit")}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  devToolsSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  devToolsTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.gray[500],
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.gray[850],
    borderWidth: 1,
    borderColor: colors.primary[500],
    marginBottom: spacing.sm,
  },
  devButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    color: colors.primary[500],
    marginLeft: spacing.sm,
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
});
