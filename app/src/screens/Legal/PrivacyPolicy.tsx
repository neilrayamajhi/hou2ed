import React from "react";
import {
  ScrollView,
  Text,
  SafeAreaView,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/tokens";
import { legalStyles as styles } from "./legalStyles";

export default function PrivacyPolicy() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.mainTitle}>HOU2ED PRIVACY POLICY</Text>
        <Text style={styles.updated}>Last Updated: November 12, 2025</Text>
        <Text style={styles.entity}>Entity: HOU2ED LLC</Text>

        <Text style={styles.paragraph}>
          This Privacy Policy explains how HOU2ED LLC ("HOU2ED," "we," "our,"
          "us") collects, uses, stores, and protects your information when you
          use our mobile application, website, or any related services
          ("Services").
        </Text>
        <Text style={styles.paragraph}>
          By creating an account or using HOU2ED, you agree to this Privacy
          Policy.
        </Text>

        <Text style={styles.heading}>Information We Collect</Text>

        <Text style={styles.subheading}>1. Information You Provide</Text>
        <Text style={styles.paragraph}>
          We collect information you submit when you:
          {"\n"}• Create an account
          {"\n"}• Build a user or provider profile
          {"\n"}• Apply for housing or services
          {"\n"}• Upload documents
          {"\n"}• Send messages
          {"\n"}• Submit digitally signed forms
        </Text>
        <Text style={styles.paragraph}>
          This may include:
          {"\n"}• Name, contact information
          {"\n"}• Date of birth
          {"\n"}• Government-issued ID
          {"\n"}• Insurance information
          {"\n"}• Housing history
          {"\n"}• Application responses
          {"\n"}• Uploaded documents (PDFs, photos, forms, etc.)
        </Text>

        <Text style={styles.subheading}>
          2. Information Collected Automatically
        </Text>
        <Text style={styles.paragraph}>
          We may automatically collect:
          {"\n"}• Device information
          {"\n"}• IP address
          {"\n"}• Session activity
          {"\n"}• Crash logs
          {"\n"}• Usage analytics
        </Text>
        <Text style={styles.paragraph}>
          This helps ensure performance, safety, and security.
        </Text>

        <Text style={styles.subheading}>
          3. Information from Providers or Agencies
        </Text>
        <Text style={styles.paragraph}>
          When you apply to a housing provider, organization, or hospital, they
          may share:
          {"\n"}• Application status
          {"\n"}• Document requirements
          {"\n"}• Verification results
          {"\n"}• Eligibility decisions
          {"\n"}• Intake notes or denial reasons
        </Text>
        <Text style={styles.important}>
          We never share your information with any provider unless you send an
          application to them.
        </Text>

        <Text style={styles.heading}>How We Use Information</Text>
        <Text style={styles.paragraph}>
          We use your information to:
          {"\n"}• Operate and improve the HOU2ED platform
          {"\n"}• Match users with available housing options
          {"\n"}• Facilitate communication
          {"\n"}• Process applications and documents
          {"\n"}• Generate intake packets
          {"\n"}• Verify identity
          {"\n"}• Maintain platform safety
          {"\n"}• Provide customer support
        </Text>
        <Text style={styles.important}>
          We do not sell personal information.
        </Text>

        <Text style={styles.heading}>How We Share Information</Text>
        <Text style={styles.paragraph}>
          We may share information only when:
        </Text>
        <Text style={styles.subheading}>1. You Apply to a Provider</Text>
        <Text style={styles.paragraph}>
          We transmit information only to the organizations you intentionally
          select.
        </Text>
        <Text style={styles.subheading}>
          2. We Use Secure Service Providers
        </Text>
        <Text style={styles.paragraph}>
          For storage, authentication, hosting, analytics, or messaging.
        </Text>
        <Text style={styles.subheading}>3. Legal Requirements Apply</Text>
        <Text style={styles.paragraph}>
          We may disclose information if compelled by:
          {"\n"}• Subpoena
          {"\n"}• Court order
          {"\n"}• Applicable law
        </Text>

        <Text style={styles.heading}>Data Security</Text>
        <Text style={styles.paragraph}>
          We use reasonable safeguards, including:
          {"\n"}• Encryption in transit and at rest
          {"\n"}• Role-based access control
          {"\n"}• Time-stamped document verification
          {"\n"}• Audit logs
          {"\n"}• Secure cloud storage
        </Text>
        <Text style={styles.paragraph}>
          No system is completely secure, but we take protective measures to
          safeguard user data.
        </Text>

        <Text style={styles.heading}>Your Rights</Text>
        <Text style={styles.paragraph}>
          You may:
          {"\n"}• Access your information
          {"\n"}• Correct or update data
          {"\n"}• Request deletion
          {"\n"}• Download your documents
          {"\n"}• Close your account
        </Text>
        <Text style={styles.paragraph}>Email: support@hou2ed.com</Text>

        <Text style={styles.heading}>Children's Privacy</Text>
        <Text style={styles.paragraph}>
          HOU2ED is for users 18 and older.
          {"\n"}We do not knowingly collect data from minors.
        </Text>

        <Text style={styles.heading}>Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy as the platform evolves.
          {"\n"}Continued use of HOU2ED means acceptance of the updated policy.
        </Text>

        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.paragraph}>
          support@hou2ed.com
          {"\n"}HOU2ED LLC
        </Text>

        <Text style={styles.heading}>Consent</Text>
        <Text style={styles.important}>By using HOU2ED, you consent to:</Text>
        <Text style={styles.paragraph}>
          • The collection and sharing of your information with providers you
          apply to
          {"\n"}• Electronic communications from HOU2ED and providers
          {"\n"}• The data practices described in this Privacy Policy
        </Text>

        <Text style={styles.footer}>
          By using HOU2ED, you acknowledge that you have read, understood, and
          agree to be bound by this Privacy Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
