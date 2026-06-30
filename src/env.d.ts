/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/vanillajs" />

declare namespace App {
  interface Locals {
    user: import("@supabase/supabase-js").User | null;
    isAdmin: boolean;
    isOrganizer: boolean;
  }
}
