// Filesystem layout and host detection.
// All paths derive from a single HOME so tests can point at a throwaway config dir.

import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/** Package root — prompt/, plugin/, skills/, lib/ live here. */
export const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

/** opencode config dir. Override with OPENCODE_PURGE_HOME or OPENCODE_CONFIG_DIR. */
export const HOME =
  process.env.OPENCODE_PURGE_HOME ||
  process.env.OPENCODE_CONFIG_DIR ||
  path.join(os.homedir(), ".config", "opencode")

/** Working directory created inside the config dir. */
export const PURGE = path.join(HOME, "purge")
export const APP_DIR = path.join(PURGE, "app")
export const LAUNCHER = path.join(PURGE, "opencode-purge.mjs")
export const FRAME = path.join(PURGE, "prompt-inject.md")
export const FRAME_MARKER = path.join(PURGE, ".frame.sha256")
export const POLICY = path.join(PURGE, "policy.json")
export const ALLOW = path.join(PURGE, "net-scope-allow.txt")
export const MANIFEST = path.join(PURGE, "manifest.json")
export const DEEP = path.join(PURGE, "deep.json")
export const PRIOR = path.join(PURGE, "config-prior.json")
export const LOG = path.join(PURGE, "purge.log")

export const PLUGIN_DIR = path.join(HOME, "plugins")
// V2 discovers local plugins as directories under plugins/ (index.js or server.js).
// V1 used a flat plugins/opencode-purge.js; keep its path so apply can clean it up.
export const PLUGIN_TARGET = path.join(PLUGIN_DIR, "opencode-purge", "index.js")
export const PLUGIN_LEGACY = path.join(PLUGIN_DIR, "opencode-purge.js")
export const AGENTS = path.join(HOME, "AGENTS.md")

export const MARK_BEGIN = "<!-- opencode-purge:begin -->"
export const MARK_END = "<!-- opencode-purge:end -->"

/** opencode.json / opencode.jsonc inside the config dir. */
export function findConfig() {
  for (const name of ["opencode.json", "opencode.jsonc"]) {
    const p = path.join(HOME, name)
    if (fs.existsSync(p)) return p
  }
  return path.join(HOME, "opencode.json")
}

/** Locate the opencode executable (single-file Bun build, >20 MB). */
export function detectOpenCodeBinary() {
  const candidates = [
    process.env.OPENCODE_BIN,
    path.join(path.dirname(process.execPath), "opencode.exe"),
    path.join(os.homedir(), "AppData", "Roaming", "npm", "node_modules", "opencode-ai", "bin", "opencode.exe"),
    "/usr/local/bin/opencode",
    "/opt/homebrew/bin/opencode",
    path.join(os.homedir(), ".opencode", "bin", "opencode"),
  ].filter(Boolean)

  for (const c of candidates) {
    try {
      const st = fs.statSync(c)
      if (st.isFile() && st.size > 20 * 1024 * 1024) return c
    } catch {
      /* keep looking */
    }
  }
  return ""
}

/** True when an opencode process holds the binary. */
export function runningOpenCode() {
  try {
    const { spawnSync } = require("node:child_process")
    if (process.platform === "win32") {
      const r = spawnSync("tasklist", ["/FI", "IMAGENAME eq opencode.exe", "/NH"], { encoding: "utf8" })
      // Match a real process row; the "no tasks" notice also mentions the image name.
      return /^\s*opencode\.exe\s+\d+/im.test(r.stdout || "")
    }
    return spawnSync("pgrep", ["-x", "opencode"], { encoding: "utf8" }).status === 0
  } catch {
    return false
  }
}
