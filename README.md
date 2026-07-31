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
- Google Cloud SDK (`gcloud`), authenticated with a project set
- An Ansible provisioning setup (defaults to `~/dotfiles/ansible`)

## Quick start

```bash
bun install
bun start          # launch the dashboard
bun run compile    # → a single self-contained binary: ./gnd
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

Access is gated by an authorized-keys file (`GND_AUTHORIZED_KEYS`, default
`~/.ssh/deploy_osiris_01.pub`); the host key is generated and persisted under
`~/.config/groundstation/`.

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `GND_ANSIBLE_DIR` | `~/dotfiles/ansible` | Directory holding the playbooks and inventory |
| `GND_BOOTSTRAP_USER` | `void` | User for the first provision of a fresh VM |
| `GND_DEPLOY_USER` | `deploy` | Steady-state login created by provisioning |
| `GND_SSH_KEY` | `~/.ssh/deploy_osiris_01` | Key used for uplink and provisioning |
| `GND_POLL_MS` | `15000` | Fleet refresh interval (ms) |
| `GND_BTOP_THEME` | – | Named theme under `~/.config/btop/themes/` |
| `GND_THEME` | – | Absolute path to a btop `.theme` file |
| `GND_AUTHORIZED_KEYS` | `~/.ssh/deploy_osiris_01.pub` | Authorized keys for `serve` mode |
| `GND_PORT` | `2222` | Port for `serve` mode |

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
