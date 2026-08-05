/**
 * Optional login user created at first boot: a named user, optional passwordless
 * sudo, and an authorized public key. Runs as a bash startup-script, either on
 * its own or merged ahead of a recipe. Every command is idempotent so a reboot
 * re-run is a no-op.
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

const SHEBANG = "#!/bin/bash"

/** User setup as its own startup-script, ending with the completion marker. */
export function standaloneUserSetup(username: string, sudo: boolean, publicKey: string): string {
  return [SHEBANG, ...userSetupCommands(username, sudo, publicKey), 'echo "GND-PROVISION-DONE"', ""].join("\n")
}

/** User setup prepended to a bash recipe; the recipe keeps its own guard + marker. */
export function mergeUserSetup(username: string, sudo: boolean, publicKey: string, recipeBody: string): string {
  return [SHEBANG, ...userSetupCommands(username, sudo, publicKey), "", recipeBody, ""].join("\n")
}
