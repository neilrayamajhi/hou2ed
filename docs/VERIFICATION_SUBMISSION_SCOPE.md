# Provider Verification Submission — Scope

**Status: deferred to v2.** Owner-confirmed not launch-blocking for v1 — nothing in the app or its App Store listing claims providers are verified, so shipping without this isn't a broken promise. This doc is the build plan for whenever v2 work picks it up.

## Current state (confirmed this session)

The admin side of provider verification is fully built: [VerificationReviewList.tsx](../app/src/screens/Admin/VerificationReviewList.tsx) and [VerificationReviewDetail.tsx](../app/src/screens/Admin/VerificationReviewDetail.tsx) let an admin approve/reject a pending provider, backed by real `profiles.verification_status`/`verification_documents` columns and a working `verification.service.ts`.

There is **no submission side** — nothing anywhere in the app writes to `verification_status` or `verification_documents`. They're real, live columns, but every provider's `verification_status` is permanently `null`/`unsubmitted`, so the admin review screen has nothing to show. This was a deliberate scope decision in the original admin-capabilities plan ("building a provider-facing upload flow is a separate future project"), reconfirmed here rather than tacked on as a rushed addition to this session's tech-debt batch.

This doc scopes the remaining work concretely enough to implement directly, reusing patterns already proven elsewhere in the codebase rather than inventing new ones.

## What to build

### 1. Storage bucket + RLS

A private bucket for verification documents, mirroring the existing `APPLICATION_DOCS_BUCKET` pattern in [storage.service.ts](../app/src/services/storage.service.ts):
- New bucket, e.g. `verification-documents`, private (not public).
- Storage RLS: a provider can upload/read only under their own `auth.uid()` path prefix; admins can read any path (reuse `public.is_admin(auth.uid())`, the same helper every admin policy this session already uses).
- Path scheme matching the existing convention: `${userId}/${fileName}`.

### 2. Service function

Add `uploadVerificationDocument(uri, documentType)` to `storage.service.ts`, copying `uploadApplicationDocument`'s file-reading logic (lines 233-361 — handles web blob vs. React Native `FileSystem.readAsStringAsync` base64 path, size/type validation via the existing `validateDocumentFile`) but targeting the new bucket and a path keyed by the current user's id instead of an application id.

Add `submitVerificationDocuments(documents: Array<{type: string; path: string}>)` to a provider-facing counterpart of `verification.service.ts` (or extend it) that:
- Writes the uploaded document paths into `profiles.verification_documents` (JSONB array).
- Sets `profiles.verification_status = 'pending'`.

This second write needs a **new migration**: today only admins can update `verification_status` (the `prevent_verification_self_escalation` trigger from `20260714100100_prevent_verification_self_escalation.sql` blocks a user from setting their own status to `'verified'`, but should explicitly allow a user setting their own status from `unsubmitted`/`rejected` to `pending` — self-submitting for review, not self-approving). Check that trigger's exact condition before writing the new one; it may already allow this if it only blocks transitions *to* `'verified'`.

### 3. UI

New screen, e.g. `app/src/screens/Provider/VerificationSubmission.tsx`, reachable from the provider's profile/dashboard:
- Document type picker (whatever categories the business actually wants verified — e.g. business license, nonprofit determination letter, ID) + file/image picker (reuse whatever picker component `Step3Documents.tsx` in the application wizard already uses for a proven, working pattern).
- Upload progress + per-document status.
- Submit button that calls `submitVerificationDocuments`, then shows a clear "Under Review" state (mirroring how `VerificationReviewList.tsx`'s empty state already explains the pending-review concept from the admin side).
- A read-only "Verification Status" section on the provider's profile showing their current `verification_status` (unsubmitted / pending / verified / rejected), so it isn't a black box after submitting.

### 4. Navigation

Add the route to `RootStackParamList` (`navigation/types.ts`) and register it in `RootNavigator.tsx`, same mechanical pattern as every other screen added this session (see `PrivacyPolicy`/`TermsOfService` for the most recent example).

## Why this wasn't built in this session's tech-debt batch

Everything else in this batch was either a bug fix (real, already-broken behavior) or a small, self-contained addition (Saved Search creation UI reused an already-complete backend function with zero new infrastructure). This is a full new feature requiring a new storage bucket, new RLS policies, a new migration, and a multi-step upload UI — proportionate to its own planning/review pass, not a same-session add-on. The scope above is grounded in the codebase's actual existing patterns (`storage.service.ts`, `Step3Documents.tsx`, `verification.service.ts`, the `is_admin()` RLS convention) so it can be implemented directly without re-discovering them.
