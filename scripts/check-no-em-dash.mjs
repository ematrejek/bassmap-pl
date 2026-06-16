#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { EM_DASH, findEmDashLocations } from "./lib/no-em-dash.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const IGNORE_DIRS = new Set([
  ".astro",
  ".git",
  "archive",
  "bassmap-pl-ui",
  "dist",
  "node_modules",
  "skills",
]);

const IGNORE_FILES = new Set(["worker-configuration.d.ts", "check-no-em-dash.mjs"]);

/** Docs / config only — `src/` and `tests/` are covered by ESLint `bassmap/no-em-dash`. */
const DOC_EXTENSIONS = new Set([".example", ".md", ".sh", ".toml"]);

const DEFAULT_SCAN_ROOTS = [
  "context/foundation",
  "context/changes",
  "scripts",
  "supabase",
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  ".gitattributes",
  ".env.example",
  ".env.test.example",
];

/**
 * @param {string} dir
 * @param {string[]} files
 */
function collectFiles(dir, files) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      collectFiles(join(dir, entry.name), files);
      continue;
    }

    const filePath = join(dir, entry.name);
    if (IGNORE_FILES.has(entry.name)) {
      continue;
    }

    const extension = extname(entry.name);
    if (DOC_EXTENSIONS.has(extension) || entry.name === ".gitattributes") {
      files.push(filePath);
    }
  }
}

/**
 * @param {string} filePath
 * @returns {string[]}
 */
function checkFile(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (!text.includes(EM_DASH)) {
    return [];
  }

  const rel = relative(ROOT, filePath).replaceAll("\\", "/");
  return findEmDashLocations(text).map(
    ({ line, column }) => `${rel}:${line}:${column}: use en dash (U+2013) instead of em dash (U+2014)`,
  );
}

/**
 * @param {string[]} argvFiles
 * @returns {string[]}
 */
function resolveFiles(argvFiles) {
  if (argvFiles.length > 0) {
    return argvFiles.map((file) => resolve(ROOT, file));
  }

  /** @type {string[]} */
  const files = [];
  for (const target of DEFAULT_SCAN_ROOTS) {
    const absolute = join(ROOT, target);
    try {
      const stats = statSync(absolute);
      if (stats.isDirectory()) {
        collectFiles(absolute, files);
      } else {
        files.push(absolute);
      }
    } catch {
      // Optional paths may be absent in some checkouts.
    }
  }
  return files;
}

const violations = resolveFiles(process.argv.slice(2)).flatMap((filePath) => checkFile(filePath));

if (violations.length > 0) {
  console.error("Em dash (U+2014) found. Use en dash (U+2013) instead:\n");
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  process.exit(1);
}
