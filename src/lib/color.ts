type RGB = [number, number, number]

function parseHex(hex: string): RGB {
  const h = hex.replace("#", "")
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

const toHex = ([r, g, b]: RGB): string =>
  "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("")

export function lerpHex(a: string, b: string, t: number): string {
  const ca = parseHex(a)
  const cb = parseHex(b)
  const k = Math.max(0, Math.min(1, t))
  return toHex([
    ca[0] + (cb[0] - ca[0]) * k,
    ca[1] + (cb[1] - ca[1]) * k,
    ca[2] + (cb[2] - ca[2]) * k,
  ])
}
