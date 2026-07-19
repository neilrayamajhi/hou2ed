import { supabase } from "../lib/supabase";

export type UserRole = "seeker" | "provider" | "admin";

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: UserRole;
  isBanned: boolean;
  createdAt: string;
}

export interface UserDetail extends UserSummary {
  phone: string | null;
  avatarUrl: string | null;
  bannedAt: string | null;
  bannedReason: string | null;
  listingsCount: number;
  applicationsCount: number;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: UserRole;
  is_banned: boolean;
  created_at: string;
  phone: string | null;
  avatar_url: string | null;
  banned_at: string | null;
  banned_reason: string | null;
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

function assertCount(
  label: string,
  result: { count: number | null; error: { message: string } | null },
): number {
  if (result.error) {
    throw new Error(`Failed to count ${label}: ${result.error.message}`);
  }
  return result.count ?? 0;
}

function toUserSummary(row: ProfileRow): UserSummary {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    isBanned: row.is_banned,
    createdAt: row.created_at,
  };
}

const PROFILE_COLUMNS =
  "id, email, full_name, username, role, is_banned, created_at, phone, avatar_url, banned_at, banned_reason";

export async function listUsers(params: {
  role?: UserRole;
  search?: string;
} = {}): Promise<UserSummary[]> {
  let query = supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .order("created_at", { ascending: false });

  if (params.role) {
    query = query.eq("role", params.role);
  }
  if (params.search) {
    const term = `%${params.search}%`;
    query = query.or(
      `full_name.ilike.${term},username.ilike.${term},email.ilike.${term}`,
    );
  }

  const rows = assertRows<ProfileRow>("users", await query);
  return rows.map(toUserSummary);
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  const [profileResult, listingsResult, applicationsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("provider_id", userId),
      supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("seeker_id", userId),
    ]);

  const profile = assertRow<ProfileRow>("user", profileResult);

  return {
    ...toUserSummary(profile),
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    bannedAt: profile.banned_at,
    bannedReason: profile.banned_reason,
    listingsCount: assertCount("listings", listingsResult),
    applicationsCount: assertCount("applications", applicationsResult),
  };
}

export async function setUserRole(
  userId: string,
  role: UserRole,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
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

async function invokeAdminUserAction(body: {
  action: "ban" | "unban" | "delete";
  targetUserId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "admin-user-action",
      { body },
    );

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data?.success) {
      return { success: false, error: data?.error ?? "Action failed" };
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function banUser(
  userId: string,
  reason: string,
): Promise<{ success: boolean; error?: string }> {
  return invokeAdminUserAction({ action: "ban", targetUserId: userId, reason });
}

export async function unbanUser(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  return invokeAdminUserAction({ action: "unban", targetUserId: userId });
}

export async function deleteUserAccount(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  return invokeAdminUserAction({ action: "delete", targetUserId: userId });
}
