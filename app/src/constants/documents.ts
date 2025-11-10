import { DocumentRequirement } from "../types/listing";

/**
 * Predefined document types that providers can choose from
 * These are common documents typically required for housing applications
 */
export const PREDEFINED_DOCUMENT_TYPES: DocumentRequirement[] = [
  {
    id: "government-id",
    label: "Government-Issued ID",
    description: "Driver's license, passport, or state ID card",
    required: true,
    category: "identification",
    isCustom: false,
  },
  {
    id: "proof-of-income",
    label: "Proof of Income",
    description: "Pay stubs, bank statements, or benefits letter",
    required: true,
    category: "financial",
    isCustom: false,
  },
  {
    id: "insurance-card",
    label: "Insurance Card",
    description: "Medical insurance or Medicaid card",
    required: false,
    category: "medical",
    isCustom: false,
  },
  {
    id: "referral-letter",
    label: "Referral Letter",
    description:
      "Letter from social worker, case manager, or healthcare provider",
    required: false,
    category: "reference",
    isCustom: false,
  },
  {
    id: "background-check",
    label: "Background Check Consent",
    description: "Signed consent form for background check",
    required: false,
    category: "legal",
    isCustom: false,
  },
  {
    id: "medical-records",
    label: "Medical Records",
    description: "Relevant medical documentation if applicable",
    required: false,
    category: "medical",
    isCustom: false,
  },
  {
    id: "proof-of-benefits",
    label: "Proof of Benefits",
    description: "Social Security, disability, or other benefits documentation",
    required: false,
    category: "financial",
    isCustom: false,
  },
  {
    id: "vaccination-record",
    label: "Vaccination Record",
    description: "Proof of required vaccinations",
    required: false,
    category: "medical",
    isCustom: false,
  },
  {
    id: "criminal-history",
    label: "Criminal History Disclosure",
    description: "Form disclosing any criminal history",
    required: false,
    category: "legal",
    isCustom: false,
  },
  {
    id: "emergency-contact",
    label: "Emergency Contact Form",
    description: "Completed emergency contact information form",
    required: false,
    category: "other",
    isCustom: false,
  },
];

/**
 * Get document category display name
 */
export function getDocumentCategoryLabel(
  category: DocumentRequirement["category"],
): string {
  const labels: Record<NonNullable<DocumentRequirement["category"]>, string> = {
    identification: "Identification",
    financial: "Financial",
    medical: "Medical",
    reference: "References",
    legal: "Legal",
    other: "Other",
  };
  return category ? labels[category] : "Other";
}

/**
 * Helper to check if documents_required is in new format
 */
export function isNewDocumentFormat(
  documents: string[] | DocumentRequirement[] | undefined,
): documents is DocumentRequirement[] {
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return false;
  }
  // Check if first item has the structure of DocumentRequirement
  const firstItem = documents[0];
  return (
    typeof firstItem === "object" && "id" in firstItem && "label" in firstItem
  );
}

/**
 * Convert legacy string array to new DocumentRequirement format
 */
export function convertLegacyDocuments(
  documents: string[],
): DocumentRequirement[] {
  return documents.map((doc) => {
    // Try to match with predefined types
    const predefined = PREDEFINED_DOCUMENT_TYPES.find(
      (pd) =>
        pd.id === doc || pd.label.toLowerCase().includes(doc.toLowerCase()),
    );

    if (predefined) {
      return { ...predefined, required: true };
    }

    // Create custom requirement for unmatched documents
    return {
      id: `custom-${doc.toLowerCase().replace(/\s+/g, "-")}`,
      label: doc,
      required: true,
      category: "other" as const,
      isCustom: true,
    };
  });
}
