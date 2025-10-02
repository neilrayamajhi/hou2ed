/**
 * Network utilities for resilience and error handling
 */

import NetInfo from "@react-native-community/netinfo";
import { Alert } from "react-native";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
  details: any;
}

/**
 * Check if device has internet connectivity
 */
export async function checkInternetConnection(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return Boolean(
      netInfo.isConnected && netInfo.isInternetReachable !== false,
    );
  } catch (error) {
    console.error("Error checking internet connection:", error);
    return false;
  }
}

/**
 * Wait for internet connection with timeout
 */
export async function waitForConnection(timeoutMs = 30000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const isConnected = await checkInternetConnection();
    if (isConnected) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Execute function with network check
 */
export async function executeWithNetworkCheck<T>(
  fn: () => Promise<T>,
  options?: {
    showAlert?: boolean;
    retryOnFailure?: boolean;
    maxWaitTime?: number;
  },
): Promise<T> {
  const {
    showAlert = true,
    retryOnFailure = true,
    maxWaitTime = 30000,
  } = options || {};

  const isConnected = await checkInternetConnection();

  if (!isConnected) {
    if (showAlert) {
      Alert.alert(
        "No Internet Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }],
      );
    }

    if (retryOnFailure) {
      const connected = await waitForConnection(maxWaitTime);
      if (connected) {
        return fn();
      }
    }

    throw new Error("No internet connection");
  }

  return fn();
}

/**
 * Network request with automatic retry and exponential backoff
 */
export async function resilientRequest<T>(
  request: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    retryCondition?: (error: any) => boolean;
    onRetry?: (attempt: number, error: any) => void;
  },
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    retryCondition,
    onRetry,
  } = options || {};

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check network before attempting
      const isConnected = await checkInternetConnection();
      if (!isConnected && attempt === 0) {
        throw new Error("No internet connection");
      }

      return await request();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const shouldRetry = retryCondition
        ? retryCondition(error)
        : isNetworkError(error);

      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Check if error is network-related
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || "";
  const networkErrorPatterns = [
    "network",
    "fetch",
    "timeout",
    "connection",
    "internet",
    "offline",
    "econnrefused",
    "enotfound",
    "econnreset",
    "etimedout",
  ];

  return networkErrorPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Create a timeout promise
 */
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = "Request timed out",
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Subscribe to network state changes
 */
export function subscribeToNetworkState(
  callback: (state: NetworkState) => void,
): () => void {
  const unsubscribe = NetInfo.addEventListener((state: any) => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      details: state.details,
    });
  });

  return unsubscribe;
}

/**
 * Batch network requests with retry
 */
export async function batchRequestsWithRetry<T>(
  requests: Array<() => Promise<T>>,
  options?: {
    concurrency?: number;
    stopOnError?: boolean;
  },
): Promise<Array<{ success: boolean; result?: T; error?: Error }>> {
  const { concurrency = 3, stopOnError = false } = options || {};

  const results: Array<{ success: boolean; result?: T; error?: Error }> = [];
  const queue = [...requests];
  const executing: Promise<void>[] = [];

  while (queue.length > 0 || executing.length > 0) {
    while (executing.length < concurrency && queue.length > 0) {
      const request = queue.shift()!;

      const promise = resilientRequest(request)
        .then((result) => {
          results.push({ success: true, result });
        })
        .catch((error) => {
          results.push({ success: false, error });
          if (stopOnError) {
            throw error;
          }
        });

      executing.push(promise);
    }

    if (executing.length > 0) {
      const finished = await Promise.race(executing);
      const index = executing.indexOf(finished as any);
      if (index !== -1) {
        executing.splice(index, 1);
      }
    }
  }

  return results;
}
