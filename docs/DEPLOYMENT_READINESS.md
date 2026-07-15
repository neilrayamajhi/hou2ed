# 🚀 Deployment Readiness — Session Log & Open Items

Living document tracking what's been fixed, what's still open, and what needs a human decision before this app ships. Update this as work continues.

**Last updated:** 2026-07-15 (all 3 RLS security items closed)

---

## ✅ Security fixes — done

1. **Admin role self-escalation (critical).** Any user could make themselves admin two ways: via signup metadata, or by directly updating their own `profiles.role`. Both closed. Added `public.is_admin()` (a non-recursive helper for RLS policies) and a trigger blocking any role change unless made by an existing admin. Verified against the live REST API with disposable test accounts, not just code review.

2. **Hardcoded `service_role` key shipped inside the app.** A key that bypasses all Row Level Security was hardcoded in `app/src/lib/supabaseService.ts` and compiled into the client bundle — anyone who downloaded the app could extract it. The code using it turned out to be entirely dead (never imported anywhere), so it was deleted outright. The key itself was also rotated/revoked at the Supabase project level, so even the old leaked copy is dead.

3. **Migrated to Supabase's new publishable/secret key system**, replacing the legacy anon/service_role JWTs project-wide. Verified `npm run start`, the full test suite, and live signup/login all work identically after the rotation.

4. **Untracked `app/.env.supabase` from git** — it contained a live Supabase Management API token, committed since October 2025, in this public repo.
   - ⚠️ **Still open — needs Neil.** That token belongs to Neil's account; only he can revoke it (**supabase.com/dashboard/account/tokens**). As of this session it was still confirmed working, meaning it's still live and exploitable. **Follow up with him if you haven't heard back.**

5. **Found and fixed schema drift**: an `"Admins can update any profile"` RLS policy existed in the original migration file but had silently disappeared from the live database at some point outside version control — promote/demote would have silently done nothing. Caught via live testing, not by reading migration files.

6. **Found and fixed a second self-escalation bug** while building verification review: any user could set their own `verification_status` to `"verified"` directly — same class of bug as #1. Added the same trigger pattern.

---

## ✅ Full admin capabilities — built (3 phases)

The admin dashboard went from read-only stats to a real moderation tool. All three phases tested end-to-end against the live database with disposable accounts (created, exercised, deleted — no test data left behind).

- **User management**: search/filter users, view activity, change role, ban (hard login lock via Supabase Auth itself, not just app-level hiding), unban, permanently delete an account.
- **Listing moderation**: view any listing, deactivate/reactivate regardless of owner.
- **Reports & disputes**: the "Report Abuse" button in messaging used to be fake (showed success, saved nothing) — now really persists reports. Admins can review open reports, mark reviewed, warn, or ban (reusing the same ban mechanism).
- **Verification review**: admin-side approve/reject screen only. **There is still no provider-facing document submission flow** — nothing populates this screen yet in production. Building that upload flow is a separate future project.
- New `admin-user-action` Edge Function handles ban/unban/delete server-side (the only place privileged Supabase Auth admin calls are allowed to run).

Full write-up: [`docs/ADMIN_CAPABILITIES_GUIDE.md`](./ADMIN_CAPABILITIES_GUIDE.md).

---

## ✅ Safety hardening on admin actions

Destructive actions were only one tap + one confirm — same friction as any minor action. Now:
- **Granting admin access** requires typing `GRANT ADMIN` in a warning panel before the button is even tappable — the single most dangerous mistake an admin can make.
- **Banning a user** requires a non-empty reason (was optional) plus a second "are you sure" step.
- **Other role changes** get a second confirmation step, up from one.
- **Unbanning stays one tap on purpose** — undoing a mistake should stay easy; only the harmful actions got harder.

---

## ✅ UI polish

All 8 admin screens now use consistent shared components (`StatusBadge`, `AdminButton`, `AvatarInitial`) instead of one-off styling per screen, plus a gold-glow accent treatment on hero cards/headers/icons to match the rest of the app's existing visual identity, kept restrained to specific spots so it reads as a signature rather than noise everywhere.

---

## ✅ Four launch-blocking bugs fixed

From the original pre-deploy audit:

1. **Saved Searches crashed on tap** — the screen it linked to was declared in navigation types but never actually registered. Also fixed a silent bug where it was reading a database column name (`search_criteria`) that never existed (real column is `filters`) — saved filters were never actually being applied even before the crash.
2. **Seekers couldn't view their own submitted applications** — dead `TODO`, no navigation wired. Built a new read-only detail screen (the existing one is provider-only with approve/reject/block controls that don't belong in front of a seeker).
3. **Fake hardcoded IP address** shown on every application e-signature (`192.168.***.***` for every single user). Now captures a real public IP at signing time, or honestly omits the claim if that fails — never fabricates one.
4. **Delete Account didn't delete anything** — just logged the user out, despite a dialog claiming to require typing "DELETE" (which it never actually collected). Built a real self-service delete Edge Function and a real typed-confirmation modal. Verified end-to-end with a disposable account.

