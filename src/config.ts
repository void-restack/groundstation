import { homedir } from "os"
import { join } from "path"

export interface Config {
  ansibleDir: string
  provisionPlaybook: string
  updatePlaybook: string
  bootstrapUser: string
  deployUser: string
  sshKey: string
  pollIntervalMs: number
}

const home = homedir()

export const config: Config = {
  ansibleDir: process.env.GND_ANSIBLE_DIR ?? join(home, "dotfiles", "ansible"),
  provisionPlaybook: "playbooks/provision-server.yml",
  updatePlaybook: "playbooks/update-all.yml",
  bootstrapUser: process.env.GND_BOOTSTRAP_USER ?? "void",
  deployUser: process.env.GND_DEPLOY_USER ?? "deploy",
  sshKey: process.env.GND_SSH_KEY ?? join(home, ".ssh", "deploy_osiris_01"),
  pollIntervalMs: Number(process.env.GND_POLL_MS ?? 15000),
}
