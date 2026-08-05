# GROUNDSTATION

[![CI](https://github.com/void-restack/groundstation/actions/workflows/ci.yml/badge.svg)](https://github.com/void-restack/groundstation/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/void-restack/groundstation?sort=semver)](https://github.com/void-restack/groundstation/releases/latest)
[![License](https://img.shields.io/github/license/void-restack/groundstation)](LICENSE)

A terminal dashboard for your Google Cloud fleet. View, create, provision, connect to, and manage
your instances without leaving the terminal.

It reads and controls everything through the official `gcloud` CLI, so there is no agent to install
and no new infrastructure to run. Built with [OpenTUI](https://github.com/sst/opentui) and React on
[Bun](https://bun.sh).

> [!NOTE]
> Works with Google Cloud today. AWS and Azure are on the [roadmap](#roadmap); the provider layer is
> already split to make room for them.

## Features

### See your fleet

- A live list of every instance with its status, name, zone, and machine type.
- A summary bar counting running and hardened instances, plus your busiest regions.
- A world map of where instances run, with a warning when too many share one region.
- A live feed of instances appearing, changing state, or going away.

### Create an instance

- One form for name, zone, machine type (or custom cores and memory), image, disk, firewall, and spot.
- A review step that shows the full plan before anything runs.
- Live `gcloud` output and a per-step log while it builds.

### Set it up on first boot

- Built-in recipes: docker, hardened, base tools, nginx, node, and postgres.
- Optionally create a login user with a chosen name, sudo rights, and one of your public keys authorized on the box.
- Or bring your own cloud-init file or shell script.
- The app waits and streams the setup output until it finishes.

### Manage an instance

- Start, stop, reset, suspend, resume, and delete, each with a confirm step and a note on billing.
- Delete asks you to type the name first.
- Describe shows every field. Serial console shows the boot log for debugging.

### Connect and navigate

- Open an SSH session into any instance.
- A command palette and fuzzy pickers for every action, zone, and machine type.
- Switch GCP projects and re-login to `gcloud` without leaving the app.

### Share it

- `gnd serve` publishes the dashboard over SSH for others to view.

## Install

### Homebrew

macOS (Apple Silicon) and Linux:

```bash
brew install void-restack/tap/groundstation
```

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
> The macOS binary is unsigned. Clear the quarantine flag once with `xattr -d com.apple.quarantine gnd`.

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
bun run compile    # build a single self-contained binary: ./gnd
```

## Requirements

- **Google Cloud SDK** (`gcloud`), logged in with a project set. This is all the dashboard needs.
- Optional: an **SSH key** for the hardened check. SSH sessions go through `gcloud compute ssh`, which manages its own keys. Otherwise `ssh` uses your agent or config.
- Optional: a **cloud-init file** or **shell script** if you want your own setup recipe instead of the built-in ones.

Anything missing is shown disabled with a hint, and everything else keeps working. Press `Ctrl-T`
in-app to check or install these tools.

## Usage

```bash
gnd            # open the dashboard
gnd serve      # serve the dashboard over SSH
gnd --help
```

First run walks you through the optional setup. Reopen it anytime with `,`.

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | Move selection |
| `Enter` / `a` | Actions for the selected instance |
| `P` | Create a new instance |
| `S` | SSH into the selected instance |
| `O` | Region map |
| `,` | Settings |
| `Ctrl-T` | Check or install dependencies |
| `M` | Mute or unmute sound cues |
| `Ctrl-K` / `/` | Command palette |
| `Q` / `Ctrl-C` | Quit |

## Configuration

Zero config to start. The dashboard only needs a `gcloud` login. Settings are stored in
`~/.config/groundstation/config.json` (honouring `XDG_CONFIG_HOME`). Every value is also an
environment override, with precedence of env var, then config file, then auto-detected default. None
of the defaults are personal or machine-specific.

<details>
<summary>Environment variables</summary>

| Variable | Config key | Default | Purpose |
|----------|-----------|---------|---------|
| `GND_CLOUD_INIT` | `cloudInitFile` | *(unset)* | Your cloud-init file, offered as a setup recipe |
| `GND_SHELL_SCRIPT` | `shellScript` | *(unset)* | Your shell script, offered as a setup recipe |
| `GND_DEPLOY_USER` | `deployUser` | *(current OS user)* | Login user for SSH sessions |
| `GND_SSH_KEY` | `sshKey` | *(unset, uses ssh agent/config)* | Key for the hardened check |
| `GND_AUTHORIZED_KEYS` | `authorizedKeys` | `~/.ssh/authorized_keys` | Authorized keys for `serve` mode |
| `GND_POLL_MS` | `pollIntervalMs` | `15000` | Fleet refresh interval (ms) |
| `GND_PORT` | `port` | `2222` | Port for `serve` mode |

</details>

### Serve over SSH

```bash
gnd serve            # listens on 127.0.0.1:2222, public-key auth
ssh -p 2222 127.0.0.1
```

Access is gated by an authorized-keys file (`GND_AUTHORIZED_KEYS`, default `~/.ssh/authorized_keys`).
The host key is generated under `~/.config/groundstation/`. With no keys present, `serve` refuses to
start rather than open an unreachable port.

## How it works

GROUNDSTATION is a thin React front end over a small adapter layer. It runs no services of its own
and calls the official Google Cloud CLI for everything.

| Task | Command |
|------|---------|
| List the fleet | `gcloud compute instances list --format=json` |
| Create and set up | `gcloud compute instances create` with a startup-script or cloud-init recipe, streamed live |
| SSH in | `gcloud compute ssh` (the renderer suspends and resumes around it) |

## Development

```bash
bun run typecheck
bun test
bun run compile
```

CI runs typecheck and tests on every push. Pushing a `vX.Y.Z` tag builds Linux, macOS, and Windows
binaries and publishes a GitHub Release.

## Roadmap

- **AWS, then Azure.** Create, manage, and SSH the same way you do on GCP. The provider layer is already in place; each needs its vendor CLI wired in and credentials to test.
- **Image in details.** Show an instance's OS image in its describe view, which is blank today.
- **Hardened-check fix.** Stop reporting "soft" on freshly-created instances.
- **Not planned: cost estimates.** The `gcloud` CLI does not expose prices, so any figure would be a guess.

## License

[MIT](LICENSE)
