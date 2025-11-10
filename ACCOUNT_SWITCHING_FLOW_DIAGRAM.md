# Account Switching - Data Flow Diagrams

## Current (Broken) Flow

### Scenario: Provider → Logout → Provider (Same Account)

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Logged In as Provider                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  useAuthStore                    useProviderListings                 │
│  ┌──────────────────────┐       ┌──────────────────────────────┐   │
│  │ user.id = "provider1"│       │ queryKey = [                 │   │
│  │ user.role = provider │       │   "providerListings",        │   │
│  │                      │       │   "provider1",               │   │
│  │ isAuthenticated=true │       │   "token_abc123"             │   │
│  └──────────────────────┘       │ ]                            │   │
│                                 │ data: [list1, list2, ...]   │   │
│                                 │ status: success              │   │
│                                 └──────────────────────────────┘   │
│                                                                       │
│  React Query Cache (memory)                                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ["providerListings", "provider1", "token_abc123"]          │    │
│  │   → { data: [list1, list2], status: "success" } ✓          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Supabase Auth Session                                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ session.user.id = "provider1"                              │    │
│  │ session.access_token = "token_abc123"                      │    │
│  │ status: AUTHENTICATED ✓                                    │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario: User Clicks Logout

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Logout Process                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ 1. User clicks "Logout" button                                       │
│    ↓                                                                  │
│ 2. logout() called from useAuthStore                                 │
│    ↓                                                                  │
│    • queryClient.cancelQueries() ✓                                  │
│    • queryClient.invalidateQueries() ✓                              │
│    • queryClient.resetQueries() ✓                                   │
│    • queryClient.clear() ✓                                          │
│    ↓                                                                  │
│ 3. supabase.auth.signOut() ✓                                        │
│    ↓                                                                  │
│ 4. onAuthStateChange fires "SIGNED_OUT" event ✓                     │
│    ↓                                                                  │
│ 5. AuthProvider.tsx handles it (line 48-52)                         │
│    • setSession(null) ✓                                             │
│    • setUser(null) ✓                                                │
│    • logout() called AGAIN (redundant but okay)                     │
│                                                                       │
│ RESULT: Cache appears cleared, auth state cleared ✓                 │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Scenario: User Logs Back In (SAME PROVIDER)

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Re-Login as Same Provider                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ 1. User enters credentials and logs in                               │
│    ↓                                                                  │
│ 2. supabase.auth.signIn() succeeds                                   │
│    ↓                                                                  │
│ 3. onAuthStateChange fires "SIGNED_IN" event ✓                      │
│    ↓                                                                  │
│ 4. AuthProvider.tsx (lines 55-74):                                   │
│    • queryClient.cancelQueries() ✓                                  │
│    • queryClient.invalidateQueries() ✓                              │
│    • queryClient.resetQueries() ← PROBLEM! Sets all to initial state│
│    • setSession(session) ✓                                          │
│    • setUser(session.user) ✓                                        │
│    ↓                                                                  │
│ 5. Auth service (loginUser) ALSO clears cache:                      │
│    • queryClient.resetQueries()                                     │
│    • queryClient.clear()                                            │
│    ↓ (REDUNDANT - already done twice!)                              │
│                                                                       │
│ 6. setTimeout(1000ms) invalidates "providerListings" ← ONLY 1 SEC!  │
│    • But at this point, is the session fully propagated?            │
│                                                                       │
│ 7. useAuthStore.setUser(userData) ✓                                 │
│    • user.id = "provider1" (same as before)                         │
│    • user.role = "provider" (same as before)                        │
│                                                                       │
│  React Query Cache Status NOW:                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ["providerListings", "provider1", "token_xyz789"]          │    │
│  │   → status: "uninitialized" (after resetQueries)           │    │
│  │   → Should refetch when query runs                         │    │
│  │                                                             │    │
│  │ BUT: What if sessionToken hasn't updated yet?             │    │
│  │ OLD: "token_abc123"                                        │    │
│  │ NEW: "token_abc123" (same value? or delayed?)              │    │
│  │                                                             │    │
│  │ If same, React Query key doesn't change!                  │    │
│  │ If delayed, sessionToken might still be null               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│ 8. useProviderListings hook re-renders:                             │
│    • providerId = "provider1" ✓                                     │
│    • userRole = "provider" ✓                                        │
│    • sessionToken = ??? (null? same value? different value?)        │
│    ↓                                                                  │
│    • if (!providerId || userRole !== "provider") {                  │
│      // This is FALSE, so cache NOT cleared                         │
│      // Cache remains uninitialized or with old state               │
│    }                                                                  │
│                                                                       │
│    • queryKey: ["providerListings", "provider1", sessionToken]      │
│    • enabled: !!providerId && userRole === "provider" && !!token    │
│    ↓                                                                  │
│    CRITICAL PROBLEM:                                                │
│    If sessionToken is still null at this point, enabled = false    │
│    Query WON'T RUN, so no refetch happens!                         │
│                                                                       │
│ RESULT: No data displayed (empty listings) ✗                        │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Why It Gets Worse on Multiple Switches

