import {
  submitReport,
  listOpenReports,
  getReportDetail,
  markReportReviewed,
  actionReport,
  listRecentBlocksForAdmin,
} from "./reports.service";
import { supabase } from "../lib/supabase";
import { banUser } from "./userModeration.service";

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn() },
  },
}));

jest.mock("./userModeration.service", () => ({
  banUser: jest.fn(),
}));

function makeQuery(result: {
  data?: any;
  error: { message: string } | null;
}) {
  const query: any = {
    select: jest.fn(() => query),
    insert: jest.fn(() => Promise.resolve(result)),
    update: jest.fn(() => query),
    eq: jest.fn(() => query),
    order: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return query;
}

const REPORT_ROW = {
  id: "r1",
  reporter_id: "u1",
  reported_user_id: "u2",
  thread_id: "t1",
  reason: "Harassing messages",
  status: "open",
  created_at: "2026-01-01T00:00:00.000Z",
  reviewed_by: null,
  reviewed_at: null,
  reporter: { full_name: "Ada Lovelace", email: "ada@example.com" },
  reported: { full_name: "Bad Actor", email: "bad@example.com" },
};

describe("submitReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("inserts a report tied to the current user", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await submitReport({
      reportedUserId: "u2",
      threadId: "t1",
      reason: "Harassing messages",
    });

    expect(result).toEqual({ success: true });
  });

  test("rejects reporting yourself before touching the database", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "u1" } },
    });

    const result = await submitReport({ reportedUserId: "u1", reason: "test" });

    expect(result).toEqual({ success: false, error: "Cannot report yourself" });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test("requires authentication", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    const result = await submitReport({ reportedUserId: "u2", reason: "test" });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  test("surfaces the database error message", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "u1" } },
    });
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ error: { message: "connection refused" } }),
    );

    const result = await submitReport({ reportedUserId: "u2", reason: "test" });

    expect(result).toEqual({ success: false, error: "connection refused" });
  });
});

describe("listOpenReports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps report rows into summaries", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [REPORT_ROW], error: null }),
    );

    const result = await listOpenReports();

    expect(result).toEqual([
      {
        id: "r1",
        reporterName: "Ada Lovelace",
        reportedUserName: "Bad Actor",
        reportedUserId: "u2",
        reason: "Harassing messages",
        status: "open",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  test("falls back to email when full_name is missing", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({
        data: [
          {
            ...REPORT_ROW,
            reporter: { full_name: "", email: "ada@example.com" },
          },
        ],
        error: null,
      }),
    );

    const result = await listOpenReports();

    expect(result[0].reporterName).toBe("ada@example.com");
  });

  test("throws a descriptive error when the query fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: { message: "connection refused" } }),
    );

    await expect(listOpenReports()).rejects.toThrow(
      "Failed to load reports: connection refused",
    );
  });
});

describe("getReportDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns full report detail", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: REPORT_ROW, error: null }),
    );

    const result = await getReportDetail("r1");

    expect(result).toEqual({
      id: "r1",
      reporterName: "Ada Lovelace",
      reportedUserName: "Bad Actor",
      reportedUserId: "u2",
      reason: "Harassing messages",
      status: "open",
      createdAt: "2026-01-01T00:00:00.000Z",
      reporterId: "u1",
      threadId: "t1",
      reviewedBy: null,
      reviewedAt: null,
    });
  });

  test("throws when the report does not exist", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: null }),
    );

    await expect(getReportDetail("missing")).rejects.toThrow("report not found");
  });
});

describe("markReportReviewed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("updates status to reviewed", async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "admin1" } },
    });
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await markReportReviewed("r1");

    expect(result).toEqual({ success: true });
  });
});

describe("listRecentBlocksForAdmin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps block rows into summaries", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({
        data: [
          {
            id: "b1",
            created_at: "2026-01-02T00:00:00.000Z",
            blocker: { full_name: "Ada Lovelace", email: "ada@example.com" },
            blocked: { full_name: "Bad Actor", email: "bad@example.com" },
          },
        ],
        error: null,
      }),
    );

    const result = await listRecentBlocksForAdmin();

    expect(result).toEqual([
      {
        id: "b1",
        blockerName: "Ada Lovelace",
        blockedName: "Bad Actor",
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });

  test("throws a descriptive error when the query fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: { message: "connection refused" } }),
    );

    await expect(listRecentBlocksForAdmin()).rejects.toThrow(
      "Failed to load blocks: connection refused",
    );
  });
});

describe("actionReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "admin1" } },
    });
  });

  test("warn marks the report actioned without banning anyone", async () => {
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await actionReport("r1", "warn");

    expect(banUser).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  test("ban bans the reported user then marks the report actioned", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: REPORT_ROW, error: null }),
    );
    (banUser as jest.Mock).mockResolvedValue({ success: true });

    const result = await actionReport("r1", "ban");

    expect(banUser).toHaveBeenCalledWith("u2", "Reported: Harassing messages");
    expect(result).toEqual({ success: true });
  });

  test("stops and surfaces the error if the ban itself fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: REPORT_ROW, error: null }),
    );
    (banUser as jest.Mock).mockResolvedValue({
      success: false,
      error: "Admin access required",
    });

    const result = await actionReport("r1", "ban");

    expect(result).toEqual({ success: false, error: "Admin access required" });
  });
});
