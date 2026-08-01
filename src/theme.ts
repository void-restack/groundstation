import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { lerpHex } from "./lib/color"

const TOKYO_NIGHT = `
theme[main_bg]="#1a1b26"
theme[main_fg]="#c0caf5"
theme[hi_fg]="#7dcfff"
theme[selected_bg]="#2f334d"
theme[inactive_fg]="#565f89"
theme[div_line]="#3b4261"
theme[cpu_start]="#9ece6a"
theme[cpu_mid]="#e0af68"
theme[cpu_end]="#f7768e"
`

type BtopTheme = Record<string, string>

function parseBtopTheme(text: string): BtopTheme {
  const out: BtopTheme = {}
  for (const line of text.split("\n")) {
    const m = /theme\[(\w+)\]\s*=\s*"?(#[0-9a-fA-F]{6})"?/.exec(line)
    if (m) out[m[1]!] = m[2]!
  }
  return out
}

function loadBtopTheme(): BtopTheme {
  const base = parseBtopTheme(TOKYO_NIGHT)
  const explicit = process.env.GND_THEME
  const named = process.env.GND_BTOP_THEME
  const candidates = [
    explicit,
    named && join(homedir(), ".config", "btop", "themes", `${named}.theme`),
  ].filter(Boolean) as string[]

  for (const path of candidates) {
    try {
      return { ...base, ...parseBtopTheme(readFileSync(path, "utf8")) }
    } catch {
      /* fall through to built-in */
    }
  }
  return base
}

const t = loadBtopTheme()
const pick = (key: string, fallback: string) => t[key] ?? fallback

const bg = pick("main_bg", "#1a1b26")
const cpuStart = pick("cpu_start", "#9ece6a")
const cpuMid = pick("cpu_mid", "#e0af68")
const cpuEnd = pick("cpu_end", "#f7768e")

export const palette = {
  void: bg,
  panel: lerpHex(bg, pick("selected_bg", "#2f334d"), 0.35),
  raised: pick("selected_bg", "#2f334d"),
  hairline: pick("div_line", "#3b4261"),
  downlink: pick("hi_fg", "#7dcfff"),
  beacon: cpuMid,
  nominal: cpuStart,
  caution: cpuMid,
  flare: cpuEnd,
  static: pick("inactive_fg", "#565f89"),
  starlight: pick("main_fg", "#c0caf5"),
} as const

export const meterGradient: readonly string[] = [cpuStart, cpuMid, cpuEnd]

export const glyph = {
  lamp: "●",
  lampHollow: "○",
  stepPending: "◇",
  stepDone: "◆",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  meterBlocks: ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"],
  meterEmpty: "⋅",
  hardened: "⛨",
  sep: "·",
  search: "⌕",
  vsep: "│",
  dotsep: "⋮",
  arrowRight: "→",
  bullet: "•",
} as const

export const border = {
  resting: "rounded",
  focused: "double",
} as const
