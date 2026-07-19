import fc from "fast-check";
import { bucketByWeek, countByKey } from "./analytics";

describe("bucketByWeek", () => {
  const now = new Date("2026-06-06T00:00:00.000Z");

  test("places each timestamp into the correct weekly bucket", () => {
    // now = 2026-06-06; 4-week range starts 2026-05-09. Each bucket spans
    // 7 days: [05-09,05-16) [05-16,05-23) [05-23,05-30) [05-30,06-06)
    const timestamps = [
      "2026-06-02T12:00:00.000Z", // mid bucket 3 (most recent)
      "2026-06-03T18:00:00.000Z", // mid bucket 3
      "2026-05-26T00:00:00.000Z", // mid bucket 2
      "2026-05-12T00:00:00.000Z", // mid bucket 0 (oldest)
    ];

    const buckets = bucketByWeek(timestamps, 4, now);

    expect(buckets.map((b) => b.count)).toEqual([1, 0, 1, 2]);
  });

  test("ignores malformed or missing timestamps instead of crashing", () => {
    const buckets = bucketByWeek(["not-a-date", "", undefined as any], 4, now);

    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  test("ignores timestamps outside the requested range", () => {
    const tooOld = "2026-01-01T00:00:00.000Z";
    const tooNew = "2026-06-10T00:00:00.000Z";

    const buckets = bucketByWeek([tooOld, tooNew], 4, now);

    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  test("returns exactly weekCount buckets in chronological order", () => {
    const buckets = bucketByWeek([], 6, now);

    expect(buckets).toHaveLength(6);
    for (let i = 1; i < buckets.length; i++) {
      expect(new Date(buckets[i].weekStart).getTime()).toBeGreaterThan(
        new Date(buckets[i - 1].weekStart).getTime(),
      );
    }
  });

  test("property: every in-range timestamp is counted exactly once across all buckets", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 4 * 7 * 24 * 60 * 60 * 1000 - 1 })),
        (offsetsMs) => {
          const rangeStart = now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000;
          const timestamps = offsetsMs.map((offset) =>
            new Date(rangeStart + offset).toISOString(),
          );

          const buckets = bucketByWeek(timestamps, 4, now);
          const total = buckets.reduce((sum, b) => sum + b.count, 0);

          return total === timestamps.length;
        },
      ),
    );
  });
});

describe("countByKey", () => {
  test("counts occurrences and sorts highest first", () => {
    const result = countByKey([
      "Boston",
      "Boston",
      "Worcester",
      "Boston",
      "Salem",
    ]);

    expect(result).toEqual([
      { key: "Boston", count: 3 },
      { key: "Worcester", count: 1 },
      { key: "Salem", count: 1 },
    ]);
  });

  test("groups null, undefined, and blank values under the fallback label", () => {
    const result = countByKey(
      ["Boston", null, undefined, "", "   "],
      "Unknown",
    );

    expect(result).toEqual([
      { key: "Unknown", count: 4 },
      { key: "Boston", count: 1 },
    ]);
  });

  test("property: total counted entries always equals the input length", () => {
    fc.assert(
      fc.property(fc.array(fc.option(fc.string(), { nil: null })), (values) => {
        const result = countByKey(values);
        const total = result.reduce((sum, entry) => sum + entry.count, 0);
        return total === values.length;
      }),
    );
  });
});
