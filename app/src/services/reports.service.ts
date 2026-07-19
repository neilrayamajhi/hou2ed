import { supabase } from "../lib/supabase";
import { banUser } from "./userModeration.service";

export type ReportStatus = "open" | "reviewed" | "actioned";

export interface ReportSummary {
  id: string;
  reporterName: string;
  reportedUserName: string;
  reportedUserId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
}

export interface ReportDetail extends ReportSummary {
  reporterId: string;
  threadId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  thread_id: string | null;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reporter: { full_name: string; email: string } | null;
  reported: { full_name: string; email: string } | null;
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

function toReportSummary(row: ReportRow): ReportSummary {
  return {
    id: row.id,
    reporterName: row.reporter?.full_name || row.reporter?.email || "Unknown",
    reportedUserName: row.reported?.full_name || row.reported?.email || "Unknown",
    reportedUserId: row.reported_user_id,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
}

const REPORT_COLUMNS = `
  id, reporter_id, reported_user_id, thread_id, reason, status, created_at, reviewed_by, reviewed_at,
  reporter:profiles!reports_reporter_id_fkey(full_name, email),
  reported:profiles!reports_reported_user_id_fkey(full_name, email)
`;

export async function submitReport(params: {
  reportedUserId: string;
  threadId?: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }
    if (user.id === params.reportedUserId) {
      return { success: false, error: "Cannot report yourself" };
    }

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: params.reportedUserId,
      thread_id: params.threadId ?? null,
      reason: params.reason,
    });

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

export async function listOpenReports(): Promise<ReportSummary[]> {
  const result = await supabase
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const rows = assertRows<ReportRow>("reports", result);
  return rows.map(toReportSummary);
}

export async function getReportDetail(reportId: string): Promise<ReportDetail> {
  const result = await supabase
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("id", reportId)
    .maybeSingle();

  const row = assertRow<ReportRow>("report", result);

  return {
    ...toReportSummary(row),
    reporterId: row.reporter_id,
    threadId: row.thread_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

async function updateReport(
  reportId: string,
  updates: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("reports")
      .update({
        ...updates,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", reportId);

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

export async function markReportReviewed(
  reportId: string,
): Promise<{ success: boolean; error?: string }> {
  return updateReport(reportId, { status: "reviewed" });
}

export interface RecentBlockSummary {
  id: string;
  blockerName: string;
  blockedName: string;
  createdAt: string;
}

interface BlockRow {
  id: string;
  created_at: string;
  blocker: { full_name: string; email: string } | null;
  blocked: { full_name: string; email: string } | null;
}

export async function listRecentBlocksForAdmin(): Promise<RecentBlockSummary[]> {
  const result = await supabase
    .from("blocks")
    .select(
      `id, created_at,
      blocker:profiles!blocks_blocker_id_fkey(full_name, email),
      blocked:profiles!blocks_blocked_id_fkey(full_name, email)`,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = assertRows<BlockRow>("blocks", result);
  return rows.map((row) => ({
    id: row.id,
    blockerName: row.blocker?.full_name || row.blocker?.email || "Unknown",
    blockedName: row.blocked?.full_name || row.blocked?.email || "Unknown",
    createdAt: row.created_at,
  }));
}

export async function actionReport(
  reportId: string,
  action: "warn" | "ban",
): Promise<{ success: boolean; error?: string }> {
  if (action === "ban") {
    const report = await getReportDetail(reportId);
    const banResult = await banUser(
      report.reportedUserId,
      `Reported: ${report.reason}`,
    );
    if (!banResult.success) {
      return banResult;
    }
  }

  // "warn" has no side effect today — there's no notification system to
  // actually message the reported user. It just records that the report
  // was triaged and a decision was made not to escalate to a ban.
  return updateReport(reportId, { status: "actioned" });
}
