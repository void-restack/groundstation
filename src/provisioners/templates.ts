export interface Template {
  id: string
  label: string
  cloudConfig: string
}

const DOCKER = `#cloud-config
package_update: true
packages:
  - docker.io
runcmd:
  - [ systemctl, enable, --now, docker ]
`

const HARDENED = `#cloud-config
package_update: true
package_upgrade: true
packages:
  - fail2ban
  - ufw
  - unattended-upgrades
runcmd:
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, fail2ban ]
  - [ systemctl, enable, --now, unattended-upgrades ]
`

const DOCKER_HARDENED = `#cloud-config
package_update: true
package_upgrade: true
packages:
  - docker.io
  - fail2ban
  - ufw
  - unattended-upgrades
runcmd:
  - [ ufw, --force, enable ]
  - [ systemctl, enable, --now, docker ]
  - [ systemctl, enable, --now, fail2ban ]
  - [ systemctl, enable, --now, unattended-upgrades ]
`

/** Optional starter recipes — a first-boot config you can use as-is or copy and edit. */
export const TEMPLATES: Template[] = [
  { id: "docker", label: "docker", cloudConfig: DOCKER },
  { id: "hardened", label: "hardened (fail2ban + ufw)", cloudConfig: HARDENED },
  { id: "docker-hardened", label: "docker + hardened", cloudConfig: DOCKER_HARDENED },
]
