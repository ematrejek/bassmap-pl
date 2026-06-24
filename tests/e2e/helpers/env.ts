import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isSupabaseConfigured } from "../../helpers/supabase";

export function loadEnvTest(): void {
  const envPath = resolve(process.cwd(), ".env.test");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/u);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq);
    let value = line.slice(eq + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

export function hasE2eDatabase(): boolean {
  loadEnvTest();
  return isSupabaseConfigured();
}
