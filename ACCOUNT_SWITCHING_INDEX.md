# Account Switching Investigation - Complete Documentation Index

## Overview

This investigation thoroughly explores why data isn't being fetched when switching between seeker and provider accounts (or logging out and back in). Four detailed documents provide different perspectives on the same root causes.

---

## Documents

### 1. START HERE: INVESTIGATION_SUMMARY.md
**Length:** Quick read (5 min)
**Best for:** Getting the big picture

This is your entry point. It explains:
- What we found (7 issues identified)
- The 3 CRITICAL issues
- Why it happens
- Who is affected
- Next steps

**Key takeaway:** There's a coordination problem between React Query caching, Zustand state, and Supabase auth listeners.

---

### 2. ACCOUNT_SWITCHING_ANALYSIS.md
**Length:** Deep dive (20 min)
**Best for:** Understanding the root causes

Complete technical analysis with:
- All 8 issues detailed
- Why each issue occurs
- Evidence from actual code
- Root cause analysis
- Impact assessment by severity
- Testing scenarios that reveal bugs
- Why it gets worse with multiple switches

**Read this after the summary if you want to understand the fundamentals.**

---

### 3. ACCOUNT_SWITCHING_FLOW_DIAGRAM.md
**Length:** Visual reference (15 min)
**Best for:** Seeing how data flows (or fails to flow)

Visual representations including:
- Step-by-step flow diagrams (Scenario: Provider → Logout → Provider)
- Logout process timeline
- Re-login process with race conditions highlighted
- Component interaction diagrams
- Why it gets worse on multiple switches
- Data flow issues by component
- Session token propagation timing breakdown
- Cache state paradox visualization
- Query key evolution across logout/login cycles
- Auth state listener stacking problem
- Summary visualization of success vs failure conditions

**Perfect for presentations or explaining to teammates.**

---

### 4. ACCOUNT_SWITCHING_CODE_EXAMPLES.md
**Length:** Reference manual (25 min)
**Best for:** Implementing fixes

Practical code-level reference with:
- 7 bugs with current broken code
- Why each is broken (with examples)
- What correct code looks like
- Quick fix priority list (Must/Should/Good to fix)
- Testing scenarios

**Use this when you're actually fixing the code.**

---

## Quick Navigation

### "I'm in a hurry"
1. Read: INVESTIGATION_SUMMARY.md
2. Look at: The 3 critical issues section
3. Jump to: ACCOUNT_SWITCHING_CODE_EXAMPLES.md → Quick Fix Priority

### "I need to fix this"
1. Start: ACCOUNT_SWITCHING_CODE_EXAMPLES.md
2. Reference: ACCOUNT_SWITCHING_ANALYSIS.md (for "why" context)
3. Debug with: ACCOUNT_SWITCHING_FLOW_DIAGRAM.md (to trace execution)

### "I need to explain this to my team"
1. Use: INVESTIGATION_SUMMARY.md (overview)
2. Show: ACCOUNT_SWITCHING_FLOW_DIAGRAM.md (visual flow)
3. Reference: ACCOUNT_SWITCHING_CODE_EXAMPLES.md (specific code)

### "I want to understand everything"
1. Read in order:
   - INVESTIGATION_SUMMARY.md (5 min)
   - ACCOUNT_SWITCHING_ANALYSIS.md (20 min)
   - ACCOUNT_SWITCHING_FLOW_DIAGRAM.md (15 min)
   - ACCOUNT_SWITCHING_CODE_EXAMPLES.md (25 min)

---

## The 7 Issues at a Glance

| # | Issue | Severity | File | Line | Quick Fix |
|---|-------|----------|------|------|-----------|
| 1 | useProviderListings empty dependencies | CRITICAL | `useProviderListings.ts` | 36 | Add `[userRole]` |
| 2 | Query key missing role | CRITICAL | `useProviderListings.ts` | 49 | Add `userRole` to key |
| 3 | Session token race condition | CRITICAL | `useProviderListings.ts` | 14-82 | Use event token |
| 4 | useProviderApplications missing role check | HIGH | `useProviderApplications.ts` | 6 | Add `&& userRole === "provider"` |
| 5 | Redundant cache clearing | HIGH | 3 files | Multiple | Create `cacheService` |
| 6 | 1-second delay insufficient | MEDIUM | `AuthProvider.tsx` | 71-74 | Increase to 2-3s |
| 7 | gcTime too long (10 minutes) | MEDIUM | `QueryProvider.tsx` | 19 | Reduce to 2 min |

---

## What's Broken

**Scenario:** User logs in as Provider, sees listings. Logs out. Logs back in as same provider. Expected: See listings again. Actual: Empty screen.

**Why it's broken:**
1. Old auth listeners aren't cleaned up (empty dependencies)
2. React Query cache key doesn't change (missing role)
3. Session token isn't ready when query runs (async timing)
4. These issues compound on multiple switches

---

## What's Being Used

The app uses solid libraries:
- **React Query** - For data caching and fetching
- **Zustand** - For local state (auth)
- **Supabase** - For authentication backend

