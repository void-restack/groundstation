# GROUNDSTATION 🛰️

Mission control for a small cloud fleet — a terminal command center over `gcloud` and Ansible.

Stop treating your servers as a log-scroll and start flying them from a console. Every VM is a
satellite, provisioning is a launch sequence, SSH is an uplink. A healthy fleet is an almost-still
screen — **motion is information**.

Built with [OpenTUI](https://github.com/sst/opentui) + React on [Bun](https://bun.sh).

## Features

- **The Board** — live fleet dashboard: breathing status lamps, flight-code callsigns
  (`us-central1-a` → `USC1·A`), per-vessel telemetry, and an event ticker.
- **Launch sequence** — provision a new server through a flight-plan form, a pre-flight manifest,
  and a live `T-minus` countdown that streams the real Ansible run task-by-task.
- **Orbit** — servers grouped by region, with a correlated-failure warning when too many share one.
- **Command palette** — `Ctrl-K` / `/` fuzzy command launcher.
- **QR handoff** — `Q` renders the selected server's SSH command as a QR to open from your phone.
- **Uplink** — `S` drops you into an SSH session and restores the console on exit.

## Requirements

- [Bun](https://bun.sh) ≥ 1.3
- `gcloud` authenticated (`gcloud auth login`, project set)
- An Ansible provisioning setup (defaults target `~/dotfiles/ansible`)

## Install

```bash
bun install
bun start          # or: bun run src/index.tsx
```

## Configuration

Environment variables (all optional):

| Var | Default | Purpose |
|-----|---------|---------|
| `GND_ANSIBLE_DIR` | `~/dotfiles/ansible` | Directory holding the playbooks + inventory |
| `GND_BOOTSTRAP_USER` | `void` | User for the first provision run of a fresh VM |
| `GND_DEPLOY_USER` | `deploy` | Steady-state login created by provisioning |
| `GND_SSH_KEY` | `~/.ssh/deploy_osiris_01` | Key used for uplink + provisioning |
| `GND_POLL_MS` | `15000` | Fleet refresh interval |

## Keybindings

| Key | Action |
|-----|--------|
| `↑`/`↓` `j`/`k` | Move selection |
| `P` | Provision a new vessel |
| `U` | Update all (constellation sweep) |
| `S` | Uplink (SSH into selected) |
| `O` | Orbit view |
| `Q` | QR handoff |
| `Ctrl-K` / `/` | Command palette |
| `Ctrl-C` | Quit |

## Architecture

```
src/
  adapters/   exec, gcloud, ansible, ssh   — shell-out layer (Bun.spawn)
  state/      stores (fleet, ui, launch, clock, ops) via useSyncExternalStore
  components/ presentational renderables
  screens/    Board, Launch, Orbit
  lib/        pure helpers (format, color, spark, status)
```

The UI is a thin React front-end over an adapter layer that drives the tools you already have:
`gcloud compute instances list` for the fleet, `ansible-playbook` for provisioning (streamed and
parsed into the countdown), and `ssh` for uplinks. No new infrastructure.

## Development

```bash
bun run typecheck
bun test
bun run compile     # → single-binary `gnd`
```

## Roadmap

- Live metrics (Beszel / Cloud Monitoring) → real CPU/mem sparklines
- 3D region globe (`@opentui/three`, WebGPU)
- Ambient audio cues for launch milestones
- Serve the dashboard over SSH (`@opentui/ssh`)
