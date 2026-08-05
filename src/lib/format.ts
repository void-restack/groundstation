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
