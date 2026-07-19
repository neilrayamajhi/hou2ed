import { supabase } from "../lib/supabase";
import {
  bucketByWeek,
  countByKey,
  type WeeklyBucket,
  type KeyCount,
} from "../utils/analytics";

export interface AdminStats {
  totalSeekers: number;
  totalProviders: number;
  activeListings: number;
  newSignupsThisWeek: number;
  recentBlocks: number;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function assertCount(
  label: string,
  result: { count: number | null; error: { message: string } | null },
): number {
  if (result.error) {
    throw new Error(`Failed to count ${label}: ${result.error.message}`);
  }
  return result.count ?? 0;
}

export async function getAdminStats(): Promise<AdminStats> {
  const weekAgo = new Date(Date.now() - ONE_WEEK_MS).toISOString();
  const monthAgo = new Date(Date.now() - ONE_MONTH_MS).toISOString();

  const [
    seekersResult,
    providersResult,
    activeListingsResult,
    newSignupsResult,
    recentBlocksResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "seeker"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "provider"),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase
      .from("blocks")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthAgo),
  ]);

  return {
    totalSeekers: assertCount("seekers", seekersResult),
    totalProviders: assertCount("providers", providersResult),
    activeListings: assertCount("active listings", activeListingsResult),
    newSignupsThisWeek: assertCount("new signups", newSignupsResult),
    recentBlocks: assertCount("recent blocks", recentBlocksResult),
  };
}

export interface AdminAnalytics {
  signupsTrend: WeeklyBucket[];
  listingsTrend: WeeklyBucket[];
  roleSplit: KeyCount[];
  listingsByCity: KeyCount[];
  listingsByHousingType: KeyCount[];
  listingsByVerification: KeyCount[];
  applicationsByStatus: KeyCount[];
}

const TREND_WEEKS = 8;

function assertRows<T>(
  label: string,
  result: { data: T[] | null; error: { message: string } | null },
): T[] {
  if (result.error) {
    throw new Error(`Failed to load ${label}: ${result.error.message}`);
  }
  return result.data ?? [];
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const trendRangeStart = new Date(
    Date.now() - TREND_WEEKS * ONE_WEEK_MS,
  ).toISOString();

  const [signupsResult, rolesResult, listingsResult, applicationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", trendRangeStart),
      supabase.from("profiles").select("role"),
      supabase
        .from("listings")
        .select("created_at, city, housing_type, verified"),
      supabase.from("applications").select("status"),
    ]);

  const signups = assertRows<{ created_at: string }>("signups", signupsResult);
  const roles = assertRows<{ role: string }>("user roles", rolesResult);
  const listings = assertRows<{
    created_at: string;
    city: string;
    housing_type: string;
    verified: boolean | null;
  }>("listings", listingsResult);
  const applications = assertRows<{ status: string }>(
    "applications",
    applicationsResult,
  );

  return {
    signupsTrend: bucketByWeek(
      signups.map((row) => row.created_at),
      TREND_WEEKS,
    ),
    listingsTrend: bucketByWeek(
      listings.map((row) => row.created_at),
      TREND_WEEKS,
    ),
    roleSplit: countByKey(roles.map((row) => row.role)),
    listingsByCity: countByKey(listings.map((row) => row.city)).slice(0, 5),
    listingsByHousingType: countByKey(listings.map((row) => row.housing_type)),
    listingsByVerification: countByKey(
      listings.map((row) => (row.verified ? "Verified" : "Unverified")),
    ),
    applicationsByStatus: countByKey(applications.map((row) => row.status)),
  };
}
