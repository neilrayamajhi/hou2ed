# Account Switching - Code Examples & Quick Reference

## Bug #1: Empty Dependencies in useProviderListings

### Current Code (BROKEN)

**File:** `/app/src/hooks/useProviderListings.ts` (lines 14-36)

```typescript
useEffect(() => {
  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSessionToken(session?.access_token || null);
  };

  getSessionToken();

  // Listen for auth state changes
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("🔐 Auth state changed in useProviderListings:", event);
    setSessionToken(session?.access_token || null);

    // Force invalidate on auth changes
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      queryClient.invalidateQueries({ queryKey: ["providerListings"] });
    }
  });

  return () => {
    authListener?.subscription.unsubscribe();  // ← Cleanup exists
  };
}, []);  // ← EMPTY DEPENDENCIES! THIS IS THE BUG!
```

### Why It's Wrong

When `userRole` changes from "provider" to "seeker", this effect does NOT re-run because its dependency array is empty.

- User logs in as Provider → listener registered for "provider" context
- User logs out
- User logs in as Seeker → **listener still exists** from previous mount
- useEffect doesn't run again (empty deps), so cleanup doesn't happen
- When Seeker logs out and Provider logs in again, old listener is still active
- Old listener has stale `userRole` context, causes race conditions

### What It Should Be

```typescript
// Option 1: Include userRole to restart listener on role change
useEffect(() => {
  // ... same code ...
}, [userRole]);  // ← Re-run when role changes!
```

OR

```typescript
// Option 2: Include userRole to conditionally setup listener
useEffect(() => {
  if (userRole !== "provider") {
    // Skip listener setup for non-providers
    return;
  }

  const getSessionToken = async () => {
    // ... same code ...
  };
  
  // ... listener setup ...
  
  return () => {
    authListener?.subscription.unsubscribe();
  };
}, [userRole]);  // ← Re-run when role changes!
```

---

## Bug #2: Query Key Missing Role Dimension

### Current Code (INCOMPLETE)

**File:** `/app/src/hooks/useProviderListings.ts` (lines 47-52)

```typescript
const query = useQuery({
  // Query key only includes ID and token, not role!
  queryKey: ["providerListings", providerId, sessionToken],
  //                             ↑              ↑
  //                          ID            TOKEN
  //                         Missing: ROLE!

  enabled: !!providerId && userRole === "provider" && !!sessionToken,
  queryFn: async () => {
    // ... fetch logic ...
  },
});
```

### Why It's Wrong

The cache key doesn't change when role changes (unless ID or token changes).

**Scenario:**
```
1. Provider P1 logs in:
   queryKey = ["providerListings", "p1_user_id", "token123"]
   Cache entry created with P1's listings

2. P1 logs out, Seeker S1 logs in:
   queryKey = ["providerListings", "s1_user_id", "token456"]  (DIFFERENT!)
   Good, different key, no cache conflict

3. S1 logs out, Provider P1 logs back in:
   queryKey = ["providerListings", "p1_user_id", "token123"]  (MIGHT BE SAME!)
   If token is regenerated to same value, key is the same!
   React Query: "Cache exists for this key"
   Problem: Returns cached data without checking if it's stale
```

### What It Should Be

```typescript
const query = useQuery({
  // Include role explicitly in the query key
  queryKey: ["providerListings", providerId, userRole, sessionToken],
  //                             ↑              ↑        ↑
  //                          ID            ROLE      TOKEN
  //                        ALL DIMENSIONS!

  enabled: !!providerId && userRole === "provider" && !!sessionToken,
  queryFn: async () => {
    // ... fetch logic ...
  },
});
```

**Why this fixes it:**
- When role changes (provider → seeker), query key changes
- React Query knows to invalidate cache
- When role changes back (seeker → provider), query key changes AGAIN
- Even if ID and token are the same, role makes it a different key

---

## Bug #3: Double Cache Clearing in AuthProvider

### Current Code (REDUNDANT & PROBLEMATIC)

**File:** `/app/src/providers/AuthProvider.tsx` (lines 55-74)

