/**
 * Supabase test client factories for integration tests.
 *
 * Required environment variables (copy from `npx supabase status --output json`):
 * - SUPABASE_URL — local default http://127.0.0.1:54321
 * - SUPABASE_KEY — anon public key (same as app `.env` / `.dev.vars`)
 * - SUPABASE_SERVICE_ROLE_KEY — service_role secret (fixture insert/delete only)
 *
 * Put values in `.env.test`, `.env`, or export in your shell before `npm test`.
 * Integration tests run only against local Supabase (127.0.0.1 / localhost) — never production.
 * Integration suites should use `describe.skipIf(!isSupabaseConfigured())` and
 * call `logSkipIfNotConfigured()` once so missing env exits 0 with a warning.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let skipWarningLogged = false;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

function isLocalSupabaseUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = getEnv("SUPABASE_URL");
  if (!url || !getEnv("SUPABASE_KEY") || !getEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return false;
  }
  return isLocalSupabaseUrl(url);
}

export function logSkipIfNotConfigured(): void {
  if (skipWarningLogged) {
    return;
  }

  const url = getEnv("SUPABASE_URL");
  if (url && !isLocalSupabaseUrl(url)) {
    skipWarningLogged = true;
    // eslint-disable-next-line no-console -- intentional skip notice for developers
    console.warn(
      "Integration tests skipped: SUPABASE_URL must point to local Supabase (127.0.0.1 or localhost), not production.",
    );
    return;
  }

  if (!isSupabaseConfigured()) {
    skipWarningLogged = true;
    // eslint-disable-next-line no-console -- intentional skip notice for developers
    console.warn("Integration tests skipped: local Supabase not configured.");
  }
}

export function createServiceClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for service client");
  }
  if (!isLocalSupabaseUrl(url)) {
    throw new Error("Refusing service client: SUPABASE_URL must be local Supabase, not production");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
}

export function createAnonClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_KEY");
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY are required for anon client");
  }
  if (!isLocalSupabaseUrl(url)) {
    throw new Error("Refusing anon client: SUPABASE_URL must be local Supabase, not production");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as SupabaseClient;
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
