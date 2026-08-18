#!/usr/bin/env node
// Validates a project repo's root-level structure against the platform's
// PocketBase conventions (see SKILL.md in this same directory).
// Usage: node .claude/skills/pocketbase-conventions/validate-structure.mjs
// Exit code 0 if no FAILs (WARNs don't affect it), non-zero otherwise.
//
// Only checks the rules settled so far: pb_migrations/ location, and that
// pb_data/ and the pocketbase binary are never committed. pb_hooks/ placement
// and the *_POCKETBASE_URL env var convention aren't checked yet.

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..", "..");

const results = [];
const pass = (msg) => results.push({ level: "PASS", msg });
const fail = (msg) => results.push({ level: "FAIL", msg });

function gitTracked(path) {
  try {
    const out = execSync(`git ls-files -- ${JSON.stringify(path)}`, {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out.length > 0;
  } catch {
    return false; // not a git repo, or git unavailable — can't check, don't block on it
  }
}

function gitIgnored(path) {
  const gitignorePath = join(repoRoot, ".gitignore");
  if (!existsSync(gitignorePath)) return false;
  const lines = readFileSync(gitignorePath, "utf8")
    .split("\n")
    .map((l) => l.trim().replace(/^\/+/, "").replace(/\/+$/, ""));
  return lines.includes(path);
}

// 1. pb_migrations/ must exist at repo root.
if (existsSync(join(repoRoot, "pb_migrations")) && statSync(join(repoRoot, "pb_migrations")).isDirectory()) {
  pass("pb_migrations/ exists at repo root");
} else {
  fail("pb_migrations/ is missing at repo root — the deploy pipeline reads migrations from here");
}

// 2. pb_data/ must never be committed.
if (gitTracked("pb_data")) {
  fail("pb_data/ is tracked in git — remove it (git rm -r --cached pb_data) and gitignore it");
} else if (existsSync(join(repoRoot, "pb_data")) && !gitIgnored("pb_data")) {
  fail("pb_data/ exists but is not in .gitignore — add a 'pb_data' line before it gets committed");
} else {
  pass("pb_data/ is not committed");
}

// 3. pocketbase binary must never be committed.
if (gitTracked("pocketbase")) {
  fail("pocketbase binary is tracked in git — remove it (git rm --cached pocketbase) and gitignore it");
} else if (existsSync(join(repoRoot, "pocketbase")) && !gitIgnored("pocketbase")) {
  fail("pocketbase binary exists but is not in .gitignore — add a 'pocketbase' line before it gets committed");
} else {
  pass("pocketbase binary is not committed");
}

const failed = results.filter((r) => r.level === "FAIL");
const passed = results.filter((r) => r.level === "PASS");
for (const r of results) {
  const icon = r.level === "PASS" ? "✓" : "✗";
  console.log(`${icon} ${r.level}  ${r.msg}`);
}
console.log(`\n${passed.length} passed, ${failed.length} failed`);

process.exit(failed.length > 0 ? 1 : 0);