---

## ✅ Dev environment fixes

- `npm run start` was hanging/crashing on a bug in Expo CLI's dependency-version-check network call. Root cause: installed packages had drifted behind the Expo SDK's expected versions. Fixed via `expo install --fix`, verified via a clean `tsc`/Jest run and an actual `expo start` before committing.
- Fixed a real crash (`Cannot read property 'trim' of null`) in the new admin screens — `AvatarInitial` didn't guard against a null `full_name`, which the Verification Review screens hit since `profiles.full_name` has no `NOT NULL` constraint. Found by actually running the app, not by code review.
- Fixed invisible text/icons throughout the entire apply-listing flow (all 4 steps) — `colors.gray` (an object of shades) was being used directly as a color value in 18 places instead of a real shade like `colors.gray[500]`. Found while manually testing the fake-IP fix below; fixed everywhere once found, not just the one spot reported.

---

## ✅ Three RLS security holes closed, plus two adjacent bugs found while fixing them

Same rigor as everything else — each fix verified against the live database with disposable test accounts (attack attempted and confirmed blocked, legitimate use confirmed still works, test data cleaned up).

1. **Provider profiles exposed verification documents/phone/email to any seeker.** Replaced the overly-broad table policy with a narrow `provider_public_profiles` view exposing only name/avatar/username/role. Also narrowed two unrelated `select("*")` calls in `messageService.ts` that were over-fetching full profile rows just to show a chat participant's name.
2. **Providers could rewrite any field of a seeker's application**, including their signature — not just status/notes. Fixed with a column-restricting trigger. Along the way, found `soft_delete_application()` had **no ownership check at all** — any authenticated user could withdraw/delete an application that wasn't theirs. Fixed.
3. **Messages had no edit policy at all on the live database** (contrary to what migration files suggested) — editing/deleting your own message has been silently broken for every real user this whole time, not "too permissive" as originally assumed. Added a proper 24-hour edit window. Along the way, found `add_user_to_read_by()` trusted a client-supplied user ID with no check it matched the real caller — anyone could manipulate anyone else's read receipts. Fixed to always use the real caller's ID.

---

## ⬜ Still open — prioritized

### Security
- [ ] Rate limiting on signup/login is client-side only (`AsyncStorage`) — trivially bypassed by anyone hitting the API directly. Lower priority; not an active data-exposure risk.
- [ ] `messageService.ts`'s `getCachedProfile`/`getBatchProfiles` can still fetch a full profile row (all columns) for any thread participant via the existing "message participants can view each other" policy — narrowed what the app *asks for*, but someone bypassing the app entirely could still pull the full row this way. Lower priority than the fixes above since it requires already being a real conversation partner, not any random user.

### Waiting on someone else
- [ ] **Neil needs to revoke his leaked Management API token** (see item 4 above). Still live as of this session.

### Feature gaps (not launch-blocking, but real)
- [ ] "Saved Searches" has no way to ever create one — there's no "save this search" button anywhere in the app. What was fixed today makes viewing/executing a saved search work correctly *if one exists*, but nothing currently creates one. Separate, bigger feature.
- [ ] Provider verification document submission flow doesn't exist (see admin capabilities section above) — needed before Verification Review has anything real to show.

### Code quality / tech debt (lower priority, safe to defer)
- [ ] `blockingService.ts` has zero tests and **fails open** on a database error (a blocked user's messages could get through if a DB call errors).
- [ ] The hand-maintained Supabase TypeScript types file (`app/src/lib/supabase-types.ts`) is stale and out of sync with the real schema — root cause of the recurring `Argument of type ... not assignable to parameter of type 'never'` errors seen throughout this session. Worth regenerating properly at some point; not urgent since it's a type-checking annoyance, not a runtime bug.
- [ ] Several duplicate/backup files cluttering the repo (`*.backup`, `*.old.ts`, `-fixed.tsx` suffixed files) — safe to delete, just noise.
- [ ] ~537 leftover `console.log` calls across the app, some logging user IDs/emails.
- [ ] Two migrations exist on the live database that were never saved as files in this repo (`apply_username_login_rls_policy`, `add_rate_limits_table`) — means the repo doesn't fully reflect the real schema. Known, deliberately deferred.

---

## Recommended next session

1. Nudge Neil about the token (5 minutes, but real exposure until done) — still the only item left that isn't in our control.
2. Everything else remaining is lower-priority tech debt / feature gaps — safe to tackle opportunistically, nothing else launch-blocking is currently known.
