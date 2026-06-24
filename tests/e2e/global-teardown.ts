import { cleanupE2eEvents } from "./helpers/cleanup";
import { loadEnvTest } from "./helpers/env";

export default async function globalTeardown(): Promise<void> {
  loadEnvTest();
  await cleanupE2eEvents();
}
