import { expect, test } from "bun:test"
import { parseLine } from "../src/adapters/ansible"
import { TOOLS, detectTool, installCommand } from "../src/adapters/tools"
import { computeCapabilities, config, expandHome, resolveConfig, type PersistedConfig } from "../src/config"
import { summarizeError } from "../src/lib/errors"
import { duration, elapsed, flightCode, regionOf } from "../src/lib/format"
import { lerpHex } from "../src/lib/color"
import { DEFAULT_PROVIDER, getProvider, registeredProviders } from "../src/providers/registry"
import { serverToInstance } from "../src/providers/gcp"
import type { Server } from "../src/domain"

const basePersisted: PersistedConfig = {
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

test("flightCode maps zones to callsigns", () => {
  expect(flightCode("us-central1-a")).toBe("USC1·A")
  expect(flightCode("asia-south1-b")).toBe("ASS1·B")
  expect(flightCode("europe-west4-c")).toBe("EUW4·C")
})

test("regionOf strips the cell", () => {
  expect(regionOf("us-central1-a")).toBe("us-central1")
})

test("duration formats human units", () => {
  expect(duration(500)).toBe("500ms")
  expect(duration(4200)).toBe("4.2s")
  expect(duration(90000)).toBe("1m30s")
})

test("elapsed formats mission time", () => {
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

test("resolveConfig expands ~ in ansibleDir so a tilde path enables provisioning", () => {
  withEnv({ GND_ANSIBLE_DIR: undefined }, () => {
    const c = resolveConfig({ ...basePersisted, ansibleDir: "~/x/ansible" })
    expect(c.ansibleDir?.startsWith("~")).toBe(false)
    expect(c.ansibleDir?.endsWith("/x/ansible")).toBe(true)
  })
})

test("computeCapabilities: no ansible dir disables provisioning + sweep", () => {
  withEnv({ GND_ANSIBLE_DIR: undefined }, () => {
    const caps = computeCapabilities(resolveConfig(basePersisted))
    expect(caps.canProvision).toBe(false)
    expect(caps.canUpdate).toBe(false)
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

test("tool registry covers gcloud/ansible/ssh", () => {
  expect(TOOLS.map((t) => t.id).sort()).toEqual(["ansible", "gcloud", "ssh"])
})

test("detectTool resolves present binaries on PATH and nulls missing ones", () => {
  expect(detectTool({ ...TOOLS[0]!, bin: "sh" }).path).toBeTruthy()
  expect(detectTool({ ...TOOLS[0]!, bin: "definitely-not-a-real-binary-xyz" }).path).toBeNull()
})

test("installCommand is a package-manager command or null (never a curl|bash)", () => {
  const cmd = installCommand(TOOLS.find((t) => t.id === "ansible")!)
  expect(cmd === null || cmd.includes("ansible")).toBe(true)
  if (cmd) expect(cmd).not.toContain("curl")
})

test("parseLine recognises ansible output", () => {
  expect(parseLine("TASK [base : Install essential packages] ****")).toEqual({
    type: "task",
    role: "base",
    name: "Install essential packages",
  })
  expect(parseLine("TASK [Gathering Facts] ***")).toEqual({
    type: "task",
    role: null,
    name: "Gathering Facts",
  })
  expect(parseLine("changed: [lab]")).toEqual({ type: "result", state: "changed", host: "lab" })
  expect(parseLine("ok: [lab]")).toEqual({ type: "result", state: "ok", host: "lab" })
  expect(parseLine("fatal: [lab]: FAILED! => {}")).toMatchObject({ type: "result", state: "failed" })
  expect(parseLine("PLAY RECAP ***")).toEqual({ type: "recap", failures: 0 })
  expect(parseLine("some noise")).toEqual({ type: "log", line: "some noise" })
})

function fakeServer(over: Partial<Server> = {}): Server {
  return {
    id: "1",
    name: "vessel-1",
    status: "RUNNING",
    zone: "us-central1-a",
    region: "us-central1",
    flightCode: "USC1·A",
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

test("GCP listSizes returns pickable machine types", async () => {
  const sizes = await getProvider().listSizes("us-central1")
  expect(sizes.length).toBeGreaterThan(0)
  expect(sizes.every((c) => c.value === c.label)).toBe(true)
  expect(sizes.map((c) => c.value)).toContain("e2-micro")
})

test("GCP listImages encodes imageProject inside the Choice value", async () => {
  const images = await getProvider().listImages("us-central1")
  const debian = images.find((c) => c.label === "debian-12")
  expect(debian?.value).toBe("debian-12|debian-cloud")
  expect(debian?.hint).toBe("debian-cloud")
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

test("GCP sshTarget resolves a reachable vessel and rejects one without an IP", () => {
  const gcp = getProvider()
  const target = gcp.sshTarget(serverToInstance(fakeServer(), "p"))
  expect(target).toEqual({ host: "203.0.113.7", user: config.deployUser, identityFile: config.sshKey })
  expect(gcp.sshTarget(serverToInstance(fakeServer({ externalIp: null }), "p"))).toBeNull()
})
