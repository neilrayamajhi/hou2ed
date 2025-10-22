import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, typography, radius } from "../../theme/tokens";
import { useAuthStore } from "../../state/useAuthStore";
import useSavedStore from "../../state/useSavedStore";
import { RootStackNavigationProp } from "../../navigation/types";
import { useI18n, LANGUAGES } from "../../i18n";

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
  const { user, logout } = useAuthStore();
  const { savedListings, savedSearches } = useSavedStore();
  const i18n = useI18n();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [changePasswordModalVisible, setChangePasswordModalVisible] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleEditAvatar = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  }, []);

  const handleApplications = useCallback(() => {
    Alert.alert("Applications", "You have 3 active applications");
  }, []);

  const handleSavedSearches = useCallback(() => {
    Alert.alert(
      "Saved Searches",
      `You have ${savedSearches.length} saved searches`,
    );
  }, [savedSearches]);

  const handleChangePassword = useCallback(() => {
    setChangePasswordModalVisible(true);
  }, []);

  const submitPasswordChange = useCallback(() => {
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

    Alert.alert("Success", "Password changed successfully");
    setChangePasswordModalVisible(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
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
        onPress: async () => {
          try {
            // First logout completely
            await logout();

            // Small delay to ensure state is cleared
            await new Promise(resolve => setTimeout(resolve, 100));

            // Navigate to RoleSelection (the entry point for auth flow)
            navigation.reset({
              index: 0,
              routes: [{ name: "RoleSelection" }],
            });
          } catch (error) {
            console.error("Logout error:", error);
            // Even if logout fails, still navigate to auth screen
            navigation.reset({
              index: 0,
              routes: [{ name: "RoleSelection" }],
            });
          }
        },
      },
    ]);
  }, [logout, navigation]);

  const profileSections: ProfileSection[] = [
    {
      id: "applications",
      title: "My Applications",
      icon: "document-text-outline",
      onPress: handleApplications,
      badge: 3,
      showArrow: true,
    },
    {
      id: "saved-searches",
      title: "Saved Searches",
      icon: "search-outline",
      onPress: handleSavedSearches,
      badge: savedSearches.length,
      showArrow: true,
    },
    {
      id: "account-settings",
      title: "Account Settings",
      icon: "settings-outline",
      onPress: () => {},
      showArrow: false,
    },
  ];

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
                  <Text style={styles.settingText}>Change Password</Text>
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
                  <Text style={styles.settingText}>Push Notifications</Text>
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
                  <Text style={styles.settingText}>Email Notifications</Text>
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
                    "Select Language",
                    "Choose your preferred language",
                    [
                      ...LANGUAGES.map((lang) => ({
                        text: `${lang.nativeName} (${lang.name})`,
                        onPress: () => i18n.setLanguage(lang.code),
                      })),
                      { text: "Cancel", style: "cancel" },
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
                  <Text style={styles.settingText}>Language</Text>
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
    ],
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
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
                {avatarUri ? (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons
                      name="person"
                      size={40}
                      color={colors.gray[600]}
                    />
                  </View>
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
            {user?.role === "provider" ? "Housing Provider" : "Housing Seeker"}
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
            <Text style={styles.modalTitle}>Change Password</Text>

            <TextInput
              style={styles.modalInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current Password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="Current password input"
            />

            <TextInput
              style={styles.modalInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="New password input"
            />

            <TextInput
              style={styles.modalInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.gray[500]}
              secureTextEntry
              accessibilityLabel="Confirm password input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setChangePasswordModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitPasswordChange}
              >
                <Text style={styles.submitButtonText}>Change Password</Text>
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