**The problem:** These work great individually, but the orchestration between them during account switching has gaps.

---

## Architecture Overview

```
When user logs in:
  Supabase auth succeeds
    ↓
  onAuthStateChange listener fires (SIGNED_IN)
    ↓
  Multiple systems respond at different times:
    • AuthProvider.tsx updates session/user
    • useAuthStore gets new user data  
    • useProviderListings should refetch (but has issues)
    • React Query cache should invalidate (but doesn't reliably)
    ↓
  User sees data (or empty screen if any step fails)
```

**The gap:** No coordination mechanism between these systems for account switching.

---

## Files That Need Changes

The following files contain the issues:
- `app/src/hooks/useProviderListings.ts` - Contains 3 critical issues
- `app/src/hooks/useProviderApplications.ts` - Missing role check
- `app/src/hooks/useMarketplaceListings.ts` - Not auth-aware (secondary issue)
- `app/src/providers/AuthProvider.tsx` - Redundant cache clearing
- `app/src/providers/QueryProvider.tsx` - gcTime too long
- `app/src/state/useAuthStore.ts` - Redundant cache clearing
- `app/src/services/auth.service.ts` - Redundant cache clearing

---

## Success Criteria for Fixes

After fixes, these scenarios should work:

1. ✓ User logs in, sees provider listings
2. ✓ User logs out
3. ✓ User logs back in as SAME provider, sees listings again
4. ✓ User logs out
5. ✓ User logs in as SEEKER, sees no provider data
6. ✓ User logs out  
7. ✓ User logs in as DIFFERENT provider, sees their listings (not previous provider's)
8. ✓ Rapid account switching works reliably

---

## Performance Notes

These aren't performance issues (no N+1 queries or excessive renders). They're **correctness issues** (showing wrong or no data).

Interestingly, the app already clears cache aggressively on auth changes—but it does so redundantly and without proper coordination.

---

## Lessons Learned

This investigation revealed important patterns:

1. **Cache keys MUST include all query dimensions** (user ID, role, session token)
2. **useEffect dependencies matter even for "setup" effects** (listeners, subscriptions)
3. **Async operations don't work well with "enable" flags** (sessionToken check)
4. **Multiple independent cache-clear points invite race conditions**
5. **Timing delays are platform-dependent** (1 sec works locally, fails on slow networks)
6. **Event-based signals are better than time-based delays**

---

## Questions Answered

**Q: Why does it work sometimes?**
A: Depends on timing. If sessionToken propagates quickly and cache key changes, it works. If not, it fails.

**Q: Why doesn't the 1-second delay fix it?**
A: Because the query already decided not to run at millisecond 50 (before the delay fires).

**Q: Why include role in query key if enabled check already has it?**
A: Because React Query uses keys for caching. If key doesn't change, cache is reused.

**Q: Will this cause memory leaks?**
A: No, but old listeners will pile up. Not a memory leak, but wasteful and buggy.

**Q: Is this a React Query bug?**
A: No, React Query is working as designed. The problem is how we use it.

---

## Next Actions

1. **Read** INVESTIGATION_SUMMARY.md
2. **Review** ACCOUNT_SWITCHING_CODE_EXAMPLES.md "Must Fix" section
3. **Start fixing** with Bug #1 (empty dependencies)
4. **Test** with the scenarios in ACCOUNT_SWITCHING_CODE_EXAMPLES.md
5. **Verify** with each of the 8 test scenarios

---

## Document Statistics

- **Total words:** ~12,000
- **Code examples:** 30+
- **Diagrams:** 15+
- **Issues identified:** 8
- **Critical issues:** 3
- **Files affected:** 7
- **Estimated fix time:** 2-4 hours (depending on testing)

---

## Who Should Read What

**Product Manager:** INVESTIGATION_SUMMARY.md
**QA/Tester:** ACCOUNT_SWITCHING_CODE_EXAMPLES.md (Testing section)
**Developer (Learning):** All documents in order
**Developer (Fixing):** ACCOUNT_SWITCHING_CODE_EXAMPLES.md + reference others as needed
**Tech Lead:** INVESTIGATION_SUMMARY.md + ACCOUNT_SWITCHING_ANALYSIS.md

---

## Disclaimer

This investigation is based on:
- Static code analysis
- Following execution flow
- Understanding React Query behavior
- Understanding Supabase auth patterns

It has NOT been verified with:
- Debugger breakpoints
- Network tracing
- Running actual test scenarios

The issues are likely correct, but implementation details might vary.

---

## Contact & Questions

This investigation was conducted as a comprehensive code review. All findings are documented in these four files. For questions about:
- **Root causes:** See ACCOUNT_SWITCHING_ANALYSIS.md
- **Visual explanation:** See ACCOUNT_SWITCHING_FLOW_DIAGRAM.md
- **Implementation:** See ACCOUNT_SWITCHING_CODE_EXAMPLES.md
- **Overview:** See INVESTIGATION_SUMMARY.md or this file

