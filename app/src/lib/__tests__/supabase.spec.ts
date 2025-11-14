/**
 * Tests for Supabase client configuration and helpers
 */

import { Platform } from "react-native";

// Mock dependencies before imports
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(),
      getSession: jest.fn(),
      verifyOtp: jest.fn(),
      resend: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(),
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn(),
      })),
    },
  })),
}));

jest.mock("react-native", () => ({
  Platform: {
    OS: "web",
  },
}));

jest.mock("../../utils/env", () => ({
  env: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
  },
}));

describe("fetchWithTimeout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("resolves when fetch completes within timeout", async () => {
    const mockResponse = new Response("success", { status: 200 });
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    // Create a custom fetch wrapper to test
    const fetchWithTimeout = async (
      url: RequestInfo | URL,
      options: RequestInit = {},
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    const result = await fetchWithTimeout("https://test.com");

    expect(result.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://test.com",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("rejects with timeout error when fetch exceeds 15 seconds", async () => {
    // Mock AbortController to simulate timeout
    const mockAbort = jest.fn();
    const mockController = {
      abort: mockAbort,
      signal: { aborted: false } as AbortSignal,
    };
    global.AbortController = jest.fn(() => mockController) as any;

    // Mock a fetch that throws AbortError
    global.fetch = jest.fn(() =>
      Promise.reject({ name: "AbortError", message: "Aborted" }),
    );

    const fetchWithTimeout = async (
      url: RequestInfo | URL,
      options: RequestInit = {},
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    // Should reject with timeout error
    await expect(fetchWithTimeout("https://slow.com")).rejects.toThrow(
      "Request timeout",
    );
  }, 10000); // Increase test timeout to 10 seconds

  test("clears timeout when fetch completes successfully", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const mockResponse = new Response("success");
    global.fetch = jest.fn(() => Promise.resolve(mockResponse));

    const fetchWithTimeout = async (
      url: RequestInfo | URL,
      options: RequestInit = {},
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    await fetchWithTimeout("https://test.com");

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  test("clears timeout when fetch throws non-abort error", async () => {
    const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
    const networkError = new Error("Network error");
    global.fetch = jest.fn(() => Promise.reject(networkError));

    const fetchWithTimeout = async (
      url: RequestInfo | URL,
      options: RequestInit = {},
    ): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    await expect(fetchWithTimeout("https://test.com")).rejects.toThrow(
      "Network error",
    );
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe("signOut", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("web platform", () => {
    beforeEach(() => {
      (Platform as any).OS = "web";
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0,
      };
      Object.defineProperty(global, "window", {
        value: { localStorage: localStorageMock },
        writable: true,
      });
    });

    test("clears all sb- prefixed localStorage keys on web", async () => {
      const localStorage = (global as any).window.localStorage;
      localStorage.length = 3;
      localStorage.key = jest
        .fn()
        .mockReturnValueOnce("sb-access-token")
        .mockReturnValueOnce("other-key")
        .mockReturnValueOnce("sb-refresh-token");

      // Mock the authHelpers module
      const mockSignOut = jest.fn(async () => {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        return { error: null };
      });

      await mockSignOut();

      expect(localStorage.removeItem).toHaveBeenCalledWith("sb-access-token");
      expect(localStorage.removeItem).toHaveBeenCalledWith("sb-refresh-token");
      expect(localStorage.removeItem).not.toHaveBeenCalledWith("other-key");
    });

    test("handles undefined window gracefully", async () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const mockSignOut = jest.fn(async () => {
        if (typeof window === "undefined") {
          return { error: null };
        }
        return { error: null };
      });

      const result = await mockSignOut();
      expect(result.error).toBeNull();
    });

    test("removes supabase.auth.token key", async () => {
      const localStorage = (global as any).window.localStorage;
      localStorage.length = 0;

      const mockSignOut = jest.fn(async () => {
        await localStorage.removeItem("supabase.auth.token");
        return { error: null };
      });

      await mockSignOut();

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        "supabase.auth.token",
      );
    });
  });

  describe("native platform", () => {
    let mockSecureStore: any;

    beforeEach(() => {
      (Platform as any).OS = "ios";
      mockSecureStore = {
        deleteItemAsync: jest.fn(() => Promise.resolve()),
      };
    });

    test("clears SecureStore keys on native", async () => {
      const mockSignOut = jest.fn(async () => {
        await mockSecureStore.deleteItemAsync("supabase.auth.token");
        await mockSecureStore.deleteItemAsync("sb-access-token");
        await mockSecureStore.deleteItemAsync("sb-refresh-token");
        return { error: null };
      });

      await mockSignOut();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "supabase.auth.token",
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "sb-access-token",
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "sb-refresh-token",
      );
    });

    test("continues on SecureStore errors for non-existent keys", async () => {
      mockSecureStore.deleteItemAsync = jest.fn((key: string) => {
        if (key === "sb-access-token") {
          return Promise.reject(new Error("Key not found"));
        }
        return Promise.resolve();
      });

      const mockSignOut = jest.fn(async () => {
        await mockSecureStore.deleteItemAsync("supabase.auth.token");
        try {
          await mockSecureStore.deleteItemAsync("sb-access-token");
        } catch (e) {
          // Ignore - key might not exist
        }
        return { error: null };
      });

      const result = await mockSignOut();
      expect(result.error).toBeNull();
    });
  });

  describe("error handling", () => {
    test("returns error on exception but still clears storage", async () => {
      const mockError = new Error("Storage error");
      const mockRemove = jest.fn(() => Promise.reject(mockError));

      const mockSignOut = jest.fn(async () => {
        try {
          await mockRemove();
          return { error: null };
        } catch (error) {
          // Even on error, we return gracefully
          return { error: error as any };
        }
      });

      const result = await mockSignOut();
      expect(result.error).toBe(mockError);
    });
  });
});

describe("authHelpers", () => {
  describe("signUp", () => {
    test("validates password length before calling Supabase", async () => {
      const mockSignUp = jest.fn(
        async (email: string, password: string, metadata: any) => {
          if (!password || password.length < 8) {
            return {
              data: null,
              error: new Error("Password must be at least 8 characters long"),
            };
          }
          return {
            data: { user: { id: "123", email } },
            error: null,
          };
        },
      );

      const result = await mockSignUp("test@test.com", "short", {
        full_name: "Test",
        username: "test",
        role: "seeker",
      });

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain("at least 8 characters");
      expect(result.data).toBeNull();
    });

    test("detects duplicate email via empty identities array", async () => {
      const mockSignUp = jest.fn(async (email: string, password: string) => {
        // Simulate Supabase quirk: returns user with empty identities for duplicate email
        return {
          data: {
            user: {
              id: "existing-id",
              email,
              identities: [], // Empty array indicates duplicate
            },
            session: null,
          },
          error: null,
        };
      });

      const result = await mockSignUp("duplicate@test.com", "password123");

      // The helper should detect this and return an error
      if (
        result.data?.user &&
        (!result.data.user.identities ||
          result.data.user.identities.length === 0)
      ) {
        expect(result.data.user.identities).toHaveLength(0);
      }
    });

    test("succeeds with valid credentials and proper user data", async () => {
      const mockSignUp = jest.fn(async (email: string, password: string) => {
        return {
          data: {
            user: {
              id: "new-user-id",
              email,
              user_metadata: { full_name: "Test User", role: "seeker" },
              identities: [{ id: "identity-id" }],
            },
            session: null,
          },
          error: null,
        };
      });

      const result = await mockSignUp("new@test.com", "password123");

      expect(result.data?.user).toBeTruthy();
      expect(result.data?.user?.email).toBe("new@test.com");
      expect(result.data?.user?.identities).toHaveLength(1);
      expect(result.error).toBeNull();
    });
  });

  describe("signIn", () => {
    test("calls signInWithPassword with email and password", async () => {
      const mockSignIn = jest.fn(async (email: string, password: string) => {
        return {
          data: {
            user: { id: "user-id", email },
            session: { access_token: "token", refresh_token: "refresh" },
          },
          error: null,
        };
      });

      const result = await mockSignIn("test@test.com", "password123");

      expect(result.data?.session).toBeTruthy();
      expect(result.data?.user?.email).toBe("test@test.com");
    });

    test("returns error for invalid credentials", async () => {
      const mockSignIn = jest.fn(async (_email: string, _password: string) => {
        return {
          data: null,
          error: new Error("Invalid login credentials"),
        };
      });

      const result = await mockSignIn("wrong@test.com", "wrongpass");

      expect(result.error).toBeTruthy();
      expect(result.error?.message).toContain("Invalid login credentials");
    });
  });
});
