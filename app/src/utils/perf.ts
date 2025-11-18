/**
 * Performance measurement utilities for HOU2ED app
 * Tracks search and map performance with P95 metrics
 */

import React from "react";

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

interface PerformanceStats {
  count: number;
  mean: number;
  median: number;
  p95: number;
  min: number;
  max: number;
  recentSamples: number[];
}

class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMeasurements: Map<string, PerformanceMetric> = new Map();
  private maxSamplesPerMetric = 100; // Keep last 100 samples for P95 calculation

  // Performance targets (in milliseconds)
  private readonly targets = {
    search: 1500, // Search should complete under 1.5s
    mapUpdate: 3000, // Map updates should complete under 3s
    listingLoad: 500, // Individual listing load under 500ms
    imageLoad: 1000, // Image loading under 1s
    navigation: 300, // Screen navigation under 300ms
  };

  /**
   * Start a performance measurement
   */
  start(name: string): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
    };

    this.activeMeasurements.set(name, metric);

    if (__DEV__) {
      console.log(`⏱️ [PERF] Started: ${name}`);
    }
  }

  /**
   * End a performance measurement
   */
  end(name: string): number | null {
    const activeMetric = this.activeMeasurements.get(name);

    if (!activeMetric) {
      console.warn(`⚠️ [PERF] No active measurement for: ${name}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - activeMetric.startTime;

    activeMetric.endTime = endTime;
    activeMetric.duration = duration;

    // Store completed metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(activeMetric);

    // Keep only recent samples
    if (metricsList.length > this.maxSamplesPerMetric) {
      metricsList.shift();
    }

    this.activeMeasurements.delete(name);

    // Check against target and log warning if exceeded
    const targetKey = this.getTargetKey(name);
    const target = this.targets[targetKey as keyof typeof this.targets];

    if (__DEV__) {
      if (target && duration > target) {
        console.warn(
          `⚠️ [PERF] ${name} took ${duration.toFixed(2)}ms (target: ${target}ms)`,
        );
      } else {
        console.log(`✅ [PERF] ${name}: ${duration.toFixed(2)}ms`);
      }
    }

    return duration;
  }

  /**
   * Measure an async operation
   */
  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.start(name);
    try {
      const result = await operation();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(name: string): PerformanceStats | null {
    const metricsList = this.metrics.get(name);

    if (!metricsList || metricsList.length === 0) {
      return null;
    }

    const durations = metricsList
      .filter((m) => m.duration !== undefined)
      .map((m) => m.duration!);

    if (durations.length === 0) {
      return null;
    }

    // Sort for percentile calculation
    const sorted = [...durations].sort((a, b) => a - b);

    return {
      count: durations.length,
      mean: this.calculateMean(durations),
      median: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      min: Math.min(...durations),
      max: Math.max(...durations),
      recentSamples: durations.slice(-10), // Last 10 samples
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): Record<string, PerformanceStats> {
    const allStats: Record<string, PerformanceStats> = {};

    for (const [name] of this.metrics) {
      const stats = this.getStats(name);
      if (stats) {
        allStats[name] = stats;
      }
    }

    return allStats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeMeasurements.clear();
  }

  /**
   * Clear metrics for a specific measurement
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);
    this.activeMeasurements.delete(name);
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    if (!__DEV__) return;

    const stats = this.getAllStats();

    console.log("📊 Performance Summary:");
    console.log("========================");

    Object.entries(stats).forEach(([name, stat]) => {
      const targetKey = this.getTargetKey(name);
      const target = this.targets[targetKey as keyof typeof this.targets];
      const p95Status = target && stat.p95 > target ? "❌" : "✅";

      console.log(
        `
${name}:
  Count: ${stat.count}
  Mean: ${stat.mean.toFixed(2)}ms
  Median: ${stat.median.toFixed(2)}ms
  P95: ${stat.p95.toFixed(2)}ms ${p95Status}
  Range: ${stat.min.toFixed(2)}ms - ${stat.max.toFixed(2)}ms
  ${target ? `Target: <${target}ms` : ""}
      `.trim(),
      );
    });

    console.log("========================");
  }

  /**
   * Export metrics for analytics (PostHog ready)
   */
  exportMetrics(): Record<string, any> {
    const stats = this.getAllStats();
    const exportData: Record<string, any> = {};

    Object.entries(stats).forEach(([name, stat]) => {
      exportData[`perf_${name}_p95`] = Math.round(stat.p95);
      exportData[`perf_${name}_mean`] = Math.round(stat.mean);
      exportData[`perf_${name}_count`] = stat.count;
    });

    return exportData;
  }

  // Private helper methods
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private getTargetKey(metricName: string): string {
    // Extract base metric type from name
    if (metricName.includes("search")) return "search";
    if (metricName.includes("map")) return "mapUpdate";
    if (metricName.includes("listing")) return "listingLoad";
    if (metricName.includes("image")) return "imageLoad";
    if (metricName.includes("nav")) return "navigation";
    return metricName;
  }
}

// Singleton instance
export const perfTracker = new PerformanceTracker();

/**
 * React Hook for performance tracking
 * Memoized to prevent unnecessary re-renders
 */
export function usePerformance(metricName: string) {
  const start = React.useCallback(
    () => perfTracker.start(metricName),
    [metricName],
  );
  const end = React.useCallback(
    () => perfTracker.end(metricName),
    [metricName],
  );
  const measure = React.useCallback(
    async <T>(operation: () => Promise<T>) =>
      perfTracker.measure(metricName, operation),
    [metricName],
  );

  return React.useMemo(() => ({ start, end, measure }), [start, end, measure]);
}

/**
 * HOC for measuring component render performance
 */
export function withPerformance<P extends object>(
  Component: React.ComponentType<P>,
  metricName: string,
) {
  return (props: P) => {
    React.useEffect(() => {
      perfTracker.start(`${metricName}_mount`);
      return () => {
        perfTracker.end(`${metricName}_mount`);
      };
    }, []);

    return React.createElement(Component, props);
  };
}

// REMOVED: Global setInterval that was causing re-render issues
// Performance summaries can be triggered manually via perfTracker.logSummary()

/**
 * Feature flag for PostHog integration
 * Set this to true when PostHog is configured
 */
export const ENABLE_POSTHOG_METRICS = false;

/**
 * Send metrics to PostHog (placeholder for future implementation)
 */
export function sendMetricsToPostHog(): void {
  if (!ENABLE_POSTHOG_METRICS) return;

  const metrics = perfTracker.exportMetrics();

  // TODO: Implement PostHog integration
  // posthog.capture('performance_metrics', metrics);

  if (__DEV__) {
    console.log("📤 [PERF] Would send to PostHog:", metrics);
  }
}

// Export types for use in other files
export type { PerformanceStats, PerformanceMetric };
