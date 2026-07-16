-- CRITICAL FIX: the listing-images storage bucket had INSERT/UPDATE/DELETE
-- policies with literally no ownership check - just `bucket_id =
-- 'listing-images'`. Any authenticated user (any seeker, trivially signed
-- up for free) could delete, overwrite, or upload new files into ANY
-- provider's listing image folder, not just their own.
--
-- Verified live with disposable accounts before this fix: created a
-- listing owned by "Owner", uploaded a real file as Owner, then
-- successfully DELETED that file as an unrelated "Attacker" account with
-- no relationship to the listing at all. Confirmed the file was gone
-- afterward. Cleaned up all test data/accounts after fixing and
-- re-verifying.
--
-- Files are stored under `${listingId}/${fileName}` (see
-- storage.service.ts's uploadListingImage), so ownership is checked by
-- resolving the first path segment back to a listing this caller owns -
-- the same pattern already used correctly for the application-documents
-- bucket's policies.

DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;

CREATE POLICY "Providers can upload images to their own listings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id::text = (storage.foldername(name))[1]
          AND listings.provider_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Providers can update images on their own listings"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id::text = (storage.foldername(name))[1]
          AND listings.provider_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  );

CREATE POLICY "Providers can delete images on their own listings"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.listings
        WHERE listings.id::text = (storage.foldername(name))[1]
          AND listings.provider_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  );

-- Same class of bug, found while auditing every storage bucket after the
-- listing-images fix above: application-documents' two INSERT policies
-- ("Authenticated users can upload documents" and "Users can upload
-- documents") had no path/ownership check at all - any authenticated user
-- could upload a file into ANY application's document folder, not just
-- their own. Verified live with disposable accounts: an unrelated attacker
-- successfully uploaded a fake PDF into another seeker's application
-- folder, and the real seeker's document listing showed it mixed in with
-- their own real documents - meaning a provider reviewing that
-- application would see it too, indistinguishable from a real submission.
-- Files are stored under `${applicationId}/${fileName}` (see
-- storage.service.ts's uploadApplicationDocument), and only seekers
-- upload documents for their own application (confirmed: the only real
-- caller is ApplyWizard.tsx, seeker-only).
--
-- application-docs (note: no "s" on "documents") is a separate, unused
-- legacy bucket - app code exclusively uses application-documents (see
-- APPLICATION_DOCS_BUCKET in storage.service.ts) - but fixed its INSERT
-- policy the same way for consistency/defense-in-depth since it's a live
-- bucket regardless of whether current code calls it.

DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload application docs" ON storage.objects;

CREATE POLICY "Seekers can upload documents to their own applications"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND EXISTS (
      SELECT 1 FROM public.applications
      WHERE applications.id::text = (storage.foldername(name))[1]
        AND applications.seeker_id = auth.uid()
    )
  );

CREATE POLICY "Seekers can upload to their own application-docs folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'application-docs'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
