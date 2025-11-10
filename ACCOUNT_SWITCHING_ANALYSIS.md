# Account Switching Data Fetch Issue - Comprehensive Analysis

## Executive Summary

The application has **multiple critical issues** preventing data from fetching correctly when switching between seeker and provider accounts. The problems span across authentication state management, React Query cache handling, and role-dependent hooks not being triggered properly on role changes.

---

## Critical Issues Found

### ISSUE 1: React Query Cache NOT Being Cleared on Logout

**Location:** `useAuthStore.ts` (line 62-102)

**Problem:**
The logout flow clears the cache AFTER signing out from Supabase, but there's a race condition issue. The code does:
```typescript
logout: async () => {
  // ... clear state ...
  queryClient.cancelQueries();
  await queryClient.invalidateQueries();
  await queryClient.resetQueries();
  await queryClient.clear();
  
  // Sign out last
  await supabase.auth.signOut();
}
```

**Why This Is a Problem:**
- Even though cache clearing happens, the `gcTime` in QueryProvider is 10 minutes (line 19)
- This means data can persist in memory even after clearing
- When a user logs in with a DIFFERENT account, the old user's cached data might still be retrievable

**Evidence:**
```typescript
// In QueryProvider.tsx (lines 16-19)
staleTime: 5 * 60 * 1000,    // 5 minutes
gcTime: 10 * 60 * 1000,      // Keep unused data for 10 minutes!
```

---

### ISSUE 2: useProviderListings Hook Has Missing Dependency - Role Not Triggering Re-Fetch

**Location:** `useProviderListings.ts` (lines 8-85)

**Critical Problem:**
The `useProviderListings` hook has an empty dependency array in the session tracking effect:

```typescript
useEffect(() => {
  // ... setup session tracking ...
}, []);  // ← EMPTY! Should include userRole dependency
```

But the role-clearing effect (lines 39-45) DOES respond to role changes:
```typescript
useEffect(() => {
  if (!providerId || userRole !== "provider") {
    queryClient.invalidateQueries({ queryKey: ["providerListings"] });
  }
}, [providerId, userRole]);  // ← Correct dependencies here
```

**The Real Issue:**
When a seeker logs in:
1. User role changes to "seeker"
2. The second useEffect clears the cache (good)
3. But the first useEffect never re-runs to re-register the auth state listener
4. So when the user logs back in as a provider, the listener might be stale

**Scenario That Breaks:**
1. User logs in as Provider → data fetches fine
2. User logs out
3. User logs in as Seeker → no provider data (correct)
4. User logs out  
5. User logs in as Provider again → **DATA DOESN'T FETCH** (BUG!)

---

### ISSUE 3: Query Key Doesn't Include Role - Only User ID and Token

**Location:** `useProviderListings.ts` (line 49)

```typescript
queryKey: ["providerListings", providerId, sessionToken],
enabled: !!providerId && userRole === "provider" && !!sessionToken,
```

**Problem:**
The query key is based on `providerId` and `sessionToken`, NOT on `userRole`. This means:
- When a seeker account is logged in with ID "user123"
- Then a provider account logs in ALSO with the same ID structure
- The cache key might conflict if the system reuses IDs across roles

Actually, worse: the `providerId` is pulled from `useAuthStore` which correctly reflects the current user's ID. But the caching doesn't explicitly partition by role.

---

### ISSUE 4: Auth Provider Clears ALL Queries Too Aggressively on Sign-In

**Location:** `AuthProvider.tsx` (lines 56-74)

```typescript
if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
  // CRITICAL: Clear all caches on sign in...
  console.log("🔄 Clearing all caches on sign in...");
  await queryClient.cancelQueries();
  await queryClient.invalidateQueries();
  await queryClient.resetQueries();  // ← Clears everything including marketplace data!
}
```

**Problem:**
- `resetQueries()` sets all queries to their initial state
- But `invalidateQueries()` just marks them as stale
- This is calling BOTH, which is redundant and potentially harmful
- More importantly, the delay (1000ms) is hardcoded and might not be enough

