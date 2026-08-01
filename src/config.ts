import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "fs"
import { homedir, userInfo } from "os"
import { join } from "path"

/**
 * User-editable settings, persisted to disk. `null` means "not set — fall back
 * to an auto-detected default at resolve time". Nothing here is personal or
 * machine-specific: a fresh install starts from an all-null profile and still
 * runs (the fleet viewer needs no config at all).
 */
export interface PersistedConfig {
  schemaVersion: number
  ansibleDir: string | null
  provisionPlaybook: string
  updatePlaybook: string
  bootstrapUser: string | null
  deployUser: string | null
  sshKey: string | null
  authorizedKeys: string | null
  pollIntervalMs: number
  port: number
}

/** The resolved config the app actually reads (env > file > auto-default). */
export interface Config {
  ansibleDir: string | null
  provisionPlaybook: string
  updatePlaybook: string
  bootstrapUser: string
  deployUser: string
  sshKey: string | null
  authorizedKeys: string
  pollIntervalMs: number
  port: number
}

/** What the current environment actually supports, derived from the config. */
export interface Capabilities {
  /** ansible dir + provision playbook present → the Launch flow can run */
  canProvision: boolean
  /** ansible dir + update playbook present → the constellation sweep can run */
  canUpdate: boolean
  /** a non-empty authorized_keys file exists → `serve` can accept uplinks */
  canServe: boolean
}

const DEFAULT_PERSISTED: PersistedConfig = {
  schemaVersion: 1,
  ansibleDir: null,
  provisionPlaybook: "playbooks/provision-server.yml",
  updatePlaybook: "playbooks/update-all.yml",
  bootstrapUser: null,
  deployUser: null,
  sshKey: null,
  authorizedKeys: null,
  pollIntervalMs: 15000,
  port: 2222,
}

/** ~/.config/groundstation (honours XDG_CONFIG_HOME); shared with the SSH host key. */
export function configDir(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config")
  return join(base, "groundstation")
}

export function configPath(): string {
  return join(configDir(), "config.json")
}

function osUser(): string {
  try {
    return userInfo().username
  } catch {
    return process.env.USER ?? process.env.USERNAME ?? "user"
  }
}

function num(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Expand a leading ~ to the home directory — fs APIs don't do this themselves. */
export function expandHome(p: string): string
export function expandHome(p: null): null
export function expandHome(p: string | null): string | null
export function expandHome(p: string | null): string | null {
  if (!p) return p
  if (p === "~") return homedir()
  if (p.startsWith("~/") || p.startsWith("~\\")) return join(homedir(), p.slice(2))
  return p
}

/** Collapse a persisted profile + environment overrides into a runtime config. */
export function resolveConfig(p: PersistedConfig): Config {
  const home = homedir()
  const user = osUser()
  return {
    ansibleDir: expandHome(process.env.GND_ANSIBLE_DIR ?? p.ansibleDir ?? null),
    provisionPlaybook: process.env.GND_PROVISION_PLAYBOOK ?? p.provisionPlaybook,
    updatePlaybook: process.env.GND_UPDATE_PLAYBOOK ?? p.updatePlaybook,
    bootstrapUser: process.env.GND_BOOTSTRAP_USER ?? p.bootstrapUser ?? user,
    deployUser: process.env.GND_DEPLOY_USER ?? p.deployUser ?? user,
    sshKey: expandHome(process.env.GND_SSH_KEY ?? p.sshKey ?? null),
    authorizedKeys: expandHome(
      process.env.GND_AUTHORIZED_KEYS ?? p.authorizedKeys ?? join(home, ".ssh", "authorized_keys"),
    ),
    pollIntervalMs: num(process.env.GND_POLL_MS, p.pollIntervalMs),
    port: num(process.env.GND_PORT, p.port),
  }
}

export function computeCapabilities(c: Config): Capabilities {
  const dirOk = !!c.ansibleDir && existsSync(c.ansibleDir)
  const has = (rel: string) => dirOk && existsSync(join(c.ansibleDir!, rel))
  let canServe = false
  try {
    canServe = existsSync(c.authorizedKeys) && statSync(c.authorizedKeys).size > 0
  } catch {
    canServe = false
  }
  return {
    canProvision: has(c.provisionPlaybook),
    canUpdate: has(c.updatePlaybook),
    canServe,
  }
}

// --- live singletons -------------------------------------------------------
// Adapters read `config.<field>` at call time, so mutating these objects in
// place (never reassigning the exports) makes edits take effect immediately.

let persisted: PersistedConfig = { ...DEFAULT_PERSISTED }
let firstRun = true

export const config: Config = resolveConfig(persisted)
export const capabilities: Capabilities = computeCapabilities(config)

function apply(next: PersistedConfig): void {
  persisted = next
  Object.assign(config, resolveConfig(next))
  Object.assign(capabilities, computeCapabilities(config))
}

/** Load the on-disk profile (if any) and mark whether this is a first run. */
export function loadConfig(): { firstRun: boolean } {
  const path = configPath()
  if (!existsSync(path)) {
    firstRun = true
    apply({ ...DEFAULT_PERSISTED })
    return { firstRun }
  }
  firstRun = false
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<PersistedConfig>
    apply({ ...DEFAULT_PERSISTED, ...raw, schemaVersion: DEFAULT_PERSISTED.schemaVersion })
  } catch {
    apply({ ...DEFAULT_PERSISTED })
  }
  return { firstRun }
}

/** Merge a patch into the profile, persist it atomically, and re-resolve. */
export function saveConfig(patch: Partial<PersistedConfig>): void {
  const next: PersistedConfig = { ...persisted, ...patch, schemaVersion: DEFAULT_PERSISTED.schemaVersion }
  const dir = configDir()
  mkdirSync(dir, { recursive: true })
  const path = configPath()
  const tmp = `${path}.tmp`
  writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`)
  renameSync(tmp, path)
  firstRun = false
  apply(next)
}

export function getPersisted(): PersistedConfig {
  return { ...persisted }
}

export function isFirstRun(): boolean {
  return firstRun
}

/**
 * Private SSH keys found under ~/.ssh — an entry that either has a matching
 * `.pub` sibling or is a well-known key name. Used to offer a key picker in the
 * setup screen instead of making the user type a path.
 */
export function detectSshKeys(): string[] {
  const dir = join(homedir(), ".ssh")
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const pubs = new Set(entries.filter((e) => e.endsWith(".pub")).map((e) => e.slice(0, -4)))
  const known = new Set(["id_ed25519", "id_rsa", "id_ecdsa", "id_dsa"])
  return entries
    .filter((e) => !e.endsWith(".pub") && (pubs.has(e) || known.has(e)))
    .map((e) => join(dir, e))
    .sort()
}
