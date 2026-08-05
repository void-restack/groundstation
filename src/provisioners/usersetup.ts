/**
 * Optional login user created at first boot: a named user, optional passwordless
 * sudo, and an authorized public key. Emitted as a bash fragment that buildFirstBoot
 * composes into the startup-script. Every command is idempotent so a reboot re-run
 * is a no-op.
 */

export interface UserSetup {
  username: string
  sudo: boolean
  publicKeyPath: string
}

/** A valid Linux login name: starts with a letter or underscore, then word chars. */
export function validUsername(name: string): boolean {
  return /^[a-z_][a-z0-9_-]{0,31}$/.test(name)
}

/** The bash lines that create the user, grant sudo (optional), and add the key. */
export function userSetupCommands(username: string, sudo: boolean, publicKey: string): string[] {
  const u = username
  const key = publicKey.trim()
  const lines = [`id -u ${u} >/dev/null 2>&1 || useradd -m -s /bin/bash ${u}`]
  if (sudo) {
    lines.push(
      `echo '${u} ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/90-gnd-${u}`,
      `chmod 440 /etc/sudoers.d/90-gnd-${u}`,
    )
  }
  lines.push(
    `install -d -m 700 -o ${u} -g ${u} /home/${u}/.ssh`,
    `touch /home/${u}/.ssh/authorized_keys`,
    `grep -qxF '${key}' /home/${u}/.ssh/authorized_keys || echo '${key}' >> /home/${u}/.ssh/authorized_keys`,
    `chmod 600 /home/${u}/.ssh/authorized_keys`,
    `chown -R ${u}:${u} /home/${u}/.ssh`,
  )
  return lines
}
