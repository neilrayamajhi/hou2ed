// Application wizard constants
export const DRAFT_STORAGE_KEY = "application_draft";
export const TOTAL_STEPS = 4;

// Step names for display
export const APPLICATION_STEPS = {
  1: {
    title: "Contact Information",
    shortTitle: "Info",
  },
  2: {
    title: "Eligibility",
    shortTitle: "Eligibility",
  },
  3: {
    title: "Documents",
    shortTitle: "Docs",
  },
  4: {
    title: "Review & Submit",
    shortTitle: "Review",
  },
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  // Supports international phone numbers with optional country code
  // Examples: +14155552671, 14155552671, 4155552671
  PHONE: /^\+?[1-9]\d{9,14}$/,

  // Standard email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Validation messages
export const VALIDATION_MESSAGES = {
  NAME: {
    MIN: "Name must be at least 2 characters",
    MAX: "Name is too long",
  },
  PHONE: {
    INVALID: "Please enter a valid phone number",
  },
  EMAIL: {
    INVALID: "Please enter a valid email address",
  },
} as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_TYPES: {
    IMAGES: ["image/jpeg", "image/png", "image/gif"],
    DOCUMENTS: ["application/pdf"],
  },
  ERROR_MESSAGES: {
    SIZE: "Please upload a file under 10 MB",
    TYPE: "Please upload a valid image or PDF",
  },
} as const;

// Document types required for application
export const DOCUMENT_TYPES = [
  { id: "id", label: "Government ID", required: true },
  { id: "insurance", label: "Insurance Card", required: false },
  { id: "income", label: "Income Proof", required: true },
  { id: "referral", label: "Referral Letter", required: false },
] as const;

// Tag group type for consistency
export interface TagOption {
  id: string;
  label: string;
}

// Main eligibility tags
export const ELIGIBILITY_TAGS: TagOption[] = [
  { id: "age18plus", label: "18+ years old" },
  { id: "families", label: "Families" },
  { id: "veterans", label: "Veterans" },
  { id: "lgbtq", label: "LGBTQ+" },
  { id: "dvSurvivors", label: "DV Survivors" },
  { id: "disabilities", label: "Disabilities" },
  { id: "mentalHealth", label: "Mental Health" },
  { id: "substanceRecovery", label: "In Recovery" },
];

// Age group tags
export const AGE_GROUPS: TagOption[] = [
  { id: "age18-25", label: "18-25 years" },
  { id: "age26-35", label: "26-35 years" },
  { id: "age36-50", label: "36-50 years" },
  { id: "age51-65", label: "51-65 years" },
  { id: "age65plus", label: "65+ years" },
];

// Special accommodation tags
export const SPECIAL_ACCOMMODATIONS: TagOption[] = [
  { id: "wheelchair", label: "Wheelchair Access" },
  { id: "serviceAnimal", label: "Service Animal" },
  { id: "medicalEquipment", label: "Medical Equipment" },
  { id: "dietaryNeeds", label: "Dietary Needs" },
];

// All tag groups organized for the eligibility step
export const ELIGIBILITY_TAG_GROUPS = [
  {
    id: "main",
    title: null, // No title for main group
    tags: ELIGIBILITY_TAGS,
  },
  {
    id: "age",
    title: "Age Group",
    tags: AGE_GROUPS,
  },
  {
    id: "accommodations",
    title: "Special Accommodations",
    tags: SPECIAL_ACCOMMODATIONS,
  },
] as const;