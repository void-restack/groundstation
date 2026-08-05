import { expect, test } from "bun:test"
import { TOOLS, detectTool, installCommand } from "../src/adapters/tools"
import { config, expandHome, resolveConfig, type PersistedConfig } from "../src/config"
import { summarizeError } from "../src/lib/errors"
import { duration, elapsed, regionOf } from "../src/lib/format"
import { lerpHex } from "../src/lib/color"
import { DEFAULT_PROVIDER, getProvider, registeredProviders } from "../src/providers/registry"
import { lifecycleArgs, serverToInstance } from "../src/providers/gcp"
import { createArgs } from "../src/adapters/gcloud"
import { zoneLocation } from "../src/lib/geo"
import { parseLabels } from "../src/lib/parse"
import { confirm, resolveConfirm } from "../src/state/confirm"
import { runOp } from "../src/state/oprunner"
import { getProvisioner, registeredProvisioners } from "../src/provisioners/registry"
import { TEMPLATES } from "../src/provisioners/templates"
import { userSetupCommands, validUsername } from "../src/provisioners/usersetup"
import {
  addSwap,
  buildFirstBoot,
  envExports,
  hardenSsh,
  installPackages,
  setHostname,
  setTimezone,
} from "../src/provisioners/firstboot"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import type { Server } from "../src/domain"

const basePersisted: PersistedConfig = {
  schemaVersion: 1,
  cloudInitFile: null,
  shellScript: null,
  deployUser: null,
  sshKey: null,
  authorizedKeys: null,
  pollIntervalMs: 15000,
  port: 2222,
}

