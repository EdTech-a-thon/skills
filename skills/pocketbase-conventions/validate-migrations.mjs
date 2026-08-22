#!/usr/bin/env node
// Applies the complete migration history to a disposable empty database.

import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");
const migrationsDir = join(repoRoot, "pb_migrations");
const binary = join(repoRoot, "pocketbase");
const dataDir = mkdtempSync(join(tmpdir(), "pocketbase-migration-test-"));

try {
  const migrations = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".js"))
    .sort();
  const result = spawnSync(
    binary,
    ["migrate", "up", `--dir=${dataDir}`, `--migrationsDir=${migrationsDir}`],
    { cwd: repoRoot, encoding: "utf8" },
  );
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  process.stdout.write(output);

  if (result.error) {
    console.error(`Migration validation could not start: ${result.error.message}`);
    process.exitCode = 1;
  } else if (result.status !== 0 || /^Error:/m.test(output)) {
    console.error("Migration validation failed.");
    process.exitCode = 1;
  } else {
    const missing = migrations.filter((name) => !output.includes(`Applied ${name}`));
    if (missing.length > 0) {
      console.error(`Migration validation did not apply: ${missing.join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log(`Migration validation passed: ${migrations.length} applied.`);
    }
  }
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}
