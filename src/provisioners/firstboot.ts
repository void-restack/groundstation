/**
 * First-boot delivery: compose ordered, idempotent bash fragments into one GCP
 * startup-script. Bash (not cloud-init) so it runs on any image via the guest
 * agent. Each producer returns a fragment that is safe to re-run on reboot.
 *
 * buildFirstBoot has two shapes:
 *  - no recipe: guard on /var/lib/gnd-provisioned, run fragments, end with the
 *    GND-PROVISION-DONE marker the launch flow watches for.
 *  - with a bash recipe: run fragments once behind /var/lib/gnd-firstboot, then
 *    append the recipe body verbatim (the recipe keeps its own guard + marker).
 * A user #cloud-config stays as user-data alongside; no cloud-init YAML here.
 */

const SHEBANG = "#!/bin/bash"
const MARKER = 'echo "GND-PROVISION-DONE"'

/** Single-quote a value for safe embedding in bash, escaping embedded quotes. */
function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`
}

export function buildFirstBoot(fragments: string[], recipeBody?: string): string {
  const body = fragments.filter((f) => f.trim())
  const recipe = recipeBody?.trim()
  if (recipe) {
    const guarded = body.length
      ? ["if [ ! -f /var/lib/gnd-firstboot ]; then", ...body, "touch /var/lib/gnd-firstboot", "fi"]
      : []
    return [SHEBANG, ...guarded, "", recipe, ""].join("\n")
  }
  return [
    SHEBANG,
    "[ -f /var/lib/gnd-provisioned ] && exit 0",
    ...body,
    "touch /var/lib/gnd-provisioned",
    MARKER,
    "",
  ].join("\n")
}

/** Export env vars from a login-shell profile drop-in (overwrite = idempotent). */
export function envExports(env: Record<string, string>): string {
  const lines = Object.entries(env).map(([k, v]) => `export ${k}=${shQuote(v)}`)
  return [
    "cat > /etc/profile.d/gnd-env.sh <<'GND_ENV_EOF'",
    ...lines,
    "GND_ENV_EOF",
    "chmod 644 /etc/profile.d/gnd-env.sh",
  ].join("\n")
}

/** apt install the given packages (apt is idempotent; lock timeout survives the boot race). */
export function installPackages(pkgs: string[]): string {
  const apt = "apt-get -o DPkg::Lock::Timeout=600 -y"
  return [
    "export DEBIAN_FRONTEND=noninteractive",
    `${apt} update`,
    `${apt} install ${pkgs.join(" ")}`,
  ].join("\n")
}

/** Set the system hostname (idempotent). */
export function setHostname(hostname: string): string {
  return `hostnamectl set-hostname ${shQuote(hostname)}`
}

/** Set the system timezone (idempotent). */
export function setTimezone(timezone: string): string {
  return `timedatectl set-timezone ${shQuote(timezone)}`
}

/** Create and enable a swapfile of the given size, guarded so a reboot is a no-op. */
export function addSwap(swapMb: number): string {
  const mb = Math.max(1, Math.floor(swapMb))
  return [
    "if [ ! -f /swapfile ]; then",
    `fallocate -l ${mb}M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=${mb}`,
    "chmod 600 /swapfile",
    "mkswap /swapfile",
    "swapon /swapfile",
    "fi",
    "grep -qxF '/swapfile none swap sw 0 0' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab",
  ].join("\n")
}

/** Disable SSH password auth and root login via a drop-in (overwrite = idempotent). */
export function hardenSsh(): string {
  return [
    "install -d -m 755 /etc/ssh/sshd_config.d",
    "cat > /etc/ssh/sshd_config.d/90-gnd-harden.conf <<'GND_SSH_EOF'",
    "PasswordAuthentication no",
    "PermitRootLogin no",
    "GND_SSH_EOF",
    "systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true",
  ].join("\n")
}