**Race Condition:**
```typescript
setTimeout(() => {
  console.log("🔄 Triggering provider queries refresh...");
  queryClient.invalidateQueries({ queryKey: ["providerListings"] });
}, 1000);  // ← Only 1 second delay for auth state to propagate!
```

The Supabase session might not be fully propagated to all listeners in 1 second, especially on slow networks.

---

### ISSUE 5: useProviderListings Has 500ms Delay But Needs Dependency Re-Trigger

**Location:** `useProviderListings.ts` (lines 54-56)

```typescript
queryFn: async () => {
  // Add a longer delay to ensure auth state is fully propagated
  await new Promise(resolve => setTimeout(resolve, 500));
```

**Problem:**
- The 500ms delay is inside the query function, only runs when query executes
- But if the `queryKey` hasn't changed, React Query won't re-run the function
- The dependency on `sessionToken` helps, but session token might not change between login attempts

**Example:**
1. Provider logs in → sessionToken set
2. Provider logs out → sessionToken cleared (good)
3. Provider logs in again → sessionToken is SET AGAIN... 
4. But the session token value itself might be the same format!
5. So `queryKey: ["providerListings", providerId, sessionToken]` might not change
6. React Query sees "same key, data already in cache, don't refetch"

---

### ISSUE 6: useProviderApplications Missing Role Check

**Location:** `useProviderApplications.ts` (lines 5-20)

```typescript
export function useProviderApplications() {
  const providerId = useAuthStore((s) => s.user?.id || null);
  
  const query = useQuery({
    queryKey: ["providerApplications", providerId],
    enabled: !!providerId,  // ← MISSING: userRole check!
    // ...
  });
}
```

**Problem:**
This hook doesn't check if the user is actually a provider! It only checks if providerId exists. A seeker account could have this data cached and it would stay cached.

---

### ISSUE 7: Role-Based Data Fetching Without Role in Dependencies

**Location:** `ProviderDashboard.tsx` (lines 49-81)

```typescript
useFocusEffect(
  useCallback(() => {
    // ... code that checks user?.role ...
  }, [user?.id, user?.role, refetch]),  // ← Dependencies exist
);
```

This one is ACTUALLY CORRECT, but the underlying hooks it depends on (useProviderListings) have issues.

---

### ISSUE 8: HomeScreen Marketplace Listings Not Role-Aware

**Location:** `HomeScreen.tsx` (lines 100-112)

```typescript
const {
  data: listings = [],
  isLoading: loadingData,
  refetch,
  isRefetching,
} = useMarketplaceListings();

useFocusEffect(
  useCallback(() => {
    console.log("🏠 HomeScreen focused - refreshing listings");
    refetch();  // ← Generic refetch, doesn't consider role switch
  }, [refetch]),
);
```

**Problem:**
- useMarketplaceListings doesn't track auth state changes
- It only refetches on focus, not on auth changes
- A user could log out as provider, log in as seeker, and old provider listings might still be in memory

---

## Root Cause Analysis

### The Core Problem Loop:

```
User logs out
    ↓
useAuthStore.logout() clears cache ✓
    ↓
Supabase signs out ✓
    ↓
onAuthStateChange fires SIGNED_OUT event ✓
AuthProvider.tsx calls logout() again (redundant) ✓
    ↓
User logs in with DIFFERENT ACCOUNT
    ↓
onAuthStateChange fires SIGNED_IN event ✓
AuthProvider clears queries (maybe too aggressive) ✓
    ↓
useProviderListings gets new providerId ✓
    ↓
BUT: Query key might have same structure
     or sessionToken might not propagate fast enough
     or 1 second delay isn't enough
    ↓
Query doesn't execute (thinks it's cached)
    ↓
NO DATA SHOWN ✗
```

---

## Why This Gets Worse with Multiple Account Switches