```typescript
if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
  // CRITICAL: Clear all caches on sign in to prevent stale data
  // This ensures provider listings are fetched fresh
  console.log("🔄 Clearing all caches on sign in...");
  await queryClient.cancelQueries();           // ← Step 1
  await queryClient.invalidateQueries();       // ← Step 2
  await queryClient.resetQueries();            // ← Step 3 (REDUNDANT!)

  setSession(session);
  setUser(session?.user || null);

  if (session?.user) {
    const userData = transformUserData(session.user);
    setStoreUser(userData);

    // Force a delay to ensure auth propagation
    setTimeout(() => {
      console.log("🔄 Triggering provider queries refresh...");
      queryClient.invalidateQueries({ queryKey: ["providerListings"] });
    }, 1000);  // ← Only 1 second! Race condition risk!
  }
}
```

### Why It's Wrong

1. **Triple clearing is redundant:**
   - `cancelQueries()`: Stops in-flight requests ✓ (good)
   - `invalidateQueries()`: Marks all as stale (will refetch) ✓ (good)
   - `resetQueries()`: Sets to initial state ✗ (REDUNDANT with invalidate!)
   
   Calling all three might cause unexpected behavior.

2. **1 second delay is not guaranteed:**
   ```
   0ms:    SIGNED_IN event fires
   0ms:    cancelQueries, invalidateQueries, resetQueries run
   0ms:    setSession, setUser run
   0-100ms: Supabase JS client updates internally
   100ms:  useProviderListings component re-renders
   100ms:  BUT: getSession() might still return old session!
           sessionToken might still be null or old value!
   100ms:  query.enabled = false because !!sessionToken is false
   100ms:  Query DOESN'T RUN
   ...
   1000ms: setTimeout callback fires
   1000ms: invalidateQueries called again (too late, query already didn't run!)
   ```

3. **Duplicate with auth.service.ts:**
   Also clearing cache in `loginUser()` function (line 140-141).
   Cache gets cleared THREE times:
   - In `loginUser()` in auth.service.ts
   - In `AuthProvider.tsx` SIGNED_IN handler
   - In `useAuthStore.logout()` on logout
   
   This causes confusion and potential race conditions.

### What It Should Be

```typescript
if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
  setSession(session);
  setUser(session?.user || null);

  if (session?.user) {
    const userData = transformUserData(session.user);
    setStoreUser(userData);

    // DON'T clear cache here - let individual queries handle it
    // They already have role-based query keys that will trigger refetch
    
    // Only invalidate provider-specific queries
    // This is safer than clearing everything
    queryClient.invalidateQueries({ 
      queryKey: ["providerListings"],
      exact: true  // Only this query, not all
    });
  }
}
```

---

## Bug #4: useProviderApplications Missing Role Check

### Current Code (MISSING VALIDATION)

**File:** `/app/src/hooks/useProviderApplications.ts` (lines 5-20)

```typescript
export function useProviderApplications() {
  const providerId = useAuthStore((s) => s.user?.id || null);
  // ❌ Missing: const userRole = useAuthStore((s) => s.user?.role);

  const query = useQuery({
    queryKey: ["providerApplications", providerId],
    enabled: !!providerId,  // ❌ Missing: && userRole === "provider"
    queryFn: async () => {
      if (!providerId) return [];
      return getProviderApplications(providerId);
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  return query;
}
```

### Why It's Wrong

The hook doesn't verify the user is actually a provider. A seeker with an ID could accidentally trigger this query.

**Scenario:**
```
1. Seeker "seeker123" logs in
   enabled: !!providerId is TRUE (seeker has an ID!)
   Query runs even though user is not a provider
   getProviderApplications("seeker123") called with wrong ID
   Might get error or unexpected data

2. Seeker logs out, Provider logs in
   Query key: ["providerApplications", "seeker123"]
   New provider ID: "provider456"
   But component might still be holding old query state
```

### What It Should Be

```typescript
export function useProviderApplications() {
  const providerId = useAuthStore((s) => s.user?.id || null);
  const userRole = useAuthStore((s) => s.user?.role);  // ✓ Get role

  const query = useQuery({
    queryKey: ["providerApplications", providerId, userRole],  // ✓ Include role
    enabled: !!providerId && userRole === "provider",  // ✓ Check role
    queryFn: async () => {
      if (!providerId || userRole !== "provider") return [];
      return getProviderApplications(providerId);
    },
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  return query;
}
```

