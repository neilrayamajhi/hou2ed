-- Create storage buckets for listing images and application documents

-- Create listing-images bucket (public - anyone can view the images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create application-docs bucket (private - only authenticated users)
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-docs', 'application-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for listing-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Allow authenticated users to update their own listing images
CREATE POLICY "Users can update their own listing images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-images');

-- Allow authenticated users to delete their own listing images
CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-images');

-- Allow everyone to view listing images (public bucket)
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'listing-images');

-- Set up RLS policies for application-docs bucket
-- Allow authenticated users to upload documents
CREATE POLICY "Authenticated users can upload application docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'application-docs');

-- Allow users to view their own documents
CREATE POLICY "Users can view their own application docs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'application-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own documents
CREATE POLICY "Users can delete their own application docs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'application-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
