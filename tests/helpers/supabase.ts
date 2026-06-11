/**
 * Supabase test client factories for integration tests.
 *
 * Required environment variables (copy from `npx supabase status --output json`):
 * - SUPABASE_URL — local default http://127.0.0.1:54321
 * - SUPABASE_KEY — anon public key (same as app `.env` / `.dev.vars`)
 * - SUPABASE_SERVICE_ROLE_KEY — service_role secret (fixture insert/delete only)
 *
 * Put values in `.env.test`, `.env`, or export in your shell before `npm test`.
 * Integration suites should use `describe.skipIf(!isSupabaseConfigured())` and
 * call `logSkipIfNotConfigured()` once so missing env exits 0 with a warning.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let skipWarningLogged = false;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getEnv("SUPABASE_URL") && getEnv("SUPABASE_KEY") && getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

export function logSkipIfNotConfigured(): void {
  if (!isSupabaseConfigured() && !skipWarningLogged) {
    skipWarningLogged = true;
    console.warn("Integration tests skipped: local Supabase not configured.");
  }
}

export function createServiceClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for service client");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY are required for anon client");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createAuthenticatedClient(email: string, password: string): Promise<SupabaseClient> {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY are required for authenticated client");
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }
  return client;
}
