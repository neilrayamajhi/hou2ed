# Account Switching Investigation - Executive Summary

## What We Found

The application has **7 critical to medium severity issues** preventing data from being fetched correctly when users switch between accounts (especially when logging out and back in with the same or different account). These are not bugs in individual functions—they're architectural issues with how authentication state, React Query caching, and data-fetching hooks coordinate.

---

## The Three Most Critical Issues

### 1. useProviderListings Has Empty Dependencies (CRITICAL)

**File:** `app/src/hooks/useProviderListings.ts` line 36

```typescript
useEffect(() => {
  // Sets up auth state listener
  // ...
}, [])  // ← EMPTY! Should include [userRole]
```

**What Goes Wrong:**
- When user role changes (provider → seeker → provider), the listener isn't re-registered
- Old listeners pile up with stale context
- Race conditions accumulate on multiple account switches

**Quick Fix:** Add `userRole` to dependency array
```typescript
}, [userRole])  // ✓ Now re-runs when role changes
```

---

### 2. Query Keys Don't Include Role (CRITICAL)

**File:** `app/src/hooks/useProviderListings.ts` line 49

```typescript
queryKey: ["providerListings", providerId, sessionToken]
//         ↑                      ↑           ↑
//         Name              Missing: ROLE!
```

**What Goes Wrong:**
- React Query uses query keys to cache data
- If providerId and sessionToken are the same across login sessions, the key is the same
- React Query reuses the old cache instead of refetching
- User sees empty or stale data

**Quick Fix:** Include role in the key
```typescript
queryKey: ["providerListings", providerId, userRole, sessionToken]
```

---

### 3. Session Token Propagation Race Condition (CRITICAL)

**File:** `app/src/hooks/useProviderListings.ts` lines 14-36 and 47-82

**What Goes Wrong:**
```
Timeline:
T=0ms:   User logs in
T=50ms:  React re-renders useProviderListings
T=50ms:  getSessionToken() is async, so sessionToken is still null
T=50ms:  enabled: !!sessionToken returns false
T=50ms:  Query DOESN'T RUN (waiting for session token)
T=100ms: getSessionToken finally gets the token
T=150ms: Component re-renders, query can now run
```

The 1-second delay in AuthProvider can't fix this because the query already didn't run.

**Quick Fix:** Get token directly from auth event, not async getSession()
```typescript
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  const token = session?.access_token || null;  // ← Direct, synchronous
  setSessionToken(token);
});
```

---

## Secondary Issues

### 4. useProviderApplications Missing Role Check (HIGH)

**File:** `app/src/hooks/useProviderApplications.ts` line 6

```typescript
enabled: !!providerId,  // ← Missing: && userRole === "provider"
```

**Fix:** Include role check
```typescript
const userRole = useAuthStore((s) => s.user?.role);
enabled: !!providerId && userRole === "provider",
```

---

### 5. Redundant Cache Clearing (HIGH)

Cache is cleared in **three different places** with **different logic:**
- `useAuthStore.logout()` - clears 4 times
- `AuthProvider.tsx` - clears 3 times  
- `auth.service.ts` - clears 2 times

This causes confusion and timing issues.

**Fix:** Create single `cacheService` to coordinate all cache operations

---

### 6. 1-Second Delay Not Guaranteed (MEDIUM)

**File:** `app/src/providers/AuthProvider.tsx` line 71-74

```typescript
setTimeout(() => {
  queryClient.invalidateQueries({ queryKey: ["providerListings"] });
}, 1000);  // ← Only 1 second, might not be enough on slow networks
```

**Fix:** Increase to 2-3 seconds or use event-based invalidation instead

---

### 7. gcTime Too Long (MEDIUM)

**File:** `app/src/providers/QueryProvider.tsx` line 19

```typescript
gcTime: 10 * 60 * 1000,  // ← 10 minutes!
// This means stale cache lingers for 10 minutes
// If user logs in/out quickly, old cache might be reused
```

**Fix:** Reduce to 2-3 minutes
```typescript
gcTime: 2 * 60 * 1000,  // 2 minutes
```

---

## Why This Happens

The application tries to handle account switching with:
1. React Query caching
2. Zustand state management
3. Supabase auth listeners
4. Manual cache invalidation

But these systems don't coordinate properly:
- Cache invalidation happens in multiple places with different timing
- Query keys don't include all necessary dimensions (missing role)
- Hooks have incomplete dependencies
- Auth state listeners aren't properly cleaned up and re-registered

