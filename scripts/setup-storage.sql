-- Create the Supabase Storage bucket for file uploads.
-- Run this once in the Supabase SQL Editor or via the Dashboard.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv', 'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies — allow all authenticated and anon uploads/reads/deletes.
-- App-level auth (requireAuth middleware) protects the API routes, so these
-- policies are permissive by design.

CREATE POLICY "Allow uploads" ON storage.objects
  FOR INSERT TO authenticated, anon
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Allow reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'attachments');

CREATE POLICY "Allow deletes" ON storage.objects
  FOR DELETE TO authenticated, anon
  USING (bucket_id = 'attachments');

CREATE POLICY "Allow updates" ON storage.objects
  FOR UPDATE TO authenticated, anon
  USING (bucket_id = 'attachments');
