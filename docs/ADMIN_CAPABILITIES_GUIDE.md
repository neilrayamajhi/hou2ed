# 🛠️ Admin Capabilities Implementation Guide

## Overview

The admin dashboard used to be read-only — stats and charts, nothing an admin could actually *do*. This guide documents the real admin powers being added on top of it, phase by phase.

---

## Phase 1: User Management + Listing Moderation ✅ Complete

### 1. **Database Layer** (✅ Complete)
- Added ban support to `profiles`: `is_banned`, `banned_at`, `banned_reason`, `banned_by` columns.
- New trigger `prevent_ban_self_escalation` — blocks any change to `is_banned` unless made by an existing admin or a trusted server context (mirrors the existing `prevent_role_self_escalation` trigger). Without this, a banned user could un-ban themselves through a normal profile update.
- Reissued `"Admins can manage all listings"` and restored a missing `"Admins can update any profile"` policy, both using the non-recursive `public.is_admin(uid)` helper. The update policy had silently drifted out of the live database at some point outside version control — found and fixed during end-to-end testing of this feature, not by reading migration files alone.
- Migrations: `20260713090000_add_profile_ban_status.sql`, `20260713090100_reaffirm_admin_listings_policy.sql`, `20260713090200_restore_admin_update_profiles_policy.sql`.

### 2. **Edge Function** (✅ Complete)
Created `supabase/functions/admin-user-action/index.ts` — handles `ban`, `unban`, and `delete`, the three actions that need Supabase's service-role key (never shipped to the client — that was this session's other critical security fix). The function:
1. Verifies the caller's JWT identifies a real, currently logged-in user.
2. Calls the `is_admin()` Postgres function (under the caller's own permissions, no service role needed) to confirm they're actually an admin.
3. Only then uses the service role to perform the action.

Ban uses Supabase Auth's native `ban_duration` — a banned user is rejected at login by Supabase itself, not just hidden by app logic. Delete cascades cleanly through every related table (listings, applications, etc. all reference `profiles`/`auth.users` with `ON DELETE CASCADE`).

### 3. **Services** (✅ Complete)
- `app/src/services/userModeration.service.ts` — `listUsers`, `getUserDetail`, `setUserRole`, `banUser`, `unbanUser`, `deleteUserAccount`.
- `app/src/services/listingModeration.service.ts` — `listAllListingsForAdmin`, `getListingForAdmin`, `setListingActive`.
- Both fully unit tested (`*.spec.ts`), following the existing `admin.service.ts` mocking conventions.

### 4. **Screens & Navigation** (✅ Complete)
- New `app/src/navigation/AdminStack.tsx` — the admin tab is now a full nested stack (mirroring the provider dashboard's `DashboardStack`), not a single static screen.
- `UserManagementList` → `UserDetail`: search/filter users by role, view a user's activity, change their role, ban/unban, or permanently delete their account (with a double confirmation given it's irreversible).
- `ListingModerationList` → `ListingModerationDetail`: browse all listings (active/inactive filter), deactivate or reactivate any listing regardless of who owns it.
- `AdminDashboard` gained two "Manage" nav cards linking into Users and Listings, on top of its existing stats/charts.

### How It Works

**Banning a user:**
```
Admin taps Ban → confirms in a dialog → app calls the admin-user-action
Edge Function → Edge Function verifies caller is an admin → sets
auth.users.banned_until (Supabase Auth) + profiles.is_banned (fast local flag)
→ user's next login attempt is rejected by Supabase itself.
```

**Changing a user's role:**
```
Admin picks a new role → confirms → app updates profiles.role directly →
allowed because the caller is an admin (RLS policy + trigger both check
is_admin()) → blocked with an error for anyone who isn't an admin,
including the user trying to change their own role.
```

**Deactivating a listing:**
```
Admin taps Deactivate → confirms → app sets listings.is_active = false →
allowed for admins on any listing (not just their own) via the
"Admins can manage all listings" policy → listing disappears from
seeker-facing search immediately (same is_active flag providers use to
self-delete their own listings).
```

### Verification

Every piece above was tested against the real, live Supabase project (not just unit tests) before being considered done:
- Created disposable test accounts, promoted one to admin, and confirmed role changes, bans, unbans, and account deletion all worked through the real REST API and Edge Function.
- Confirmed a non-admin gets rejected (`403`) calling the same Edge Function, and that direct database attempts to self-promote or self-unban are still blocked by the existing triggers.
- Confirmed a non-admin, non-owner cannot deactivate someone else's listing.
- All disposable test accounts/listings were deleted afterward — no test data left behind.

---

## Phase 2: Reports & Disputes — Not yet started

Will add a `reports` table, wire the existing (currently fake) "Report Abuse" button in `ThreadScreen.tsx` to actually persist reports, and give admins a screen to review and act on them (reusing the ban mechanism from Phase 1).

## Phase 3: Provider Verification Review — Not yet started

Scoped as **admin-side review only** — there is currently no provider-facing document submission flow anywhere in the app, so this phase builds just the approve/reject screen over the existing (currently unused) `verification_status`/`verification_documents` columns. A real submission flow is an explicit separate future project.