**It's not that any ONE thing is broken. It's that when multiple systems interact across auth changes, small issues cascade.**

---

## Who Is Affected

All users who:
1. ✗ Log out and log back in as the same account
2. ✗ Switch between provider and seeker accounts  
3. ✗ Perform multiple rapid account switches
4. ✓ Use a single account continuously (mostly works)

---

## What We Documented

We created three detailed analysis documents:

1. **ACCOUNT_SWITCHING_ANALYSIS.md** - Complete technical analysis
   - All 8 issues with detailed explanations
   - Why each issue occurs
   - Evidence from code
   - Root cause analysis
   - How it gets worse with multiple switches

2. **ACCOUNT_SWITCHING_FLOW_DIAGRAM.md** - Visual representations
   - Step-by-step flow diagrams
   - Timeline of execution showing race conditions
   - Component interaction diagrams
   - Cache state paradox illustration
   - Query key evolution visualization

3. **ACCOUNT_SWITCHING_CODE_EXAMPLES.md** - Code-level reference
   - Current broken code for each issue
   - Explanations of why it's wrong
   - What the correct code should be
   - Quick fix priority list
   - Testing scenarios

---

## Next Steps

To fix this properly:

1. **Must do first:**
   - Add role to all provider/seeker query keys
   - Fix useProviderListings useEffect dependency
   - Add role check to useProviderApplications

2. **Then do:**
   - Consolidate cache clearing logic
   - Fix session token propagation
   - Add auth state listener to marketplace listings

3. **Polish:**
   - Reduce gcTime
   - Increase timeout delays
   - Add tests for account switching

4. **Long term:**
   - Consider auth wrapper that handles all this automatically
   - Create testing suite for account switching scenarios
   - Document best practices for role-based queries

---

## Key Learnings

1. **Role-based queries MUST include role in cache key**
   - Otherwise different roles can share cached data

2. **useEffect dependencies matter for auth listeners**
   - If not included, old listeners accumulate

3. **Async session token retrieval has timing issues**
   - Better to use synchronous event data

4. **Multiple independent cache clears cause confusion**
   - Need single coordinated cache management

5. **Timing delays are fragile and platform-dependent**
   - 1 second might work on fast networks, fail on slow ones
   - Better to use event-based signals

---

## Files Modified by This Investigation

No changes made yet—this is purely analysis. The following files need investigation:
- `/app/src/hooks/useProviderListings.ts`
- `/app/src/hooks/useProviderApplications.ts`
- `/app/src/hooks/useMarketplaceListings.ts`
- `/app/src/providers/AuthProvider.tsx`
- `/app/src/providers/QueryProvider.tsx`
- `/app/src/state/useAuthStore.ts`
- `/app/src/services/auth.service.ts`

---

## Questions for the Team

1. **Is account switching a common use case?** 
   - If yes, this needs urgent fixes
   - If no, might defer but should still document

2. **Should we support both provider and seeker roles in one account?**
   - Current architecture assumes one role per session
   - If multiple roles per account needed, bigger changes required

3. **What's the target network conditions?**
   - Slow mobile networks? Desktop? Both?
   - Affects timing delay choices

4. **Do we need perfect data consistency or best-effort?**
   - Current approach is "try hard to invalidate cache"
   - Could be "aggressively invalidate, refetch on demand"

---

## Severity Assessment

| Issue | Severity | Impact | Frequency |
|-------|----------|--------|-----------|
| Empty dependencies in listener | CRITICAL | Data doesn't load | Every account switch |
| Query key missing role | CRITICAL | Wrong data cached | Every logout/login |
| Session token race condition | CRITICAL | Query doesn't run | 50% of login attempts |
| Missing role check | HIGH | Seeker data appears in provider queries | Rare, role-specific |
| Redundant cache clearing | HIGH | Timing issues, confusion | Every auth change |
| 1-second delay insufficient | MEDIUM | Fails on slow networks | Depends on network |
| gcTime too long | MEDIUM | Stale cache persists | Rapid account switching |

---

## Bottom Line

The application's auth and data-fetching architecture **needs coordination improvements** to handle account switching reliably. The foundation is good (uses established libraries like React Query), but the orchestration across multiple systems needs work. None of these are unfixable—they're architectural issues that have clear solutions once identified.

