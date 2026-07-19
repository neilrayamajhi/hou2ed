import { supabase } from "../lib/supabase";

export interface AdminListingSummary {
  id: string;
  title: string;
  city: string;
  housingType: string;
  isActive: boolean;
  verified: boolean;
  providerId: string;
  createdAt: string;
}

export interface AdminListingDetail extends AdminListingSummary {
  description: string | null;
  address: string | null;
  state: string | null;
  zipCode: string | null;
}

interface ListingRow {
  id: string;
  title: string;
  city: string;
  housing_type: string;
  is_active: boolean;
  verified: boolean | null;
  provider_id: string;
  created_at: string;
  description?: string | null;
  address?: string | null;
  state?: string | null;
  zip_code?: string | null;
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

function toListingSummary(row: ListingRow): AdminListingSummary {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    housingType: row.housing_type,
    isActive: row.is_active,
    verified: row.verified ?? false,
    providerId: row.provider_id,
    createdAt: row.created_at,
  };
}

const SUMMARY_COLUMNS =
  "id, title, city, housing_type, is_active, verified, provider_id, created_at";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, description, address, state, zip_code`;

export async function listAllListingsForAdmin(params: {
  status?: "active" | "inactive";
  search?: string;
} = {}): Promise<AdminListingSummary[]> {
  let query = supabase
    .from("listings")
    .select(SUMMARY_COLUMNS)
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("is_active", params.status === "active");
  }
  if (params.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  const rows = assertRows<ListingRow>("listings", await query);
  return rows.map(toListingSummary);
}

export async function getListingForAdmin(
  listingId: string,
): Promise<AdminListingDetail> {
  const result = await supabase
    .from("listings")
    .select(DETAIL_COLUMNS)
    .eq("id", listingId)
    .maybeSingle();

  const row = assertRow<ListingRow>("listing", result);

  return {
    ...toListingSummary(row),
    description: row.description ?? null,
    address: row.address ?? null,
    state: row.state ?? null,
    zipCode: row.zip_code ?? null,
  };
}

export async function setListingActive(
  listingId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("listings")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", listingId);

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