/** Run `fn` with the given GND_* vars temporarily cleared/overridden, then restore. */
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k]
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
  try {
    fn()
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

test("regionOf strips the cell", () => {
  expect(regionOf("us-central1-a")).toBe("us-central1")
})

test("duration formats human units", () => {
  expect(duration(500)).toBe("500ms")
  expect(duration(4200)).toBe("4.2s")
  expect(duration(90000)).toBe("1m30s")
})

test("elapsed formats duration", () => {
  const base = new Date(0)
  expect(elapsed(base, 3661_000)).toBe("01:01:01")
  expect(elapsed(base, 90000_000)).toBe("1d 01:00")
})

test("lerpHex interpolates endpoints", () => {
  expect(lerpHex("#000000", "#ffffff", 0)).toBe("#000000")
  expect(lerpHex("#000000", "#ffffff", 1)).toBe("#ffffff")
})

test("resolveConfig: env > file > auto-detected default", () => {
  withEnv({ GND_DEPLOY_USER: "envuser" }, () => {
    expect(resolveConfig({ ...basePersisted, deployUser: "fileuser" }).deployUser).toBe("envuser")
  })
  withEnv({ GND_DEPLOY_USER: undefined }, () => {
    expect(resolveConfig({ ...basePersisted, deployUser: "fileuser" }).deployUser).toBe("fileuser")
    // unset everywhere → current OS user, which is always a non-empty string
    expect(resolveConfig(basePersisted).deployUser.length).toBeGreaterThan(0)
  })
})

test("resolveConfig: sshKey stays null when unset, so ssh uses its own agent/config", () => {
  withEnv({ GND_SSH_KEY: undefined }, () => {
    expect(resolveConfig(basePersisted).sshKey).toBeNull()
    expect(resolveConfig({ ...basePersisted, sshKey: "/keys/id_ed25519" }).sshKey).toBe("/keys/id_ed25519")
  })
})

test("resolveConfig: authorizedKeys defaults to the standard file, not a personal pubkey", () => {
  withEnv({ GND_AUTHORIZED_KEYS: undefined }, () => {
    expect(resolveConfig(basePersisted).authorizedKeys.endsWith("/.ssh/authorized_keys")).toBe(true)
  })
})

test("expandHome expands a leading ~ so existsSync-based checks work", () => {
  const r = expandHome("~/dotfiles/ansible")
  expect(r.startsWith("~")).toBe(false)
  expect(r.endsWith("/dotfiles/ansible")).toBe(true)
  expect(expandHome("/abs/path")).toBe("/abs/path")
  expect(expandHome(null)).toBeNull()
})

test("resolveConfig expands ~ in cloudInitFile so a tilde path resolves", () => {
  withEnv({ GND_CLOUD_INIT: undefined }, () => {
    const c = resolveConfig({ ...basePersisted, cloudInitFile: "~/x/cloud.yml" })
    expect(c.cloudInitFile?.startsWith("~")).toBe(false)
    expect(c.cloudInitFile?.endsWith("/x/cloud.yml")).toBe(true)
  })
})

test("summarizeError collapses a multi-line gcloud auth dump to an actionable hint", () => {
  const raw =
    "WARNING: Python 3.9 will be deprecated.\n" +
    "ERROR: (gcloud.compute.instances.list) There was a problem refreshing your current auth tokens: Reauthentication failed.\n" +
    "Please run:\n  $ gcloud auth login"
  const { title, message } = summarizeError(raw)
  expect(title).toBe("gcloud auth expired")
  expect(message).toContain("gcloud auth login")
  expect(message.split("\n").length).toBe(1)
})

test("summarizeError falls back to the first ERROR line, trimmed", () => {
  const { title, message } = summarizeError("noise\nERROR: (gcloud.x) quota exceeded for region\nmore noise")
  expect(title).toBe("fleet error")
  expect(message).toBe("quota exceeded for region")
})

test("tool registry covers gcloud/ssh", () => {
  expect(TOOLS.map((t) => t.id).sort()).toEqual(["gcloud", "ssh"])
})

test("detectTool resolves present binaries on PATH and nulls missing ones", () => {
  expect(detectTool({ ...TOOLS[0]!, bin: "sh" }).path).toBeTruthy()
  expect(detectTool({ ...TOOLS[0]!, bin: "definitely-not-a-real-binary-xyz" }).path).toBeNull()
})

test("installCommand is a package-manager command or null (never a curl|bash)", () => {
  for (const t of TOOLS) {
    const cmd = installCommand(t)
    if (cmd) {
      expect(cmd).not.toContain("curl")
      expect(cmd).not.toContain("| bash")
    }
  }
})

function fakeServer(over: Partial<Server> = {}): Server {
  return {
    id: "1",
    name: "vm-1",
    status: "RUNNING",
    zone: "us-central1-a",
    region: "us-central1",
    machineType: "e2-micro",
    externalIp: "203.0.113.7",
    internalIp: "10.0.0.2",
    createdAt: new Date(0),
    hardened: "unknown",
    ...over,
  }
}

test("registry exposes GCP as the sole registered provider", () => {
  expect(DEFAULT_PROVIDER).toBe("gcp")
  expect(registeredProviders().map((p) => p.id)).toEqual(["gcp"])
  const gcp = getProvider()
  expect(gcp.id).toBe("gcp")
  expect(gcp.cliBin).toBe("gcloud")
  expect(getProvider("gcp")).toBe(gcp)
})

test("registry throws for an unregistered provider", () => {
  expect(() => getProvider("aws")).toThrow(/not registered/)
})

test("GCP createFields drives a zone/size/image launch form", () => {
  expect(getProvider().createFields().map((f) => f.key)).toEqual(["zone", "size", "image"])
})

test("serverToInstance normalizes a GCP Server into an Instance", () => {
  const inst = serverToInstance(fakeServer(), "my-project")
  expect(inst.provider).toBe("gcp")
  expect(inst.state).toBe("running")
  expect(inst.rawState).toBe("RUNNING")
  expect(inst.account).toBe("my-project")
  expect(inst.size).toBe("e2-micro")
  expect(inst.zone).toBe("us-central1-a")
  expect(inst.region).toBe("us-central1")
  expect(serverToInstance(fakeServer({ status: "TERMINATED" }), "p").state).toBe("terminated")
})

test("confirm resolves via resolveConfirm and a new request cancels the pending one", async () => {
  const p = confirm({ title: "stop?", message: "halts compute", mode: "yn" })
  resolveConfirm(true)
  expect(await p).toBe(true)

  const first = confirm({ title: "a", message: "m", mode: "yn" })
  const second = confirm({ title: "b", message: "m", mode: "yn" })
  expect(await first).toBe(false) // superseded → auto-cancelled
  resolveConfirm(false)
  expect(await second).toBe(false)
})

test("runOp reports success, captures thrown errors as failure", async () => {
  const seen: string[] = []
  const ok = await runOp("stop · vm-1", async (log) => {
    log("stopping…")
    seen.push("ran")
  })
  expect(ok).toBe(true)
  expect(seen).toEqual(["ran"])

  const bad = await runOp("delete · vm-1", async () => {
    throw new Error("boom")
  })
  expect(bad).toBe(false)
})

test("provisioner registry: none is a no-op, cloud-init injects at create", () => {
  expect(registeredProvisioners().map((p) => p.kind).sort()).toEqual([
    "cloud-init", "command", "none", "shell",
  ])
  const none = getProvisioner("none")
  expect(none.injectsAtCreate).toBe(false)
  expect(none.buildCreatePayload).toBeUndefined()
  expect(getProvisioner("cloud-init").injectsAtCreate).toBe(true)
  expect(getProvisioner("shell").requiresTool).toBe("ssh")
})

test("shell provisioner fails cleanly when the profile has no script", async () => {
  const inst = serverToInstance(fakeServer(), "p")
  const ok = await getProvisioner("shell").run!(
    { instance: inst, profile: { name: "x", kind: "shell" }, provider: getProvider() },
    () => {},
  )
  expect(ok).toBe(false)
})

test("cloud-init resolves the user-provided config file into a user-data payload", () => {
  const dir = mkdtempSync(join(tmpdir(), "gnd-ci-"))
  const file = join(dir, "cloud.yml")
  writeFileSync(file, "#cloud-config\npackages:\n  - docker.io\n  - fail2ban\n")
  try {
    const payload = getProvisioner("cloud-init").buildCreatePayload!({
      name: "docker-host",
      kind: "cloud-init",
      userData: file,
    })
    expect(payload.key).toBe("user-data")
    expect(payload.value).toBe(file)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("built-in templates are runnable startup scripts (docker, hardened) with a done marker", () => {
  const ids = TEMPLATES.map((t) => t.id)
  expect(ids).toContain("docker")
  expect(ids).toContain("hardened")
  for (const t of TEMPLATES) {
    expect(t.content.startsWith("#!/bin/bash")).toBe(true)
    expect(t.content).toContain("GND-PROVISION-DONE")
  }
})

test("every ufw-enabling template allows ssh (22) BEFORE enabling — never lock out", () => {
  for (const t of TEMPLATES) {
    const enable = t.content.indexOf("ufw --force enable")
    if (enable === -1) continue
    const allow22 = t.content.indexOf("ufw allow 22/tcp")
    expect(allow22).toBeGreaterThanOrEqual(0)
    expect(allow22).toBeLessThan(enable)
  }
})

test("cloud-init routes a bash recipe to startup-script, a #cloud-config to user-data", () => {
  const recipe = getProvisioner("cloud-init").buildCreatePayload!({
    name: "docker", kind: "cloud-init", userDataContent: TEMPLATES[0]!.content,
  })
  expect(recipe.key).toBe("startup-script")
  expect(readFileSync(recipe.value, "utf8")).toContain("GND-PROVISION-DONE")

  const cloud = getProvisioner("cloud-init").buildCreatePayload!({
    name: "ci", kind: "cloud-init", userDataContent: "#cloud-config\npackages: [htop]\n",
  })
  expect(cloud.key).toBe("user-data")
})

test("cloud-init rejects a missing user-data file with a clear error", () => {
  expect(() =>
    getProvisioner("cloud-init").buildCreatePayload!({ name: "x", kind: "cloud-init", userData: "/no/such/file.yml" }),
  ).toThrow(/not found/)
})

test("validUsername accepts linux names and rejects bad ones", () => {
  expect(validUsername("deploy")).toBe(true)
  expect(validUsername("web_1")).toBe(true)
  expect(validUsername("1web")).toBe(false)
  expect(validUsername("bad name")).toBe(false)
  expect(validUsername("rm;rf")).toBe(false)
})

test("userSetupCommands creates the user, adds the key, and gates sudo on the flag", () => {
  const withSudo = userSetupCommands("deploy", true, "ssh-ed25519 AAAA deploy@host").join("\n")
  expect(withSudo).toContain("useradd -m -s /bin/bash deploy")
  expect(withSudo).toContain("/etc/sudoers.d/90-gnd-deploy")
  expect(withSudo).toContain("ssh-ed25519 AAAA deploy@host")
  expect(withSudo).toContain("authorized_keys")

  const noSudo = userSetupCommands("deploy", false, "ssh-ed25519 AAAA").join("\n")
  expect(noSudo).not.toContain("sudoers")
})

test("buildFirstBoot without a recipe guards on gnd-provisioned and ends with the marker", () => {
  const frag = userSetupCommands("deploy", true, "ssh-ed25519 AAAA").join("\n")
  const script = buildFirstBoot([frag])
  expect(script.startsWith("#!/bin/bash")).toBe(true)
  expect(script).toContain("[ -f /var/lib/gnd-provisioned ] && exit 0")
  expect(script).toContain("useradd -m -s /bin/bash deploy")
  expect(script).toContain("touch /var/lib/gnd-provisioned")
  expect(script).toContain("GND-PROVISION-DONE")
})

test("buildFirstBoot with a bash recipe runs fragments once then appends the recipe verbatim", () => {
  const recipe = TEMPLATES.find((t) => t.id === "docker")!.content
  const frag = userSetupCommands("deploy", true, "ssh-ed25519 AAAA").join("\n")
  const script = buildFirstBoot([frag], recipe)
  expect(script.startsWith("#!/bin/bash")).toBe(true)
  // fragments guarded so they run only once
  expect(script).toContain("if [ ! -f /var/lib/gnd-firstboot ]; then")
  expect(script).toContain("touch /var/lib/gnd-firstboot")
  expect(script).toContain("useradd -m -s /bin/bash deploy")
  // recipe body kept whole, with its own guard + marker (not duplicated by us)
  expect(script).toContain("docker.io")
  expect(script).toContain("[ -f /var/lib/gnd-provisioned ] && exit 0")
  expect(script).toContain("GND-PROVISION-DONE")
  expect(script).not.toContain("touch /var/lib/gnd-provisioned\ntouch /var/lib/gnd-provisioned")
})

test("buildFirstBoot with no fragments and a recipe passes the recipe through unguarded", () => {
  const recipe = TEMPLATES.find((t) => t.id === "base")!.content
  const script = buildFirstBoot([], recipe)
  expect(script.startsWith("#!/bin/bash")).toBe(true)
  expect(script).not.toContain("gnd-firstboot")
  expect(script).toContain("GND-PROVISION-DONE")
})

test("first-boot producers emit idempotent bash for each setup field", () => {
  const env = envExports({ NODE_ENV: "production", API_URL: "https://api.example.com" })
  expect(env).toContain("/etc/profile.d/gnd-env.sh")
  expect(env).toContain("export NODE_ENV='production'")

  const pkgs = installPackages(["htop", "git"])
  expect(pkgs).toContain("apt-get")
  expect(pkgs).toContain("install htop git")

  expect(setHostname("web-1")).toContain("hostnamectl set-hostname 'web-1'")
  expect(setTimezone("Asia/Kolkata")).toContain("timedatectl set-timezone 'Asia/Kolkata'")

  const swap = addSwap(2048)
  expect(swap).toContain("if [ ! -f /swapfile ]; then")
  expect(swap).toContain("2048M")
  expect(swap).toContain("/etc/fstab")

  const harden = hardenSsh()
  expect(harden).toContain("PasswordAuthentication no")
  expect(harden).toContain("PermitRootLogin no")
})

test("envExports single-quotes a value that itself contains a quote (no bash injection)", () => {
  const env = envExports({ MSG: "it's fine" })
  expect(env).toContain(`export MSG='it'\\''s fine'`)
})

test("zoneLocation maps a zone to its city so pickers are searchable by name", () => {
  expect(zoneLocation("asia-south1-a")).toBe("Mumbai")
  expect(zoneLocation("us-central1-b")).toBe("Iowa")
  expect(zoneLocation("europe-west2-c")).toBe("London")
  expect(zoneLocation("nonexistent-zone-x")).toBeUndefined()
})

test("createArgs adds boot-disk size, network tags, and cloud-init metadata when set", () => {
  const full = createArgs({
    name: "x", zone: "us-central1-a", machineType: "e2-micro",
    imageFamily: "debian-12", imageProject: "debian-cloud",
    diskSizeGb: 50, diskType: "pd-ssd", spot: true,
    tags: ["http-server", "https-server"], userDataFile: "/tmp/c.yml",
  })
  expect(full).toContain("--boot-disk-size=50GB")
  expect(full).toContain("--boot-disk-type=pd-ssd")
  expect(full).toContain("--provisioning-model=SPOT")
  expect(full).toContain("--tags=http-server,https-server")
  expect(full).toContain("user-data=/tmp/c.yml")
  expect(full).toContain("--machine-type=e2-micro")

  const bare = createArgs({
    name: "x", zone: "z", machineType: "m", imageFamily: "f", imageProject: "p",
  })
  expect(bare.some((a) => a.startsWith("--boot-disk-size"))).toBe(false)
  expect(bare.some((a) => a.startsWith("--tags"))).toBe(false)
  expect(bare.some((a) => a.startsWith("--provisioning-model"))).toBe(false)
})

test("parseLabels reads k=v pairs and skips malformed tokens", () => {
  expect(parseLabels("env=prod team=core")).toEqual({ env: "prod", team: "core" })
  expect(parseLabels("  env=prod   team=core  ")).toEqual({ env: "prod", team: "core" })
  expect(parseLabels("")).toEqual({})
  expect(parseLabels("noeq bad= =noval keep=me")).toEqual({ "bad": "", keep: "me" })
  // a value may contain an '=' (only the first splits)
  expect(parseLabels("url=a=b")).toEqual({ url: "a=b" })
})

test("createArgs emits labels, service account, and scopes when set", () => {
  const args = createArgs({
    name: "x", zone: "z", machineType: "e2-micro", imageFamily: "f", imageProject: "p",
    labels: { env: "prod", team: "core" },
    serviceAccount: "sa@my-project.iam.gserviceaccount.com",
    scopes: "cloud-platform",
  })
  expect(args).toContain("--labels=env=prod,team=core")
  expect(args).toContain("--service-account=sa@my-project.iam.gserviceaccount.com")
  expect(args).toContain("--scopes=cloud-platform")
})

test("createArgs maps the locked scope sentinel to --no-scopes, omits flags when unset", () => {
  const locked = createArgs({
    name: "x", zone: "z", machineType: "m", imageFamily: "f", imageProject: "p", scopes: "no-scopes",
  })
  expect(locked).toContain("--no-scopes")
  expect(locked.some((a) => a.startsWith("--scopes"))).toBe(false)

  const bare = createArgs({ name: "x", zone: "z", machineType: "m", imageFamily: "f", imageProject: "p" })
  expect(bare.some((a) => a.startsWith("--labels"))).toBe(false)
  expect(bare.some((a) => a.startsWith("--service-account"))).toBe(false)
  expect(bare.some((a) => a.startsWith("--scopes"))).toBe(false)
  expect(bare.some((a) => a.startsWith("--no-scopes"))).toBe(false)
})

test("createArgs uses custom cpu/memory instead of a machine type when set", () => {
  const custom = createArgs({
    name: "x", zone: "z", machineType: "ignored",
    imageFamily: "f", imageProject: "p", customCpu: 4, customMemoryGb: 8,
  })
  expect(custom).toContain("--custom-cpu=4")
  expect(custom).toContain("--custom-memory=8GB")
  expect(custom.some((a) => a.startsWith("--machine-type"))).toBe(false)
})

test("lifecycleArgs builds a zoned, --quiet gcloud command (no TTY prompt)", () => {
  const inst = serverToInstance(fakeServer(), "p")
  expect(lifecycleArgs("stop", inst)).toEqual([
    "gcloud", "compute", "instances", "stop", "vm-1", "--zone=us-central1-a", "--quiet",
  ])
  // --quiet is the correctness catch: delete would otherwise hang on a stdin prompt
  expect(lifecycleArgs("delete", inst)).toContain("--quiet")
  // a zoneless instance omits the flag rather than sending --zone=null
  const zoneless = serverToInstance(fakeServer(), "p")
  zoneless.zone = null
  expect(lifecycleArgs("start", zoneless).some((a) => a.startsWith("--zone"))).toBe(false)
})

test("GCP sshTarget resolves a reachable instance and rejects one without an IP", () => {
  const gcp = getProvider()
  const target = gcp.sshTarget(serverToInstance(fakeServer(), "p"))
  expect(target).toEqual({ host: "203.0.113.7", user: config.deployUser, identityFile: config.sshKey })
  expect(gcp.sshTarget(serverToInstance(fakeServer({ externalIp: null }), "p"))).toBeNull()
})
