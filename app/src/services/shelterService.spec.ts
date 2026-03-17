/**
 * Tests for shelterService retry and timeout logic
 */
import { fetchRealShelters } from "./shelterService";

// Mock global fetch
global.fetch = jest.fn();

describe("shelterService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("fetchRealShelters", () => {
    it("should successfully fetch OSM data on first attempt", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ elements: [] }),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await fetchRealShelters(34.0522, -118.2437, 10);

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledTimes(1);
    });

    it("should retry on 5xx server errors", async () => {
      const mock504Response = {
        ok: false,
        status: 504,
        json: jest.fn(),
      };

      const mockSuccessResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ elements: [] }),
      };

      // First call fails with 504, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mock504Response)
        .mockResolvedValueOnce(mockSuccessResponse);

      // Use fake timers to avoid actual delays
      jest.useFakeTimers();

      const fetchPromise = fetchRealShelters(34.0522, -118.2437, 10);

      // Fast-forward through the retry delay
      await jest.runAllTimersAsync();

      const result = await fetchPromise;

      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(mockSuccessResponse.json).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it("should return empty array after all retries fail", async () => {
      const mock504Response = {
        ok: false,
        status: 504,
        json: jest.fn(),
      };

      // All attempts fail with 504
      (global.fetch as jest.Mock).mockResolvedValue(mock504Response);

      jest.useFakeTimers();

      const fetchPromise = fetchRealShelters(34.0522, -118.2437, 10);

      // Fast-forward through all retry delays
      await jest.runAllTimersAsync();

      const result = await fetchPromise;

      // Should return empty array on error (as per current implementation)
      expect(result).toEqual([]);
      // Should have tried 3 times (1 initial + 2 retries)
      expect(global.fetch).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it("should not retry on 4xx client errors", async () => {
      const mock400Response = {
        ok: false,
        status: 400,
        json: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValue(mock400Response);

      const result = await fetchRealShelters(34.0522, -118.2437, 10);

      // Should return empty array on error
      expect(result).toEqual([]);
      // Should only try once (no retries for 4xx errors)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
