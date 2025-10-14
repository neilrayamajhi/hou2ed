import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a QueryClient - this manages all data fetching and caching
// It's like a smart system that remembers data you've already fetched
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't refetch data when window regains focus (mobile app behavior)
      refetchOnWindowFocus: false,
      // Keep trying 3 times if a request fails
      retry: 3,
      // Wait longer between retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Increase timeout to 30 seconds for slow networks
      // This prevents "request timed out" errors on mobile data
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

// This provider wraps the app and gives all components access to React Query
export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
