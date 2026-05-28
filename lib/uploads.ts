/** Build the public Supabase Storage URL for an uploaded file. */
export function getUploadUrl(filename: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${filename}`;
}
