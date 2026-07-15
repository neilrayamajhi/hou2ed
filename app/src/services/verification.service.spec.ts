import {
  listPendingVerifications,
  getVerificationDetail,
  setVerificationStatus,
} from "./verification.service";
import { supabase } from "../lib/supabase";

jest.mock("../lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function makeQuery(result: {
  data?: any;
  error: { message: string } | null;
}) {
  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    update: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return query;
}

const PROFILE_ROW = {
  id: "u1",
  full_name: "Priya Provider",
  email: "priya@example.com",
  verification_status: "pending",
  verification_documents: { license: "https://example.com/doc.pdf" },
};

describe("listPendingVerifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("maps pending profiles into summaries", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [PROFILE_ROW], error: null }),
    );

    const result = await listPendingVerifications();

    expect(result).toEqual([
      {
        id: "u1",
        fullName: "Priya Provider",
        email: "priya@example.com",
        verificationStatus: "pending",
      },
    ]);
  });

  test("returns an empty list when nothing is pending", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: [], error: null }),
    );

    const result = await listPendingVerifications();

    expect(result).toEqual([]);
  });

  test("throws a descriptive error when the query fails", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: { message: "connection refused" } }),
    );

    await expect(listPendingVerifications()).rejects.toThrow(
      "Failed to load verifications: connection refused",
    );
  });
});

describe("getVerificationDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns full detail including documents", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: PROFILE_ROW, error: null }),
    );

    const result = await getVerificationDetail("u1");

    expect(result).toEqual({
      id: "u1",
      fullName: "Priya Provider",
      email: "priya@example.com",
      verificationStatus: "pending",
      verificationDocuments: { license: "https://example.com/doc.pdf" },
    });
  });

  test("throws when the user does not exist", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ data: null, error: null }),
    );

    await expect(getVerificationDetail("missing")).rejects.toThrow(
      "user not found",
    );
  });
});

describe("setVerificationStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns success on a clean update", async () => {
    (supabase.from as jest.Mock).mockReturnValue(makeQuery({ error: null }));

    const result = await setVerificationStatus("u1", "verified");

    expect(result).toEqual({ success: true });
  });

  test("returns the error message when the update is rejected", async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      makeQuery({ error: { message: "permission denied" } }),
    );

    const result = await setVerificationStatus("u1", "rejected");

    expect(result).toEqual({ success: false, error: "permission denied" });
  });
});
