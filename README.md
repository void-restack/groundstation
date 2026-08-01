# GROUNDSTATION 🛰️

**Mission control for a small cloud fleet — a terminal command center over `gcloud` and Ansible.**

Stop treating your servers as a log-scroll and start flying them from a console. Every VM is a
satellite, provisioning is a launch sequence, SSH is an uplink. A healthy fleet is an almost-still
screen — *motion is information*.

Built with [OpenTUI](https://github.com/sst/opentui) + React, on [Bun](https://bun.sh). Themed with
real [btop](https://github.com/aristocratos/btop) `.theme` files.

---

## Features

- **The Board** — a live dashboard with breathing status lamps, flight-code callsigns
  (`us-central1-a` → `USC1·A`), an overview strip of gradient braille meters, per-vessel telemetry,
  and a live event ticker.
- **Launch sequence** — provision a new server through a flight-plan form and a pre-flight manifest,
  then watch a `T-minus` countdown stream the real Ansible run task-by-task (create VM → wait for
  boot → provision), with soft audio cues at each milestone.
- **Orbit** — a rotating ASCII Earth with a day/night terminator and health-colored region markers,
  beside a region breakdown that warns when too much of the fleet shares one region.
- **Command palette** — `Ctrl-K` / `/` fuzzy launcher for every action.
- **Uplink** — `S` drops you into an SSH session and restores the console on exit.
- **Serve over SSH** — run the whole dashboard as an SSH server, reachable from any terminal.
- **btop theming** — reads btop `.theme` files, so the palette and meter gradients match your setup.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3
- Google Cloud SDK (`gcloud`), authenticated with a project set — this is all the **fleet viewer** needs
- *Optional:* an Ansible provisioning directory — only for the **Launch/provision** and **Update** features.
  Point `GND_ANSIBLE_DIR` (or the in-app setup) at a dir containing `playbooks/provision-server.yml`
  and `playbooks/update-all.yml`. Without it, those actions are shown disabled with a hint; everything
  else works.
- *Optional:* an SSH key — only for **Uplink** and the hardened probe. Unset, `ssh` uses your agent/config.

## Quick start

```bash
bun install
bun start              # launch the dashboard (no config needed — just a gcloud login)
bun run compile        # → a single self-contained binary: ./gnd
bun run install-local  # compile + copy gnd into ~/.local/bin (must be on your PATH)
```

## Keybindings

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | Move selection |
| `P` | Provision a new vessel |
| `U` | Update all — constellation sweep |
| `S` | Uplink (SSH into the selected vessel) |
| `O` | Orbit view |
| `M` | Mute / unmute sound cues |
| `Ctrl-K` / `/` | Command palette |
| `Q` / `Ctrl-C` | Quit |

## Theming

GROUNDSTATION derives its entire palette — including the meter gradients — from a btop theme, so it
matches whatever you already run in btop.

```bash
GND_BTOP_THEME=tokyo-night bun start          # from ~/.config/btop/themes/tokyo-night.theme
GND_THEME=/path/to/custom.theme bun start     # any btop .theme file
```

It ships with a built-in tokyo-night default, so no configuration is required.

## Serve over SSH

Run the dashboard as an SSH server and reach the full live console from any terminal:

```bash
bun run serve                 # listens on 127.0.0.1:2222, public-key auth
ssh -p 2222 127.0.0.1
```

Access is gated by an authorized-keys file (`GND_AUTHORIZED_KEYS`, default the standard
`~/.ssh/authorized_keys`); the host key is generated and persisted under `~/.config/groundstation/`.
If no keys are present, `serve` refuses to start rather than opening an unreachable port.

## Configuration

GROUNDSTATION runs with **zero configuration** — the fleet viewer only needs a `gcloud` login. Settings
are stored in `~/.config/groundstation/config.json` (honouring `XDG_CONFIG_HOME`) and every value is also
overridable by an environment variable, with precedence **env var > config file > auto-detected default**.
None of the defaults are personal or machine-specific.

| Variable | Config key | Default | Purpose |
|----------|-----------|---------|---------|
| `GND_ANSIBLE_DIR` | `ansibleDir` | *(unset → provisioning disabled)* | Directory holding the playbooks |
| `GND_PROVISION_PLAYBOOK` | `provisionPlaybook` | `playbooks/provision-server.yml` | Provision playbook (relative to the ansible dir) |
| `GND_UPDATE_PLAYBOOK` | `updatePlaybook` | `playbooks/update-all.yml` | Update-all playbook |
| `GND_BOOTSTRAP_USER` | `bootstrapUser` | *(current OS user)* | User for the first provision of a fresh VM |
| `GND_DEPLOY_USER` | `deployUser` | *(current OS user)* | Steady-state login used for uplink |
| `GND_SSH_KEY` | `sshKey` | *(unset → ssh agent/config)* | Key for uplink and the hardened probe |
| `GND_AUTHORIZED_KEYS` | `authorizedKeys` | `~/.ssh/authorized_keys` | Authorized keys for `serve` mode |
| `GND_POLL_MS` | `pollIntervalMs` | `15000` | Fleet refresh interval (ms) |
| `GND_PORT` | `port` | `2222` | Port for `serve` mode |
| `GND_BTOP_THEME` | – | – | Named theme under `~/.config/btop/themes/` |
| `GND_THEME` | – | – | Absolute path to a btop `.theme` file |

## How it works

The UI is a thin React front-end over an adapter layer that shells out to the tools you already have
— there is no new infrastructure to run:

| Concern | Source |
|---------|--------|
| Fleet inventory | `gcloud compute instances list --format=json` |
| Provisioning | `ansible-playbook`, streamed and parsed into the countdown |
| Uplink | `ssh` (the renderer suspends and resumes around it) |

## Architecture

```
src/
├── adapters/    exec, gcloud, ansible, ssh — the shell-out layer (Bun.spawn)
├── state/       stores (fleet, ui, launch, clock, ops) via useSyncExternalStore
├── components/  presentational renderables (Panel, Meter, GlobeAscii, …)
├── screens/     Board, Launch, Orbit
├── lib/         pure helpers (format, color, gradient, geo, earth, wav)
├── audio/       synthesized sound cues
├── theme.ts     btop .theme loader → palette + meter gradient
├── server.tsx   SSH server entry
└── index.tsx    entry point (local renderer or `serve`)
```

## Development

```bash
bun run typecheck
bun test
```

## Roadmap

- Live metrics (Beszel / Cloud Monitoring) → real CPU/mem meters per vessel
- Selectable inventories / multi-project support
- Structured audit log of provisioning runs

## License

MIT
