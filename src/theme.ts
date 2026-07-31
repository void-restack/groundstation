export const palette = {
  void: "#0B0F14",
  panel: "#121821",
  raised: "#1B2430",
  hairline: "#2A3644",
  downlink: "#5CE0C6",
  beacon: "#FF9E64",
  nominal: "#63D68A",
  caution: "#E7C547",
  flare: "#FF5D5D",
  static: "#6B7D8F",
  starlight: "#E6EDF3",
} as const

export const glyph = {
  lamp: "●",
  lampHollow: "○",
  stepPending: "◇",
  stepDone: "◆",
  spinner: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  sparkBars: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"],
  hardened: "⛨",
  sep: "·",
  arrowRight: "→",
  bullet: "•",
} as const

export const border = {
  resting: "rounded",
  focused: "double",
} as const
