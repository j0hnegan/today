import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client with the service role key for storage operations.
 * Storage RLS policies are strict — the service role key bypasses them.
 * App-level auth (requireAuth) already guards the upload API routes.
 */
export function storageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key).storage;
}
