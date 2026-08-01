export interface Template {
  id: string
  label: string
  content: string
}

/**
 * Built as a GCP startup-script (bash) rather than cloud-init user-data: the
 * guest agent runs startup-scripts on every GCP image as root, so it doesn't
 * depend on the image shipping cloud-init or reading user-data. Run-once guard,
 * an apt lock wait (survives the first-boot apt-daily race), and a completion
 * marker the launch flow watches for on the serial console.
 */
function script(pkgs: string[], cmds: string[]): string {
  return [
    "#!/bin/bash",
    "[ -f /var/lib/gnd-provisioned ] && exit 0",
    "export DEBIAN_FRONTEND=noninteractive",
    'APT="apt-get -o DPkg::Lock::Timeout=600 -y"',
    "$APT update",
    `$APT install ${pkgs.join(" ")}`,
    ...cmds,
    "touch /var/lib/gnd-provisioned",
    'echo "GND-PROVISION-DONE"',
    "",
  ].join("\n")
}

const UFW = ["ufw allow 22/tcp", "ufw --force enable"]

const BASE = script(
  ["curl", "git", "vim", "htop", "tmux", "ufw", "unattended-upgrades"],
  [...UFW, "systemctl enable --now unattended-upgrades"],
)
const HARDENED = script(
  ["fail2ban", "ufw", "unattended-upgrades"],
  [...UFW, "systemctl enable --now fail2ban unattended-upgrades"],
)
const DOCKER = script(["docker.io"], ["systemctl enable --now docker"])
const DOCKER_HARDENED = script(
  ["docker.io", "fail2ban", "ufw", "unattended-upgrades"],
  [...UFW, "systemctl enable --now docker fail2ban unattended-upgrades"],
)
const NGINX = script(
  ["nginx", "ufw"],
  ["ufw allow 22/tcp", "ufw allow 80/tcp", "ufw allow 443/tcp", "ufw --force enable", "systemctl enable --now nginx"],
)
const NODE = script(["nodejs", "npm"], [])
const POSTGRES = script(["postgresql"], ["systemctl enable --now postgresql"])

/** Optional starter recipes — use as-is or copy and edit. SSH-safe (ufw allows 22 before enable). */
export const TEMPLATES: Template[] = [
  { id: "base", label: "base (tools + ufw + auto-updates)", content: BASE },
  { id: "hardened", label: "hardened (fail2ban + ufw)", content: HARDENED },
  { id: "docker", label: "docker", content: DOCKER },
  { id: "docker-hardened", label: "docker + hardened", content: DOCKER_HARDENED },
  { id: "nginx", label: "nginx (+ ufw 80/443)", content: NGINX },
  { id: "node", label: "node.js + npm", content: NODE },
  { id: "postgres", label: "postgresql", content: POSTGRES },
]
