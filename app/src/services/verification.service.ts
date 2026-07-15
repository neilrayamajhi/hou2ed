import { supabase } from "../lib/supabase";

export type VerificationStatus = "unsubmitted" | "pending" | "verified" | "rejected";

export interface VerificationSummary {
  id: string;
  fullName: string;
  email: string;
  verificationStatus: VerificationStatus | null;
}

export interface VerificationDetail extends VerificationSummary {
  verificationDocuments: unknown;
}

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  verification_status: VerificationStatus | null;
  verification_documents: unknown;
}

function assertRows<T>(
  label: string,
  result: { data: T[] | null; error: { message: string } | null },
): T[] {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }
  return result.data ?? [];
}

function assertRow<T>(
  label: string,
  result: { data: T | null; error: { message: string } | null },
): T {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }
  if (!result.data) {
    throw new Error(`${label} not found`);
  }
  return result.data;
}

function toSummary(row: ProfileRow): VerificationSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    verificationStatus: row.verification_status,
  };
}

export async function listPendingVerifications(): Promise<VerificationSummary[]> {
  const result = await supabase
    .from("profiles")
    .select("id, full_name, email, verification_status")
    .eq("verification_status", "pending");

  const rows = assertRows<ProfileRow>("verifications", result);
  return rows.map(toSummary);
}

export async function getVerificationDetail(
  userId: string,
): Promise<VerificationDetail> {
  const result = await supabase
    .from("profiles")
    .select("id, full_name, email, verification_status, verification_documents")
    .eq("id", userId)
    .maybeSingle();

  const row = assertRow<ProfileRow>("user", result);

  return {
    ...toSummary(row),
    verificationDocuments: row.verification_documents,
  };
}

export async function setVerificationStatus(
  userId: string,
  status: "verified" | "rejected",
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: status })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