---

## Bug #5: Session Token Propagation Timing

### Current Code (RACE CONDITION)

**File:** `/app/src/hooks/useProviderListings.ts` (lines 14-36)

```typescript
useEffect(() => {
  const getSessionToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSessionToken(session?.access_token || null);  // ← DELAYED!
  };

  getSessionToken();  // ← Async, not blocking

  // ... listener setup ...
}, []);

// Query uses sessionToken
const query = useQuery({
  queryKey: ["providerListings", providerId, sessionToken],
  enabled: !!providerId && userRole === "provider" && !!sessionToken,
  //                                                    ↑
  //                         If sessionToken is null, query doesn't run!
  queryFn: async () => {
    // Delay to wait for auth propagation
    await new Promise(resolve => setTimeout(resolve, 500));
    // ... fetch ...
  },
});
```

### Why It's Wrong

Timeline of execution:

```
T=0ms:    supabase.auth.signIn() succeeds
T=0-100ms: AuthProvider's SIGNED_IN handler fires
T=50ms:   setSession() and setUser() update React state
T=50ms:   Component re-renders with new user
T=50ms:   useProviderListings re-renders
T=50ms:   getSessionToken() called (async, doesn't block)
T=50ms:   setSessionToken is NOT called yet (getSessionToken is async!)
T=50ms:   sessionToken is still null
T=50ms:   enabled: !!providerId && userRole === "provider" && !!sessionToken
T=50ms:   enabled = false (because sessionToken is null)
T=50ms:   Query doesn't run ✗
T=100ms:  getSessionToken() finally awaits getSession()
T=100ms:  getSession() is called
T=100ms:  Maybe returns new session, maybe returns cached old one
T=150ms:  setSessionToken called with new token
T=150ms:  Component re-renders again
T=150ms:  But might already be disabled or showing error
```

### What It Should Be

```typescript
// Use the session token from the auth event, not getSession()
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth state changed:", event);
    
    // Get token directly from the event session object
    const token = session?.access_token || null;
    setSessionToken(token);  // ← Synchronous update from event

    // Force invalidate on auth changes
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
      // Token is fresh from event, can invalidate immediately
      queryClient.invalidateQueries({ queryKey: ["providerListings"] });
    }
  });

  return () => {
    authListener?.subscription.unsubscribe();
  };
}, [userRole]);  // ← Include userRole as dependency!
```

---

## Bug #6: gcTime Too Long (10 Minutes)

### Current Code (EXCESSIVE CACHE TIME)

**File:** `/app/src/providers/QueryProvider.tsx` (lines 6-22)

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,      // 5 minutes - marked stale after this
      gcTime: 10 * 60 * 1000,        // ❌ PROBLEM: 10 minutes
      //      ↑
      //  Keep unused data in memory for 10 minutes!
      //  If you log out and back in within 10 minutes
      //  with same data, it might be reused!
    },
  },
});
```

### Why It's Wrong

```
Scenario 1: Provider logs in
  0min:   Listings fetched and cached
  5min:   Data marked stale (staleTime expired)
  5min:   But cache still in memory (gcTime not expired)
  
  User logs out at 3 minutes
  User logs back in at 4 minutes
  
  5min:   Query key hasn't changed
          Cache still valid in memory (only 1 minute since logout)
          React Query: "Data is in cache, return it"
          Problem: Might be wrong data!

Scenario 2: Fast account switching
  0min:    Provider1 logs in
  0min:    Cache created
  0.5min:  Provider1 logs out
  0.5min:  Cache cleared but still in memory
  0.5min:  Provider2 logs in
  0.5min:  Cache might be reused if IDs/tokens match!
```

### What It Should Be

For a mobile app with frequent logout/login:

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1 * 60 * 1000,      // 1 minute - shorter for auth changes
      gcTime: 2 * 60 * 1000,         // 2 minutes - much shorter!
                                      // Prevent stale cache from previous user
    },
  },
});
```

---

## Bug #7: Multiple Independent Cache Clears

### Current Code (NO COORDINATION)

