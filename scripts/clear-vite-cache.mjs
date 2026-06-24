import { rmSync } from "node:fs";
import { join } from "node:path";

const viteCache = join(process.cwd(), "node_modules", ".vite");

rmSync(viteCache, { recursive: true, force: true });
console.log("Cleared Vite dependency cache:", viteCache);