```
Switch #1: Provider1 → (logout) → Provider1
└─ Sometimes works (depends on timing)

Switch #2: Provider1 → (logout) → Seeker1 → (logout) → Provider1
└─ Cache might have garbage from multiple role changes
└─ Multiple auth listeners might be stacked
└─ Session token might not propagate

Switch #3+: Multiple rapid switches
└─ Race conditions accumulate
└─ Memory bloat from uncollected cache entries
└─ Listeners pile up
```

---

## Data Flow Issues By Component

### 1. AuthProvider.tsx - Too Aggressive Cache Clearing

```
onAuthStateChange "SIGNED_IN"
    ↓
cancelQueries()        ← Stops in-flight queries
    ↓
invalidateQueries()    ← Marks all as stale (refetch when accessed)
    ↓
resetQueries()         ← Sets to initial state (REDUNDANT with invalidate!)
    ↓
setSession()          
setUser()             ← Updates auth state
    ↓
setTimeout(1000ms)     ← RACE CONDITION! 1 second might not be enough
    ↓
invalidateQueries(["providerListings"]) ← Too late? Session might not be ready
```

**Problem:** Multiple async operations without proper coordination

### 2. useProviderListings - Broken Dependencies

```
Initial Mount:
  useEffect #1 (line 14-36):
    └─ Setup auth state listener
    └─ Dependency: [] (EMPTY!)
    └─ Result: Listener never re-registered on role change

  useEffect #2 (line 39-45):
    └─ Clear cache if not provider role
    └─ Dependency: [providerId, userRole] (CORRECT)
    └─ Result: Clears cache, but listener from #1 is stale

Query Function (line 47-82):
  └─ queryKey: ["providerListings", providerId, sessionToken]
  └─ IF sessionToken is null → enabled = false
  └─ Query doesn't run, no data shown
```

### 3. Session Token Propagation Timing

```
Timeline of events (milliseconds):
├─ 0ms:     signIn() succeeds
├─ 0-100ms: supabase.auth.onAuthStateChange fires
├─ 0-100ms: setSession(), setUser() updates happen
├─ 0-100ms: BUT Supabase JS client hasn't updated getSession() yet!
├─ 100ms:   useProviderListings re-renders
├─ 100ms:   sessionToken = null (because getSession() still returns old!)
├─ 100ms:   enabled: !!providerId && userRole === "provider" && !!sessionToken
├─ 100ms:   enabled = false because sessionToken is null
├─ 100ms:   Query DOESN'T RUN
├─ ...
├─ 1000ms:  setTimeout callback fires, invalidates
├─ 1000ms:  But sessionToken still might be null!
└─ Result:  Data never fetches
```

---

## The Cache State Paradox

```
After logout:
  Cache Status: Cleared
  Auth Status: Cleared
  
After re-login (SAME credentials):
  Auth Status: Restored ✓
  Cache Status: ???
  
  Three possible states:
  
  1. Cache Reset but Data Lost
     └─ resetQueries() set to initial state
     └─ No data to show
     └─ Query enabled = false (waiting for sessionToken)
     └─ Never re-fetches
  
  2. Cache Not Properly Cleared
     └─ Some cache entry still exists
     └─ React Query sees valid key
     └─ Returns old cache without refetch
     └─ Shows wrong data (or no data if TTL expired)
  
  3. Cache Key Changed
     └─ sessionToken is different
     └─ queryKey is different
     └─ React Query refetches
     └─ Shows correct data ✓
     
  The problem: We don't know which one will happen!
  It depends on TIMING!
```

