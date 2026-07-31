const GEO: Record<string, string> = {
  us: "US",
  europe: "EU",
  asia: "AS",
  australia: "AU",
  southamerica: "SA",
  northamerica: "NA",
  me: "ME",
  africa: "AF",
}

export function flightCode(zone: string): string {
  const parts = zone.split("-")
  if (parts.length < 3) return zone.toUpperCase()
  const [geo, locus, cell] = parts as [string, string, string]
  const geoCode = GEO[geo] ?? geo.slice(0, 2).toUpperCase()
  const locLetter = locus.charAt(0).toUpperCase()
  const locNum = locus.replace(/\D/g, "")
  return `${geoCode}${locLetter}${locNum}·${cell.toUpperCase()}`
}

export function regionOf(zone: string): string {
  const i = zone.lastIndexOf("-")
  return i === -1 ? zone : zone.slice(0, i)
}

export function elapsed(since: Date, now = Date.now()): string {
  const secs = Math.max(0, Math.floor((now - since.getTime()) / 1000))
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function duration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`
}

export function clockUTC(now = new Date()): string {
  return now.toISOString().slice(11, 19)
}

export function clockLocal(now = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
