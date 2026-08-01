export interface Template {
  id: string
  label: string
  cloudConfig: string
}

const BASE = `#cloud-config
package_update: true
packages:
  - curl
  - git
  - vim
  - htop
  - tmux
  - ufw
  - unattended-upgrades
runcmd:
  - [ ufw, allow, 22/tcp ]
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, unattended-upgrades ]
`

const HARDENED = `#cloud-config
package_update: true
packages:
  - fail2ban
  - ufw
  - unattended-upgrades
runcmd:
  - [ ufw, allow, 22/tcp ]
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, fail2ban ]
  - [ systemctl, enable, --now, unattended-upgrades ]
`

const DOCKER = `#cloud-config
package_update: true
packages:
  - docker.io
runcmd:
  - [ systemctl, enable, --now, docker ]
`

const DOCKER_HARDENED = `#cloud-config
package_update: true
packages:
  - docker.io
  - fail2ban
  - ufw
  - unattended-upgrades
runcmd:
  - [ ufw, allow, 22/tcp ]
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, docker ]
  - [ systemctl, enable, --now, fail2ban ]
  - [ systemctl, enable, --now, unattended-upgrades ]
`

const NGINX = `#cloud-config
package_update: true
packages:
  - nginx
  - ufw
runcmd:
  - [ ufw, allow, 22/tcp ]
  - [ ufw, allow, 80/tcp ]
  - [ ufw, allow, 443/tcp ]
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, nginx ]
`

const NODE = `#cloud-config
package_update: true
packages:
  - nodejs
  - npm
`

const POSTGRES = `#cloud-config
package_update: true
packages:
  - postgresql
runcmd:
  - [ systemctl, enable, --now, postgresql ]
`

/**
 * Optional starter recipes — a first-boot config you can use as-is or copy and
 * edit. All apt-only (auditable, no curl|bash) and SSH-safe (ufw allows 22 before
 * it enables, so you never lock yourself out).
 */
export const TEMPLATES: Template[] = [
  { id: "base", label: "base (tools + ufw + auto-updates)", cloudConfig: BASE },
  { id: "hardened", label: "hardened (fail2ban + ufw)", cloudConfig: HARDENED },
  { id: "docker", label: "docker", cloudConfig: DOCKER },
  { id: "docker-hardened", label: "docker + hardened", cloudConfig: DOCKER_HARDENED },
  { id: "nginx", label: "nginx (+ ufw 80/443)", cloudConfig: NGINX },
  { id: "node", label: "node.js + npm", cloudConfig: NODE },
  { id: "postgres", label: "postgresql", cloudConfig: POSTGRES },
]
