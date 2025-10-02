import { z } from "zod";
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from "../constants/application";

// Step 1: Contact Information Schema
export const contactInfoSchema = z.object({
  fullName: z
    .string()
    .min(2, VALIDATION_MESSAGES.NAME.MIN)
    .max(100, VALIDATION_MESSAGES.NAME.MAX),
  phone: z
    .string()
    .regex(VALIDATION_PATTERNS.PHONE, VALIDATION_MESSAGES.PHONE.INVALID),
  email: z
    .string()
    .email(VALIDATION_MESSAGES.EMAIL.INVALID),
});

// Step 2: Eligibility Schema
export const eligibilitySchema = z.object({
  eligibilityTags: z.array(z.string()).min(0),
});

// Step 3: Documents Schema
export const documentsSchema = z.object({
  documents: z.array(
    z.object({
      type: z.string(),
      uri: z.string(),
      name: z.string(),
      size: z.number(),
    })
  ).min(1, "At least one document is required"),
});

// Step 4: Review & Submit Schema
export const reviewSchema = z.object({
  signature: z.string().min(2, "Please provide your signature"),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
});

// Complete Application Schema
export const applicationSchema = contactInfoSchema
  .merge(eligibilitySchema)
  .merge(documentsSchema)
  .merge(reviewSchema)
  .extend({
    listingId: z.string().optional(),
  });

// Type exports
export type ContactInfo = z.infer<typeof contactInfoSchema>;
export type Eligibility = z.infer<typeof eligibilitySchema>;
export type Documents = z.infer<typeof documentsSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ApplicationData = z.infer<typeof applicationSchema>;