---

## Query Key Evolution Across Logout/Login

```
Initial Login (Provider):
  providerId = "p123"
  userRole = "provider"  
  sessionToken = "tok_abc"
  queryKey = ["providerListings", "p123", "tok_abc"]
  cache = { data: [list1, list2] }

After Logout:
  providerId = null
  userRole = null
  sessionToken = null
  queryKey = ["providerListings", null, null]
  enabled = false
  cache might still have old entry
  
After Re-Login (Same Account):
  providerId = "p123" ✓ (SAME!)
  userRole = "provider" ✓ (SAME!)
  sessionToken = ??? 
  
  If sessionToken = "tok_abc" (same value):
    queryKey = ["providerListings", "p123", "tok_abc"] (SAME!)
    React Query: "Key hasn't changed, data is still in cache"
    Result: Uses cache, no refetch ✗
  
  If sessionToken = "tok_xyz" (different value):
    queryKey = ["providerListings", "p123", "tok_xyz"] (DIFFERENT!)
    React Query: "Key changed, need to fetch"
    Result: Refetches ✓
  
  If sessionToken = null (still delayed):
    queryKey = ["providerListings", "p123", null] 
    enabled = false
    Query doesn't run ✗
```

---

## The Missing Role Dimension

### Current Query Key Design (2D):

```
queryKey = ["providerListings", providerId, sessionToken]

Problems:
  • Provider "p123" and Seeker "s456" have different IDs
  • But cache keys don't include role explicitly
  • Different roles could theoretically share the same structure
  • If different providers have same ID (unlikely but not explicit)
  • Cache clearing by role is implicit, not explicit
```

### Correct Query Key Design (3D):

```
queryKey = ["providerListings", providerId, userRole, sessionToken]

Benefits:
  • Explicit role-based partitioning
  • Different roles cannot share cache
  • Role change guarantees key change
  • Session-specific data for each role
  • When role changes, old cache ignored
```

---

## Auth State Listener Stacking

### Without Cleanup:

```
User logs in as Provider:
  useProviderListings mounts
  └─ useEffect[] (line 14): Creates listener #1
  └─ onAuthStateChange listener #1 registered
  
User logs out:
  useProviderListings still mounted!
  └─ useEffect[] (line 14): NO CLEANUP (empty deps!)
  └─ Listener #1 still active
  
User logs in as Seeker:
  useProviderListings still mounted
  └─ useEffect[] (line 14): NO CHANGE (empty deps!)
  └─ Listener #1 still active (pointing to old userRole!)
  
User logs in as Provider again:
  useProviderListings still mounted
  └─ Now we have: Listener #1 (stale) + original session tracking
  └─ Listener #1 fires with stale context
  └─ Makes wrong invalidation calls
  └─ Race condition
  
RESULT: Multiple listeners processing same events with different state
```

---

## Summary Visualization

```
GOOD DATA FETCH: Conditions Met
┌─────────────────────────────────────────────────────────┐
│ ✓ Session is valid and authenticated                    │
│ ✓ userRole is "provider" (for provider queries)         │
│ ✓ providerId is set correctly                           │
│ ✓ sessionToken is available                             │
│ ✓ Query key includes all necessary dimensions           │
│ ✓ No stale cached data from previous session            │
│ ✓ Auth listeners are current and active                 │
│ ✓ Timing of auth propagation allows query to run        │
└─────────────────────────────────────────────────────────┘
           ↓↓↓ ALL CONDITIONS MET ↓↓↓
        DATA FETCHES SUCCESSFULLY ✓


BROKEN DATA FETCH: At Least One Condition Failed
┌─────────────────────────────────────────────────────────┐
│ ? Session valid but sessionToken is null/delayed        │
│ ? userRole is wrong or stale                            │
│ ? Query key hasn't changed (cache reused)               │
│ ? Auth listener is from previous session                │
│ ? Timing race condition: 1s delay too short             │
│ ? Multiple cache clears caused side effects             │
│ ? gcTime too long (10 minutes)                          │
└─────────────────────────────────────────────────────────┘
          ↓↓↓ ONE+ CONDITIONS FAILED ↓↓↓
      DATA DOESN'T FETCH OR SHOWS WRONG DATA ✗
```

