const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface WeeklyBucket {
  weekStart: string;
  label: string;
  count: number;
}

/**
 * Splits `timestamps` into `weekCount` consecutive 7-day buckets ending at
 * `now`, and counts how many timestamps fall in each. Timestamps outside the
 * [now - weekCount weeks, now) range are ignored.
 */
export function bucketByWeek(
  timestamps: string[],
  weekCount: number,
  now: Date = new Date(),
): WeeklyBucket[] {
  const rangeStart = now.getTime() - weekCount * WEEK_MS;

  const buckets: WeeklyBucket[] = Array.from({ length: weekCount }, (_, i) => {
    const start = new Date(rangeStart + i * WEEK_MS);
    return {
      weekStart: start.toISOString(),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count: 0,
    };
  });

  for (const timestamp of timestamps) {
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) continue;
    const offset = time - rangeStart;
    if (offset < 0 || offset >= weekCount * WEEK_MS) continue;
    buckets[Math.floor(offset / WEEK_MS)].count += 1;
  }

  return buckets;
}

export interface KeyCount {
  key: string;
  count: number;
}

/**
 * Counts how often each value appears, sorted highest-first. Empty/missing
 * values are grouped under `fallbackLabel` so they're visible rather than lost.
 */
export function countByKey(
  values: Array<string | null | undefined>,
  fallbackLabel = "Unknown",
): KeyCount[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value && value.trim() ? value : fallbackLabel;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts, ([key, count]) => ({ key, count })).sort(
    (a, b) => b.count - a.count,
  );
}
