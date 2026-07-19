import {
  blockUser,
  unblockUser,
  hasBlockedUser,
  isBlockedRelationship,
  getBlockedUsers,
  getUsersWhoBlockedMe,
  getAllBlockedRelationships,
} from "./blockingService";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const CURRENT_USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

function mockCurrentUser(id: string | null) {
  (supabase.auth.getUser as jest.Mock).mockResolvedValue({
    data: { user: id ? { id } : null },
  });
}

describe("hasBlockedUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns false when not authenticated", async () => {
    mockCurrentUser(null);

    const result = await hasBlockedUser(OTHER_USER_ID);

    expect(result).toBe(false);
  });

  test("returns true when a block row exists", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { id: "block-1" }, error: null }),
    });

    const result = await hasBlockedUser(OTHER_USER_ID);

    expect(result).toBe(true);
  });

  test("returns false when no block row exists (PGRST116)", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "no rows" },
      }),
    });

    const result = await hasBlockedUser(OTHER_USER_ID);

    expect(result).toBe(false);
  });

  test("throws instead of failing open when the DB call errors", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: "500", message: "connection refused" },
      }),
    });

    await expect(hasBlockedUser(OTHER_USER_ID)).rejects.toThrow(
      "Failed to check block status: connection refused",
    );
  });
});

describe("isBlockedRelationship", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns false when not authenticated", async () => {
    mockCurrentUser(null);

    const result = await isBlockedRelationship(OTHER_USER_ID);

    expect(result).toBe(false);
  });

  test("returns true when a block row exists in either direction", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const query: any = {
      select: jest.fn(() => query),
      or: jest.fn(() => query),
      then: (resolve: (v: { data: any; error: any }) => void) =>
        resolve({ data: [{ id: "block-1" }], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await isBlockedRelationship(OTHER_USER_ID);

    expect(result).toBe(true);
  });

  test("returns false when no block row exists in either direction", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const query: any = {
      select: jest.fn(() => query),
      or: jest.fn(() => query),
      then: (resolve: (v: { data: any; error: any }) => void) =>
        resolve({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await isBlockedRelationship(OTHER_USER_ID);

    expect(result).toBe(false);
  });

  test("throws instead of failing open when the DB call errors", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const query: any = {
      select: jest.fn(() => query),
      or: jest.fn(() => query),
      then: (resolve: (v: { data: any; error: any }) => void) =>
        resolve({
          data: null,
          error: { message: "connection refused" },
        }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);

    await expect(isBlockedRelationship(OTHER_USER_ID)).rejects.toThrow(
      "Failed to check blocking relationship: connection refused",
    );
  });
});

describe("blockUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("rejects blocking yourself", async () => {
    mockCurrentUser(CURRENT_USER_ID);

    const result = await blockUser(CURRENT_USER_ID);

    expect(result).toEqual({ success: false, error: "Cannot block yourself" });
  });

  test("returns success and inserts a block row for another user", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const insertSelect = jest
      .fn()
      .mockResolvedValue({ data: [{ id: "block-1" }], error: null });
    const listingsQuery: any = {
      select: jest.fn(() => listingsQuery),
      eq: jest.fn(() => listingsQuery),
      then: (resolve: (v: { data: any; error: any }) => void) =>
        resolve({ data: [], error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "blocks") {
        return { insert: jest.fn(() => ({ select: insertSelect })) };
      }
      return listingsQuery;
    });

    const result = await blockUser(OTHER_USER_ID);

    expect(result).toEqual({ success: true });
  });
});

describe("unblockUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success after deleting the block row", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const query: any = {
      delete: jest.fn(() => query),
      eq: jest.fn(() => query),
      then: (resolve: (v: { error: any }) => void) => resolve({ error: null }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await unblockUser(OTHER_USER_ID);

    expect(result).toEqual({ success: true });
  });

  test("returns the DB error message on failure", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const query: any = {
      delete: jest.fn(() => query),
      eq: jest.fn(() => query),
      then: (resolve: (v: { error: any }) => void) =>
        resolve({ error: { message: "row not found" } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(query);

    const result = await unblockUser(OTHER_USER_ID);

    expect(result).toEqual({ success: false, error: "row not found" });
  });
});

describe("getBlockedUsers / getUsersWhoBlockedMe / getAllBlockedRelationships", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getAllBlockedRelationships merges and deduplicates both directions", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    const thirdUserId = "33333333-3333-3333-3333-333333333333";
    (supabase.from as jest.Mock).mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((column: string) => {
        const data =
          column === "blocker_id"
            ? [{ blocked_id: OTHER_USER_ID }]
            : [{ blocker_id: OTHER_USER_ID }, { blocker_id: thirdUserId }];
        return Promise.resolve({ data, error: null });
      }),
    }));

    const result = await getAllBlockedRelationships();

    expect(result.sort()).toEqual([OTHER_USER_ID, thirdUserId].sort());
  });

  test("getBlockedUsers returns an empty array on a DB error (aggregate helper fails open)", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    const result = await getBlockedUsers();

    expect(result).toEqual([]);
  });

  test("getUsersWhoBlockedMe returns an empty array on a DB error (aggregate helper fails open)", async () => {
    mockCurrentUser(CURRENT_USER_ID);
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    const result = await getUsersWhoBlockedMe();

    expect(result).toEqual([]);
  });
});
