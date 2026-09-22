import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "./supabase-server";

test("server reads allow the explicit local bypass, never production or Vercel", () => {
  const original = { ...process.env };
  try {
    Object.assign(process.env, {
      HUSH_DEV_AUTH: "1",
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
    });
    delete process.env.VERCEL;
    assert.ok(createClient());
    // Without a request scope, the normal cookie client throws. This proves
    // these environments take that path instead of returning a service client.
    for (const guards of [
      { NODE_ENV: "production", VERCEL: "", HUSH_DEV_AUTH: "1" },
      { NODE_ENV: "development", VERCEL: "1", HUSH_DEV_AUTH: "1" },
      { NODE_ENV: "development", VERCEL: "", HUSH_DEV_AUTH: "0" },
    ]) {
      Object.assign(process.env, guards);
      assert.throws(() => createClient(), /request scope/);
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
