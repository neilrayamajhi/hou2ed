import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../state/useAuthStore";
import { theme } from "../../theme";

type UserRole = "seeker" | "provider" | null;

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const navigation = useNavigation();
  const setStoreRole = useAuthStore((state) => state.setSelectedRole);

  const handleContinue = () => {
    if (selectedRole) {
      setStoreRole(selectedRole);
      // @ts-ignore - Navigation types will be properly set up later
      navigation.navigate("SignUp", { role: selectedRole });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.heading}>What would you like to do today?</Text>

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                selectedRole === "seeker"
                  ? styles.cardSelected
                  : styles.cardUnselected,
              ]}
              onPress={() => setSelectedRole("seeker")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="home-outline"
                size={48}
                color={
                  selectedRole === "seeker"
                    ? "#000000"
                    : "#D4AF37"
                }
              />
              <Text
                style={[
                  styles.cardText,
                  selectedRole === "seeker"
                    ? styles.cardTextSelected
                    : styles.cardTextUnselected,
                ]}
              >
                Find Housing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.card,
                selectedRole === "provider"
                  ? styles.cardSelected
                  : styles.cardUnselected,
              ]}
              onPress={() => setSelectedRole("provider")}
              activeOpacity={0.8}
            >
              <Ionicons
                name="business-outline"
                size={48}
                color={
                  selectedRole === "provider"
                    ? "#000000"
                    : "#D4AF37"
                }
              />
              <Text
                style={[
                  styles.cardText,
                  selectedRole === "provider"
                    ? styles.cardTextSelected
                    : styles.cardTextUnselected,
                ]}
              >
                List Housing
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Providers can also search for housing if they wish
          </Text>

          <TouchableOpacity
            style={[
              styles.continueButton,
              !selectedRole && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xxl,
    justifyContent: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#D4AF37",
    textAlign: "center",
    marginBottom: theme.spacing.xxl,
  },
  cardsContainer: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  card: {
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
    borderWidth: 2,
  },
  cardSelected: {
    backgroundColor: "#D4AF37",
    borderColor: "#D4AF37",
  },
  cardUnselected: {
    backgroundColor: "#000000",
    borderColor: "#D4AF37",
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: theme.spacing.md,
  },
  cardTextSelected: {
    color: "#000000",
  },
  cardTextUnselected: {
    color: "#D4AF37",
  },
  subtext: {
    color: "#FFFFFF",
    fontSize: 14,
    textAlign: "center",
    marginBottom: theme.spacing.xxl,
  },
  continueButton: {
    backgroundColor: "#D4AF37",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "bold",
  },
});