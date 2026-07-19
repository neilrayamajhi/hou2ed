import {
  listUsers,
  getUserDetail,
  setUserRole,
  banUser,
  unbanUser,
  deleteUserAccount,
} from "./userModeration.service";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    functions: { invoke: jest.fn() },
  },
}));

// Builds a chainable query mock that resolves to the given result regardless
// of which filter methods are chained on it, mirroring how the real
// supabase-js query builder resolves when awaited.
function makeQuery(result: {
  data?: any;
  count?: number | null;
  error: { message: string } | null;
}) {
  const query: any = {
    select: jest.fn(() => query),
    order: jest.fn(() => query),
    eq: jest.fn(() => query),
    or: jest.fn(() => query),
    update: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return query;
}

describe("listUsers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps profile rows into user summaries", async () => {
    const row = {
      id: "u1",
      email: "a@example.com",
      full_name: "Ada Lovelace",
      username: "ada",
      role: "seeker",
      is_banned: false,
      created_at: "2026-01-01T00:00:00.000Z",
    };
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [row], error: null }),
    );

    const result = await listUsers();

    expect(result).toEqual([
      {
        id: "u1",
        email: "a@example.com",
        fullName: "Ada Lovelace",
        username: "ada",
        role: "seeker",
        isBanned: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  test("throws a descriptive error when the query fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: { message: "connection refused" } }),
    );

    await expect(listUsers()).rejects.toThrow(
      "Failed to load users: connection refused",
    );
  });
});

describe("getUserDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("combines profile with listing/application counts", async () => {
    const profileRow = {
      id: "u1",
      email: "a@example.com",
      full_name: "Ada Lovelace",
      username: "ada",
      role: "provider",
      is_banned: true,
      created_at: "2026-01-01T00:00:00.000Z",
      phone: "555-0100",
      avatar_url: null,
      banned_at: "2026-02-01T00:00:00.000Z",
      banned_reason: "spam",
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "profiles") {
        return makeQuery({ data: profileRow, error: null });
      }
      if (table === "listings") {
        return makeQuery({ count: 4, error: null });
      }
      return makeQuery({ count: 2, error: null });
    });

    const result = await getUserDetail("u1");

    expect(result).toEqual({
      id: "u1",
      email: "a@example.com",
      fullName: "Ada Lovelace",
      username: "ada",
      role: "provider",
      isBanned: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      phone: "555-0100",
      avatarUrl: null,
      bannedAt: "2026-02-01T00:00:00.000Z",
      bannedReason: "spam",
      listingsCount: 4,
      applicationsCount: 2,
    });
  });

  test("throws when the user does not exist", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === "profiles"
        ? makeQuery({ data: null, error: null })
        : makeQuery({ count: 0, error: null }),
    );

    await expect(getUserDetail("missing")).rejects.toThrow("user not found");
  });
});

describe("setUserRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success on a clean update", async () => {
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await setUserRole("u1", "provider");

    expect(result).toEqual({ success: true });
  });

  test("returns the error message when the update is rejected", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ error: { message: "Only an admin can change a user role" } }),
    );

    const result = await setUserRole("u1", "admin");

    expect(result).toEqual({
      success: false,
      error: "Only an admin can change a user role",
    });
  });
});

describe.each([
  ["banUser", () => banUser("u1", "spam"), { action: "ban", targetUserId: "u1", reason: "spam" }],
  ["unbanUser", () => unbanUser("u1"), { action: "unban", targetUserId: "u1" }],
  ["deleteUserAccount", () => deleteUserAccount("u1"), { action: "delete", targetUserId: "u1" }],
])("%s", (_name, call, expectedBody) => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("invokes admin-user-action with the right body and reports success", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const result = await call();

    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "admin-user-action",
      { body: expectedBody },
    );
    expect(result).toEqual({ success: true });
  });

  test("surfaces a transport-level error", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: "network error" },
    });

    const result = await call();

    expect(result).toEqual({ success: false, error: "network error" });
  });

  test("surfaces an application-level failure returned by the function", async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { success: false, error: "Admin access required" },
      error: null,
    });

    const result = await call();

    expect(result).toEqual({ success: false, error: "Admin access required" });
  });
});