Three separate places clear the cache:

**Location 1:** `/app/src/state/useAuthStore.ts` (lines 73-77)

```typescript
logout: async () => {
  // ... clear state ...
  queryClient.cancelQueries();
  await queryClient.invalidateQueries();
  await queryClient.resetQueries();
  await queryClient.clear();
  // ... sign out from Supabase ...
}
```

**Location 2:** `/app/src/providers/AuthProvider.tsx` (lines 58-61)

```typescript
if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
  await queryClient.cancelQueries();
  await queryClient.invalidateQueries();
  await queryClient.resetQueries();
}
```

**Location 3:** `/app/src/services/auth.service.ts` (lines 140-141)

```typescript
if (data?.user) {
  const userData = transformUserData(data.user);
  
  // Clear ALL React Query cache after login
  await queryClient.resetQueries();
  await queryClient.clear();
  
  // Force a small delay
  await new Promise((resolve) => setTimeout(resolve, 100));
}
```

### Why It's Wrong

```
Call sequence on logout:
  1. logout() in useAuthStore is called
  2. Clears cache THREE times (cancel, invalidate, reset, clear)
  3. Supabase.auth.signOut() called
  4. onAuthStateChange fires SIGNED_OUT event
  5. AuthProvider.tsx handles it, calls logout() AGAIN
  6. useAuthStore.logout() is called a SECOND time
  7. Cache cleared again (triple clear again!)

Call sequence on login:
  1. auth.service.ts loginUser() called
  2. Clears cache (reset + clear)
  3. supabase.auth.signIn() succeeds
  4. onAuthStateChange fires SIGNED_IN event
  5. AuthProvider.tsx handles it
  6. Clears cache AGAIN (cancel, invalidate, reset)
  7. useAuthStore.setUser() called
  8. useAuthStore.logout() might get called implicitly

Result: Cache cleared 5-6 times across different async boundaries!
```

### What It Should Be

Create a single cache management service:

```typescript
// services/cacheService.ts
export const cacheService = {
  // Clear only auth-related queries
  clearAuthQueries: async () => {
    await queryClient.invalidateQueries({
      queryKey: ["providerListings"],
      exact: true,
    });
    await queryClient.invalidateQueries({
      queryKey: ["providerApplications"],
      exact: true,
    });
    await queryClient.invalidateQueries({
      queryKey: ["marketplaceListings"],
      exact: true,
    });
  },

  // Complete logout with cache clear
  handleLogout: async () => {
    // Cancel in-flight queries
    await queryClient.cancelQueries();
    
    // Clear all cache
    await queryClient.clear();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
  },

  // Handle login with cache preparation
  handleLogin: async () => {
    // Invalidate auth-related queries to force refetch
    await this.clearAuthQueries();
  },
};

// Then use it consistently everywhere:
// In useAuthStore.logout():
logout: async () => {
  set({ user: null, isAuthenticated: false });
  await cacheService.handleLogout();
}

// In AuthProvider.tsx:
if (event === "SIGNED_OUT") {
  // Already handled in logout()
  // Just update UI state
}
```

---

## Quick Fix Priority

### Must Fix (Critical)

1. **Add role to query keys** - `useProviderListings`, `useProviderApplications`
2. **Fix useProviderListings dependency** - Add `userRole` to useEffect dependencies
3. **Add role check to useProviderApplications** - enabled should check role

### Should Fix Soon (High)

4. **Add role to useMarketplaceListings** - Track auth state changes
5. **Remove redundant cache clearing** - Consolidate to single service
6. **Fix listener cleanup** - Properly unsubscribe on role change

### Good to Fix (Medium)

7. **Reduce gcTime** - From 10 minutes to 2 minutes
8. **Increase initial delay** - From 1 second to 2 seconds
9. **Use auth event token** - Instead of calling getSession again

---

## Testing Commands

```bash
# Test account switching:
# 1. Login as provider, verify listings appear
# 2. Logout
# 3. Login as same provider
# Check: Listings should appear (currently broken)

# 4. Logout  
# 5. Login as seeker
# Check: No provider data should appear

# 6. Logout
# 7. Login as provider (different account)
# Check: Provider's listings should appear (different from step 1)
```

