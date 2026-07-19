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

export default function TermsOfService() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.mainTitle}>HOU2ED TERMS OF SERVICE</Text>
        <Text style={styles.updated}>Last Updated: November 12, 2025</Text>
        <Text style={styles.entity}>Entity: HOU2ED LLC</Text>

        <Text style={styles.heading}>Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By creating an account and using HOU2ED, you agree to be bound by
          these Terms of Service. If you do not agree to these terms, please do
          not use the service.
        </Text>

        <Text style={styles.heading}>
          Assumption of Risk and Limitation of Liability
        </Text>
        <Text style={styles.important}>
          IMPORTANT: PLEASE READ THIS SECTION CAREFULLY
        </Text>
        <Text style={styles.paragraph}>
          HOU2ED is a technology platform that connects housing seekers with
          housing providers. We are NOT a housing provider, shelter operator, or
          property manager.
        </Text>
        <Text style={styles.paragraph}>
          By using HOU2ED, you acknowledge and agree that:
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>1. Assumption of Risk:</Text>
          {"\n"}You voluntarily assume all risks associated with visiting,
          staying at, or otherwise interacting with any housing provider or
          facility listed on HOU2ED. These risks include, but are not limited
          to:
          {"\n"}• Personal injury or death
          {"\n"}• Property damage or loss
          {"\n"}• Theft or criminal activity
          {"\n"}• Unsafe conditions or health hazards
          {"\n"}• Bed bugs, pests, or unsanitary conditions
          {"\n"}• Interactions with other residents or staff
          {"\n"}• Any other harm, loss, or damage
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>
            2. No Liability for Provider Actions:
          </Text>
          {"\n"}HOU2ED is NOT responsible or liable for:
          {"\n"}• The condition, safety, or quality of any housing facility
          {"\n"}• The actions, conduct, or negligence of any provider or their
          staff
          {"\n"}• The accuracy of provider listings or representations
          {"\n"}• Provider compliance with housing laws or regulations
          {"\n"}• Any disputes between seekers and providers
          {"\n"}• Services, treatment, or care provided by facilities
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>
            3. No Verification or Endorsement:
          </Text>
          {"\n"}HOU2ED does not verify, inspect, endorse, or guarantee:
          {"\n"}• The legitimacy or licensing of providers
          {"\n"}• The safety or habitability of facilities
          {"\n"}• Background checks on providers or staff
          {"\n"}• Compliance with building codes or health standards
          {"\n"}
          {"\n"}You are solely responsible for conducting your own due diligence
          before visiting or staying at any facility.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>4. Maximum Liability Cap:</Text>
          {"\n"}To the maximum extent permitted by law, HOU2ED's total liability
          to you for any claims arising from your use of the platform shall not
          exceed $100 USD or the amount you paid to HOU2ED in the past 12
          months, whichever is greater.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>5. Waiver of Claims:</Text>
          {"\n"}By using HOU2ED, you waive any and all claims against HOU2ED
          LLC, its officers, directors, employees, agents, and affiliates for
          any injuries, damages, losses, or harm that may occur as a result of
          your use of the platform or your interactions with any housing
          provider.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.important}>6. Indemnification:</Text>
          {"\n"}You agree to indemnify, defend, and hold harmless HOU2ED LLC
          from any claims, damages, losses, liabilities, and expenses (including
          attorney fees) arising from your use of the platform or your
          interactions with any provider.
        </Text>
        <Text style={styles.warning}>
          ⚠️ IF YOU DO NOT AGREE TO ASSUME THESE RISKS, DO NOT USE HOU2ED.
        </Text>

        <Text style={styles.heading}>
          Digital Signature & Truthfulness Certification
        </Text>

        <Text style={styles.subheading}>Electronic Signature Agreement</Text>
        <Text style={styles.paragraph}>
          By typing your name, drawing your signature, or clicking "Sign," you
          understand that your electronic signature:
          {"\n"}• Has the same legal effect as a handwritten signature
          {"\n"}• Creates a binding agreement
          {"\n"}• Verifies that all information submitted is truthful
          {"\n"}• Is enforceable under the E-SIGN Act and the California UETA
        </Text>

        <Text style={styles.subheading}>Truthfulness Certification</Text>
        <Text style={styles.paragraph}>
          By submitting any form or document on HOU2ED, you certify that:
          {"\n"}• All information you provide is true and accurate
          {"\n"}• You have not falsified or manipulated any document
          {"\n"}• All documents uploaded belong to you or the person you legally
          represent
          {"\n"}• You understand that false information may result in:
          {"\n"} - Application denial
          {"\n"} - Removal from the platform
          {"\n"} - Loss of housing or services obtained
          {"\n"} - Legal consequences
        </Text>

        <Text style={styles.subheading}>User Responsibilities</Text>
        <Text style={styles.paragraph}>
          You agree that:
          {"\n"}• Your electronic signature represents your identity
          {"\n"}• You will not impersonate anyone
          {"\n"}• You will maintain account security
          {"\n"}• You are responsible for all documents submitted through your
          account
        </Text>

        <Text style={styles.subheading}>Fraud Prevention</Text>
        <Text style={styles.paragraph}>
          HOU2ED may:
          {"\n"}• Request additional verification
          {"\n"}• Flag suspicious activity
          {"\n"}• Suspend or remove accounts
          {"\n"}• Notify providers or authorities if fraud is detected or
          required by law
        </Text>

        <Text style={styles.subheading}>Digital Record Storage</Text>
        <Text style={styles.paragraph}>
          Each signature generates a secure record including:
          {"\n"}• Timestamp
          {"\n"}• IP address
          {"\n"}• Device information
          {"\n"}• Document hash verification
        </Text>
        <Text style={styles.paragraph}>
          These may be shared with providers reviewing your application.
        </Text>

        <Text style={styles.heading}>Consent to Electronic Communications</Text>
        <Text style={styles.paragraph}>
          By using HOU2ED, you consent to receive electronic communications,
          including:
          {"\n"}• Application status updates
          {"\n"}• Messages from providers
          {"\n"}• System notifications
          {"\n"}• Important account information
        </Text>

        <Text style={styles.heading}>Housing Provider Obligations</Text>
        <Text style={styles.paragraph}>
          Housing providers agree to:
          {"\n"}• Provide accurate information about available beds
          {"\n"}• Update bed availability regularly
          {"\n"}• Respond to applications in a timely manner
          {"\n"}• Comply with fair housing laws
          {"\n"}• Maintain confidentiality of applicant information
        </Text>

        <Text style={styles.heading}>Housing Seeker Responsibilities</Text>
        <Text style={styles.paragraph}>
          Housing seekers agree to:
          {"\n"}• Provide truthful and accurate information
          {"\n"}• Upload valid documentation
          {"\n"}• Respond to provider communications promptly
          {"\n"}• Follow facility rules if accepted
        </Text>

        <Text style={styles.heading}>Account Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to terminate accounts that:
          {"\n"}• Violate these terms
          {"\n"}• Provide false information
          {"\n"}• Engage in fraudulent activity
          {"\n"}• Harass other users
        </Text>

        <Text style={styles.heading}>Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these terms at any time. Continued use of HOU2ED after
          changes constitutes acceptance of the modified terms.
        </Text>

        <Text style={styles.heading}>Contact Information</Text>
        <Text style={styles.paragraph}>
          For questions about these terms, contact us at: support@hou2ed.com
        </Text>

        <Text style={styles.footer}>
          By typing your electronic signature in the application, you
          acknowledge that you have read, understood, and agree to be bound by
          these Terms of Service.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
