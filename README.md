# GROUNDSTATION

[![CI](https://github.com/void-restack/groundstation/actions/workflows/ci.yml/badge.svg)](https://github.com/void-restack/groundstation/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/void-restack/groundstation?sort=semver)](https://github.com/void-restack/groundstation/releases/latest)
[![License](https://img.shields.io/github/license/void-restack/groundstation)](LICENSE)

Mission control for a cloud fleet — a terminal command center over `gcloud` and Ansible.
Every VM is a satellite, provisioning is a launch sequence, SSH is an uplink; a healthy fleet is an
almost-still screen where motion is information.

Built with [OpenTUI](https://github.com/sst/opentui) and React on [Bun](https://bun.sh), themed from
real [btop](https://github.com/aristocratos/btop) `.theme` files.

> [!NOTE]
> Targets GCP + Ansible today. Multi-cloud and pluggable provisioning are on the [roadmap](#roadmap).

## Highlights

- **Board** — live fleet dashboard: breathing status lamps, flight-code callsigns (`us-central1-a` → `USC1·A`), gradient braille meters, per-vessel telemetry, and an event ticker.
- **Launch** — provision a new server through a fuzzy-picked flight plan and pre-flight manifest, then watch a `T-minus` countdown stream the real Ansible run task-by-task.
- **Orbit** — a world map with a day/night terminator and health-colored region markers, with a region-concentration warning.
- **Command palette** — `Ctrl-K` / `/` fuzzy launcher for every action.
- **Uplink & serve** — `S` drops into an SSH session; `serve` exposes the whole dashboard over SSH.

## Install

### Binary

Prebuilt binaries are attached to every [release](https://github.com/void-restack/groundstation/releases/latest).

```bash
# macOS (Apple Silicon)
curl -Lo gnd https://github.com/void-restack/groundstation/releases/latest/download/gnd-darwin-arm64

# Linux (x86-64)
curl -Lo gnd https://github.com/void-restack/groundstation/releases/latest/download/gnd-linux-x64

chmod +x gnd && sudo mv gnd /usr/local/bin/gnd
```

Windows: download `gnd-windows-x64.exe` from the [releases page](https://github.com/void-restack/groundstation/releases/latest).

> [!TIP]
> The macOS binary is unsigned — clear the quarantine flag once with `xattr -d com.apple.quarantine gnd`.

### Linux packages

Each release also ships native packages:

```bash
sudo dpkg  -i  groundstation_*_amd64.deb           # Debian / Ubuntu
sudo rpm   -i  groundstation-*.x86_64.rpm          # Fedora / RHEL
sudo pacman -U groundstation-*-x86_64.pkg.tar.zst  # Arch
```

### Nix

```bash
nix run github:void-restack/groundstation             # run without installing
nix profile install github:void-restack/groundstation
```

### From source

```bash
bun install
bun start          # run the dashboard
bun run compile    # → a single self-contained binary: ./gnd
```

## Requirements

- **Google Cloud SDK** (`gcloud`), authenticated with a project set — all the fleet viewer needs.
- *Optional:* an **Ansible** directory containing `playbooks/provision-server.yml` and `playbooks/update-all.yml`, to enable Launch and Update.
- *Optional:* an **SSH key** for uplink and the hardened probe — otherwise `ssh` uses your agent/config.

Anything missing is shown disabled with a hint; everything else keeps working. Press `Ctrl-T` in-app to check or install these tools.

## Usage

```bash
gnd            # launch the dashboard
gnd serve      # serve the dashboard over SSH
gnd --help
```

First run walks you through the optional setup; reopen it anytime with `,`.

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | Move selection |
| `P` | Provision a new vessel |
| `U` | Update all — constellation sweep |
| `S` | Uplink (SSH into the selected vessel) |
| `O` | Orbit view |
| `,` | Settings |
| `Ctrl-T` | Dependency doctor |
| `M` | Mute / unmute sound cues |
| `Ctrl-K` / `/` | Command palette |
| `Q` / `Ctrl-C` | Quit |

## Configuration

Zero config to start — the viewer only needs a `gcloud` login. Settings are stored in
`~/.config/groundstation/config.json` (honouring `XDG_CONFIG_HOME`), and every value is also an
environment override, with precedence **env var > config file > auto-detected default**. None of the
defaults are personal or machine-specific.

<details>
<summary>Environment variables</summary>

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

</details>

### Theming

The entire palette, including the meter gradients, is derived from a btop theme, so it matches
whatever you already run. It ships with a built-in `tokyo-night` default.

```bash
GND_BTOP_THEME=tokyo-night gnd      # from ~/.config/btop/themes/tokyo-night.theme
GND_THEME=/path/to/custom.theme gnd # any btop .theme file
```

### Serve over SSH

```bash
gnd serve            # listens on 127.0.0.1:2222, public-key auth
ssh -p 2222 127.0.0.1
```

Access is gated by an authorized-keys file (`GND_AUTHORIZED_KEYS`, default `~/.ssh/authorized_keys`);
the host key is generated under `~/.config/groundstation/`. With no keys present, `serve` refuses to
start rather than open an unreachable port.

## How it works

A thin React front-end over an adapter layer that shells out to tools you already have — no new
infrastructure to run.

| Concern | Source |
|---------|--------|
| Fleet inventory | `gcloud compute instances list --format=json` |
| Provisioning | `ansible-playbook`, streamed and parsed into the countdown |
| Uplink | `ssh` (the renderer suspends and resumes around it) |

## Development

```bash
bun run typecheck
bun test
bun run compile
```

CI runs typecheck and tests on every push; pushing a `vX.Y.Z` tag builds Linux/macOS/Windows binaries
and publishes a GitHub Release.

## Roadmap

- **Multi-cloud** — a provider abstraction (GCP today; AWS/Azure next) over each vendor CLI, so one fleet view spans clouds.
- **In-TUI cloud ops** — a per-vessel action menu (start/stop/reset/delete/describe), project and auth switching, serial console.
- **Pluggable provisioning** — bring your own (cloud-init / Ansible / shell); Ansible optional, never required.
- **Live metrics** — Beszel / Cloud Monitoring for real CPU and memory meters per vessel.

## License

[MIT](LICENSE)
