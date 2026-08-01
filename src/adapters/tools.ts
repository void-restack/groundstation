import type { CliRenderer } from "@opentui/core"
import { platform } from "os"

export type PlatformKey = "darwin" | "linux-apt" | "linux-dnf" | "linux-pacman" | "linux" | "win32"

export interface ToolSpec {
  id: string
  bin: string
  label: string
  purpose: string
  /** true if the whole app needs it; false if it only unlocks some features */
  required: boolean
  docs: string
  /** package-manager command per platform; absent = no safe auto-installer */
  install: Partial<Record<PlatformKey, string>>
}

export interface ToolStatus {
  spec: ToolSpec
  path: string | null
}

export const TOOLS: ToolSpec[] = [
  {
    id: "gcloud",
    bin: "gcloud",
    label: "gcloud",
    purpose: "Google Cloud SDK — lists and launches the fleet",
    required: true,
    docs: "https://cloud.google.com/sdk/docs/install",
    install: { darwin: "brew install --cask google-cloud-sdk" },
  },
  {
    id: "ssh",
    bin: "ssh",
    label: "ssh",
    purpose: "uplink + hardened probe",
    required: false,
    docs: "https://www.openssh.com/",
    install: {
      "linux-apt": "sudo apt-get install -y openssh-client",
      "linux-dnf": "sudo dnf install -y openssh-clients",
      "linux-pacman": "sudo pacman -S --noconfirm openssh",
    },
  },
]

/** The platform + package manager we'll install with. */
export function platformKey(): PlatformKey {
  const p = platform()
  if (p === "darwin") return "darwin"
  if (p === "win32") return "win32"
  if (p === "linux") {
    if (Bun.which("apt-get")) return "linux-apt"
    if (Bun.which("dnf")) return "linux-dnf"
    if (Bun.which("pacman")) return "linux-pacman"
    return "linux"
  }
  return "linux"
}

export function detectTool(spec: ToolSpec): ToolStatus {
  return { spec, path: Bun.which(spec.bin) }
}

export function detectTools(): ToolStatus[] {
  return TOOLS.map(detectTool)
}

/** The install command for this platform, or null if we won't auto-install. */
export function installCommand(spec: ToolSpec): string | null {
  return spec.install[platformKey()] ?? null
}

export interface InstallResult {
  ok: boolean
  message: string
}

/**
 * Run a tool's install command in the *real* terminal (renderer suspended, like
 * uplink) so package-manager output and any sudo prompt work normally. We never
 * edit PATH or shell rc ourselves — the package manager owns placement. Returns
 * a short result for a toast; the caller re-detects afterwards.
 */
export async function installTool(renderer: CliRenderer, spec: ToolSpec): Promise<InstallResult> {
  const cmd = installCommand(spec)
  if (!cmd) return { ok: false, message: `no auto-installer here — see ${spec.docs}` }
  if (cmd.startsWith("brew") && !Bun.which("brew")) {
    return { ok: false, message: "install Homebrew first — https://brew.sh" }
  }

  renderer.suspend()
  try {
    process.stdout.write(`\n\x1b[1m$ ${cmd}\x1b[0m\n\n`)
    const proc = Bun.spawn(["sh", "-c", cmd], { stdin: "inherit", stdout: "inherit", stderr: "inherit" })
    const code = await proc.exited
    return code === 0
      ? { ok: true, message: `${spec.label} installed` }
      : { ok: false, message: `${spec.label} install exited ${code}` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  } finally {
    renderer.resume()
  }
}