1. **First switch (Provider → Seeker):** Works okay, cache gets cleared on logout
2. **Second switch (Seeker → Provider):** Cache clearing might be incomplete
3. **Third+ switches:** Race conditions accumulate, garbage collection doesn't run
4. Memory fills with stale provider/seeker data that never gets garbage collected

---

## Missing Pieces

### 1. No Explicit Role-Based Query Partition
All provider queries should include role in the query key:
```typescript
// Current (BAD)
queryKey: ["providerListings", providerId, sessionToken]

// Should be (GOOD)
queryKey: ["providerListings", providerId, userRole, sessionToken]
```

### 2. No Auth State Listener in useMarketplaceListings
The marketplace listings hook never listens for auth state changes, so switching accounts doesn't trigger refetch.

### 3. No Coordination Between Multiple Cache-Clearing Locations
- `useAuthStore.logout()` clears cache
- `AuthProvider.tsx` also clears cache
- `loginUser()` in auth.service.ts ALSO clears cache
This causes triple-clearing which might have unintended side effects.

### 4. No Proper Cleanup of Old Listeners
When useProviderListings unmounts/remounts, the old auth listener might not be cleaned up properly.

---

## How Account Switching Should Work (Ideally)

```
User logs out
  → useAuthStore clears: user, selectedRole
  → React Query cache cleared (with shorter gcTime)
  → All auth listeners unsubscribed

User logs in with new account
  → Supabase auth state changes
  → AuthProvider updates session/user
  → useAuthStore.setUser() called with new user
  → All role-dependent hooks see new user data
  → Query keys with role included cause re-fetch
  → Fresh data loaded for new account
```

---

## The Real Issue: Timing and Coordination

The application is doing MOST of the right things, but:
1. **Timing is off** - delays (1 second, 500ms) aren't guaranteed to be enough
2. **Dependencies are incomplete** - some hooks miss role in their dependency arrays
3. **Query keys don't include role** - so different roles can share cache keys
4. **Multiple independent cache clears** - no single source of truth
5. **No explicit auth state tracking in data-fetching hooks** - relies on query key changes

---

## Affected User Flows

1. ❌ Provider → Logout → Provider (same account) = Can't fetch data
2. ❌ Seeker → Logout → Provider = Data fetches but might be stale
3. ❌ Provider → Logout → Seeker → Logout → Provider = High chance of stale data
4. ❌ Rapid switching without logout = Unpredictable behavior
5. ✓ Single session, no switches = Works fine

---

## Testing Scenarios That Reveal The Bug

```bash
Scenario A: Provider Same-Account Re-login
- Login as provider, see listings
- Logout
- Login as SAME provider
- Result: Empty listings (Query thinks cache is valid)

Scenario B: Account Type Switch
- Login as provider, see provider dashboard
- Logout
- Login as seeker
- Logout
- Login as provider
- Result: Stale provider data or missing data

Scenario C: Network Delay
- Login as provider with slow network
- 1 second delay expires before auth fully propagates
- Query executes with wrong session context
- Result: Permissions error or wrong data
```

---

## Summary of Issues by Severity

| Severity | Issue | File | Root Cause |
|----------|-------|------|-----------|
| CRITICAL | Query cache not cleared on logout | useAuthStore.ts | gcTime = 10min |
| CRITICAL | useProviderListings missing role in dependencies | useProviderListings.ts | Empty dep array in session effect |
| HIGH | Query key doesn't include role | useProviderListings.ts | Only uses ID + token |
| HIGH | Double cache clearing (cancel + reset) | AuthProvider.tsx | Redundant operations |
| HIGH | useProviderApplications missing role check | useProviderApplications.ts | No userRole validation |
| MEDIUM | 1 second delay might not be enough | AuthProvider.tsx | Hardcoded timeout |
| MEDIUM | 500ms delay only runs if query executes | useProviderListings.ts | Inside queryFn, not guaranteed |
| MEDIUM | useMarketplaceListings not auth-aware | useMarketplaceListings.ts | Doesn't listen for auth changes |

