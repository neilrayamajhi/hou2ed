import React from "react";
import { ScrollView, Text, StyleSheet, SafeAreaView } from "react-native";
import { colors, spacing } from "../../theme/tokens";

export default function TermsOfService() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ========================================
            PRIVACY POLICY
        ======================================== */}
        <Text style={styles.mainTitle}>HOU2ED PRIVACY POLICY</Text>

        <Text style={styles.updated}>Last Updated: November 12, 2025</Text>
        <Text style={styles.entity}>Entity: HOU2ED LLC</Text>

        <Text style={styles.sectionTitle}>PRIVACY POLICY</Text>
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
        <Text style={styles.paragraph}>
          We do not share information unless required.
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

        {/* ========================================
            DIGITAL SIGNATURE POLICY
        ======================================== */}
        <Text style={[styles.mainTitle, { marginTop: spacing.xl * 2 }]}>
          DIGITAL SIGNATURE & TRUTHFULNESS CERTIFICATION POLICY
        </Text>

        <Text style={styles.updated}>Last Updated: November 12, 2025</Text>
        <Text style={styles.entity}>Entity: HOU2ED LLC</Text>

        <Text style={styles.sectionTitle}>
          DIGITAL SIGNATURE & TRUTHFULNESS CERTIFICATION POLICY
        </Text>
        <Text style={styles.paragraph}>
          This policy governs electronic signatures and the truthfulness of
          submissions made on HOU2ED.
        </Text>

        <Text style={styles.heading}>Electronic Signature Agreement</Text>
        <Text style={styles.paragraph}>
          By typing your name, drawing your signature, or clicking "Sign," you
          understand that your electronic signature:
          {"\n"}• Has the same legal effect as a handwritten signature
          {"\n"}• Creates a binding agreement
          {"\n"}• Verifies that all information submitted is truthful
          {"\n"}• Is enforceable under the E-SIGN Act and the California UETA
        </Text>

        <Text style={styles.heading}>Truthfulness Certification</Text>
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

        <Text style={styles.heading}>User Responsibilities</Text>
        <Text style={styles.paragraph}>
          You agree that:
          {"\n"}• Your electronic signature represents your identity
          {"\n"}• You will not impersonate anyone
          {"\n"}• You will maintain account security
          {"\n"}• You are responsible for all documents submitted through your
          account
        </Text>

        <Text style={styles.heading}>Fraud Prevention</Text>
        <Text style={styles.paragraph}>
          HOU2ED may:
          {"\n"}• Request additional verification
          {"\n"}• Flag suspicious activity
          {"\n"}• Suspend or remove accounts
          {"\n"}• Notify providers or authorities if fraud is detected or
          required by law
        </Text>

        <Text style={styles.heading}>Digital Record Storage</Text>
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

        <Text style={styles.footer}>
          By typing your electronic signature in the application, you
          acknowledge that you have read, understood, and agree to be bound by
          this Privacy Policy and Digital Signature Policy.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.gold,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  updated: {
    fontSize: 13,
    color: colors.gray[400],
    marginBottom: spacing.xs,
    fontStyle: "italic",
    textAlign: "center",
  },
  entity: {
    fontSize: 13,
    color: colors.gray[400],
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  subheading: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.white,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.white,
    marginBottom: spacing.md,
  },
  important: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.gold,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  warning: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.white,
    backgroundColor: colors.red,
    padding: spacing.md,
    borderRadius: 8,
    fontWeight: "700",
    textAlign: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  footer: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.gray[400],
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.darkGray,
    borderRadius: 8,
    fontStyle: "italic",
    textAlign: "center",
  },
});
