import { lerpHex } from "./color"

export function gradientAt(stops: readonly string[], t: number): string {
  const k = Math.max(0, Math.min(1, t))
  if (stops.length === 1) return stops[0]!
  const seg = k * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(seg))
  return lerpHex(stops[i]!, stops[i + 1]!, seg - i)
}

export const superscript = (n: number): string => {
  const map = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"]
  return String(n)
    .split("")
    .map((d) => map[Number(d)] ?? d)
    .join("")
}
